import { tgpu, common, d, std, type TgpuRoot } from 'typegpu';
import * as sdf from '@typegpu/sdf';
import { randf } from '@typegpu/noise';

import { SwitchBehavior } from './switch.ts';
import { CameraController } from './camera.ts';
import {
  BoundingBox,
  DirectionalLight,
  JellyMaterial,
  Ray,
  sampleLayout,
} from './dataTypes.ts';
import { beerLambert, createTextures, fresnelSchlick, intersectBox } from './utils.ts';
import { TAAResolver } from './taa.ts';
import { createLabelTexture } from './label.ts';
import {
  AMBIENT_COLOR,
  AMBIENT_INTENSITY,
  AO_BIAS,
  AO_STEPS,
  FRAME_MARCH_LENGTH,
  FRAME_STEPS,
  JELLY_HALFSIZE,
  JELLY_SINK,
  LABEL_HALF_D,
  LABEL_HALF_W,
  LABEL_INK,
  LABEL_INK_DARK,
  MATERIAL_DEFAULTS,
  MAX_STEPS,
  SPECULAR_INTENSITY,
  SPECULAR_POWER,
  SURF_DIST,
} from './constants.ts';

export async function setupScene(
  root: TgpuRoot,
  context: GPUCanvasContext,
  options: { label?: string } = {},
) {
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const canvas = context.canvas as HTMLCanvasElement;

  const switchBehavior = new SwitchBehavior(root);

  // 2x supersample — TAA alone cannot resolve a hard alpha silhouette against a
  // transparent page, so the extra samples are what kill the jagged edge.
  let qualityScale = 2.0;
  let [width, height] = [canvas.width * qualityScale, canvas.height * qualityScale];

  let textures = createTextures(root, width, height);

  const filteringSampler = root.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
  });

  const labelSampler = root.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  const labelTexture = await createLabelTexture(root, options.label ?? 'RENDER');
  const labelView = labelTexture.createView();

  const camera = new CameraController(
    root,
    // ~39 degrees off vertical. Lower shows the cuboid better but bends the
    // refracted word further back, and LABEL_CENTER_Z has to follow it.
    d.vec3f(0, 1.32, 0.92),
    d.vec3f(0, 0.18, 0),
    d.vec3f(0, 1, 0),
    Math.PI / 4,
    width,
    height,
  );
  const cameraUniform = camera.cameraUniform;

  const lightUniform = root.createUniform(DirectionalLight, {
    direction: std.normalize(d.vec3f(0.19, -0.24, 0.75)),
    color: d.vec3f(1, 1, 1),
  });

  const jellyColorUniform = root.createUniform(d.vec4f, d.vec4f(1.0, 0.45, 0.075, 1.0));

  const darkModeUniform = root.createUniform(d.u32);

  const materialState = { ...MATERIAL_DEFAULTS };
  const materialUniform = root.createUniform(JellyMaterial, materialState);

  // Reseeded per frame; drives the stochastic blur, which the TAA resolves.
  const randomUniform = root.createUniform(d.vec2f);

  const getRay = (ndc: d.v2f) => {
    'use gpu';
    const clipPos = d.vec4f(ndc.x, ndc.y, -1.0, 1.0);

    const invView = cameraUniform.$.viewInv;
    const invProj = cameraUniform.$.projInv;

    const viewPos = invProj.mul(clipPos);
    const viewPosNormalized = d.vec4f(viewPos.xyz.div(viewPos.w), 1.0);

    const worldPos = invView.mul(viewPosNormalized);

    const rayOrigin = invView.columns[3].xyz;
    const rayDir = std.normalize(worldPos.xyz.sub(rayOrigin));

    return Ray({ origin: rayOrigin, direction: rayDir });
  };

  // Generous enough to hold the blob through a full wobble — it stretches on both
  // axes and rocks about z.
  const getJellyBounds = () => {
    'use gpu';
    return BoundingBox({
      min: d.vec3f(-1.4, -0.3, -0.8),
      max: d.vec3f(1.4, 1.2, 0.8),
    });
  };

  const opCheapBend = (p: d.v3f, k: number) => {
    'use gpu';
    const c = std.cos(k * p.x);
    const s = std.sin(k * p.x);
    const m = d.mat2x2f(c, -s, s, c);
    return d.vec3f(m.mul(p.xy), p.z);
  };

  const opRotateAxisAngle = (p: d.v3f, axis: d.v3f, angle: number) => {
    'use gpu';
    return std.add(
      std.mix(axis.mul(std.dot(p, axis)), p, std.cos(angle)),
      std.cross(p, axis).mul(std.sin(angle)),
    );
  };

  /**
   * The blob's own space: squash and rock undone, so it is an axis-aligned box
   * at +/-JELLY_HALFSIZE. The bend is applied on top of this rather than inside
   * it, because the bend is not an affine transform and the wireframe therefore
   * cannot follow it — they diverge as `bend` rises.
   */
  const jellyLocal = (position: d.v3f) => {
    'use gpu';
    const state = switchBehavior.stateUniform.$;
    const origin = d.vec3f(0, JELLY_HALFSIZE.y - JELLY_SINK, 0);

    // Scaling the *local coordinate* shrinks the shape, so a positive squash on x
    // widens the blob; the counter-scale on y flattens it at the same time, which
    // is what makes it read as displaced volume rather than a resize.
    const invScale = d.vec3f(
      1 - state.squashX,
      1 + state.squashX * 0.55,
      1 - state.squashZ,
    );

    return opRotateAxisAngle(
      position.sub(origin).mul(invScale),
      d.vec3f(0, 0, 1),
      state.wiggleX,
    );
  };

  const getJellyDist = (position: d.v3f) => {
    'use gpu';
    const round = materialUniform.$.round;
    return sdf.sdRoundedBox3d(
      opCheapBend(jellyLocal(position), materialUniform.$.bend),
      JELLY_HALFSIZE.sub(round),
      round,
    );
  };

  /**
   * Closest approach of the ray to the wireframe.
   *
   * This was fixed-step accumulation, which aliased badly: the step worked out
   * at four times the bar's half-width, so a ray could cross a bar entirely
   * between two samples and the lines came out stippled. Sphere-tracing sizes
   * each step by the distance to the frame, so the march slows down exactly
   * where it matters and the result varies smoothly between neighbouring pixels.
   */
  const wireframeAccum = (worldOrigin: d.v3f, worldDirection: d.v3f) => {
    'use gpu';
    const m = materialUniform.$;

    // jellyLocal is affine, so transforming two points on the ray and taking the
    // difference carries the ray into the blob's space, squash and rock included.
    const origin = jellyLocal(worldOrigin);
    const direction = std.normalize(
      jellyLocal(worldOrigin.add(worldDirection)).sub(origin),
    );

    let travelled = d.f32(0);
    let previous = d.f32(1e9);
    let closest = d.f32(1e9);

    for (let i = 0; i < FRAME_STEPS; i++) {
      const dist = sdf.sdBoxFrame3d(
        origin.add(direction.mul(travelled)),
        JELLY_HALFSIZE,
        m.frameWidth,
      );

      // A march only samples the field at discrete points and can step straight
      // past the true closest approach. This estimates where that approach fell
      // between the last two samples, which is what keeps the line smooth rather
      // than banded. With `previous` seeded huge, the first pass returns `dist`.
      const y = (dist * dist) / (2 * std.max(previous, 0.0001));
      const estimate = std.sqrt(std.max(dist * dist - y * y, 0));
      closest = std.min(closest, estimate);
      previous = dist;

      if (travelled > FRAME_MARCH_LENGTH) {
        break;
      }
      // abs, so the march keeps moving while it is inside a bar
      travelled += std.max(std.abs(dist), 0.004);
    }

    const soft = std.max(m.frameWidth * m.frameSoftness, 0.001);
    return std.saturate(
      (1 - std.smoothstep(0, soft, std.max(closest, 0))) * m.frameGain,
    );
  };

  const getNormal = (position: d.v3f) => {
    'use gpu';
    const e = d.f32(0.0008);
    const dist = getJellyDist(position);
    return std.normalize(
      d.vec3f(
        getJellyDist(std.add(position, d.vec3f(e, 0, 0))) - dist,
        getJellyDist(std.add(position, d.vec3f(0, e, 0))) - dist,
        getJellyDist(std.add(position, d.vec3f(0, 0, e))) - dist,
      ),
    );
  };

  const labelUV = (position: d.v3f) => {
    'use gpu';
    return d.vec2f(
      position.x / (LABEL_HALF_W * 2) + 0.5,
      (position.z - materialUniform.$.labelCenterZ) / (LABEL_HALF_D * 2) + 0.5,
    );
  };

  /** Coverage of the word at this point on the plane. */
  const sampleLabel = (uv: d.v2f, lod: number) => {
    'use gpu';
    if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1) {
      return d.f32(0);
    }
    return std.textureSampleLevel(labelView.$, labelSampler.$, uv, lod).w;
  };

  const inkColor = () => {
    'use gpu';
    return std.select(LABEL_INK, LABEL_INK_DARK, darkModeUniform.$ === 1);
  };

  const sqLength = (a: d.v3f) => {
    'use gpu';
    return std.dot(a, a);
  };

  // Marched against the jelly, so the plane darkens where the blob sits above it.
  // Seen through the refraction this gradient is what reads as the blob's interior.
  const calculateAO = (position: d.v3f, normal: d.v3f) => {
    'use gpu';
    const radius = std.max(materialUniform.$.aoRadius, 0.001);
    const intensity = materialUniform.$.aoIntensity;

    let totalOcclusion = d.f32(0.0);
    let sampleWeight = d.f32(1.0);
    const stepDistance = radius / AO_STEPS;

    for (let i = 1; i <= AO_STEPS; i++) {
      const sampleHeight = stepDistance * d.f32(i);
      const samplePosition = position.add(normal.mul(sampleHeight));
      const distanceToSurface = getJellyDist(samplePosition) - AO_BIAS;
      totalOcclusion += std.max(0.0, sampleHeight - distanceToSurface) * sampleWeight;
      sampleWeight *= 0.5;
    }

    return std.saturate(1.0 - (intensity * totalOcclusion) / radius);
  };

  const surfaceLighting = (hitPosition: d.v3f, normal: d.v3f, rayOrigin: d.v3f) => {
    'use gpu';
    const lightDir = std.neg(lightUniform.$.direction);
    const diffuse = std.max(std.dot(normal, lightDir), 0.0);

    const viewDir = std.normalize(rayOrigin.sub(hitPosition));
    const reflectDir = std.reflect(std.neg(lightDir), normal);
    const specularFactor = std.max(std.dot(viewDir, reflectDir), 0) ** SPECULAR_POWER;
    const specular = lightUniform.$.color.mul(specularFactor * SPECULAR_INTENSITY);

    const baseColor = d.vec3f(0.9);

    return std.saturate(
      baseColor
        .mul(lightUniform.$.color)
        .mul(diffuse)
        .add(baseColor.mul(AMBIENT_COLOR).mul(AMBIENT_INTENSITY))
        .add(specular),
    );
  };

  /** The fully lit plane, with the word as an albedo tint on it. */
  const litPlane = (rayOrigin: d.v3f, p: d.v3f, lod: number) => {
    'use gpu';
    const normal = d.vec3f(0, 1, 0);
    const state = switchBehavior.stateUniform.$;

    const lit = surfaceLighting(p, normal, rayOrigin);
    // Floored: full occlusion under the blob leaves nothing for the ink to
    // contrast against, and the word disappears into black. Lowering the floor
    // is what strengthens the soft inset edge seen through the glass.
    const ao = std.max(calculateAO(p, normal), materialUniform.$.aoFloor);
    const bounce = jellyColorUniform.$.rgb.mul(
      (1 / (sqLength(p) * 12 + 1)) * 0.35 * (0.8 + state.glow),
    );

    const ground = lit.mul(ao).add(bounce);
    const ink = sampleLabel(labelUV(p), lod);

    return std.mix(ground, ground.mul(inkColor()), ink);
  };

  /** Soft contact shadow on the label plane, breathing with the squash. */
  const shadowAt = (xz: d.v2f) => {
    'use gpu';
    const state = switchBehavior.stateUniform.$;
    const spread = 1 + state.squashX * 0.6;
    const half = d.vec2f(JELLY_HALFSIZE.x * 0.82 * spread, JELLY_HALFSIZE.z * 0.7 * spread);

    // Rounded-box falloff rather than a radial one, so it follows a slab
    const q = std.abs(xz.sub(d.vec2f(0.015, 0.045))).sub(half);
    const dist = std.length(std.max(q, d.vec2f(0))) + std.min(std.max(q.x, q.y), 0);

    return (1 - std.smoothstep(-0.03, 0.18, dist)) * materialUniform.$.shadowStrength;
  };

  // Deliberately banded rather than a smooth ramp: dispersion is only visible where
  // the environment has an edge to split, so the horizon gives the refracted
  // channels something to fringe against beyond the word itself.
  const envColor = (direction: d.v3f) => {
    'use gpu';
    const t = std.saturate(direction.y * 0.5 + 0.5);
    // Neutral, very slightly warm. The old bands leaned blue, and since this is
    // what the blob refracts, that blue was the cast showing up in the glass.
    const sky = d.vec3f(1.0, 1.0, 0.99);
    const horizon = d.vec3f(0.82, 0.82, 0.8);
    const ground = d.vec3f(0.52, 0.52, 0.5);
    const upper = std.mix(horizon, sky, std.smoothstep(0.5, 0.86, t));
    return std.mix(ground, upper, std.smoothstep(0.36, 0.5, t));
  };

  /** What a ray leaving the blob's underside lands on — the word, or the surround. */
  const refractedSample = (origin: d.v3f, direction: d.v3f) => {
    'use gpu';
    const sky = envColor(direction);
    if (direction.y > -0.0001) {
      return sky;
    }
    const t = (0 - origin.y) / direction.y;
    if (t <= 0 || t > 4) {
      return sky;
    }
    const p = origin.add(direction.mul(t));
    // Fade the lit plane out with distance so the blob's edges do not look like
    // they are refracting an infinite white plate.
    const fade = 1 - std.smoothstep(1.2, 2.4, std.length(p.xz));
    // Blur also biases the mip level, so a single frame already reads as frosted
    // rather than purely noisy while the TAA converges.
    const lod = 0.5 + materialUniform.$.blur * 8;
    return std.mix(sky, litPlane(origin, p, lod), fade);
  };

  const refractDirection = (I: d.v3f, N: d.v3f, cosi: number, ior: number) => {
    'use gpu';
    const eta = 1.0 / ior;
    const k = 1.0 - eta * eta * (1.0 - cosi * cosi);
    if (k <= 0.0) {
      return d.vec3f(); // total internal reflection
    }
    return std.normalize(std.add(I.mul(eta), N.mul(eta * cosi - std.sqrt(k))));
  };

  const refractedEnv = (
    I: d.v3f,
    N: d.v3f,
    cosi: number,
    hitPosition: d.v3f,
    ior: number,
  ) => {
    'use gpu';
    const direction = refractDirection(I, N, cosi, ior);
    if (std.dot(direction, direction) < 0.5) {
      return d.vec3f();
    }
    // Frosting: scatter the refracted ray a little. Each frame samples a
    // different direction and the TAA averages them into a genuine blur, which
    // is cheaper than taking many samples per frame.
    const scattered = std.normalize(
      direction.add(randf.inUnitSphere().mul(materialUniform.$.blur * 0.4)),
    );
    return refractedSample(hitPosition.add(scattered.mul(SURF_DIST * 4.0)), scattered);
  };

  /** The word and its shadow, for rays that never reach the blob. */
  const renderSurface = (rayOrigin: d.v3f, rayDirection: d.v3f) => {
    'use gpu';
    if (rayDirection.y > -0.0001) {
      return d.vec4f();
    }
    const t = (0 - rayOrigin.y) / rayDirection.y;
    if (t <= 0) {
      return d.vec4f();
    }

    const p = rayOrigin.add(rayDirection.mul(t));
    // Crude distance-based LOD: the plane recedes from the camera, and without it
    // the letter edges shimmer along the back of the word.
    const lod = std.clamp((t - 1.1) * 1.5, 0, 4);
    const ink = sampleLabel(labelUV(p), lod);

    const normal = d.vec3f(0, 1, 0);
    const lit = surfaceLighting(p, normal, rayOrigin);
    // AO gives the tight contact shading; shadowAt gives the broader cast pool
    const contact = (1 - calculateAO(p, normal)) * materialUniform.$.shadowStrength;
    const shadow = std.saturate(std.max(contact, shadowAt(p.xz)));

    // Outside the blob the plane itself stays transparent so the page shows
    // through — only the ink and the shadow are painted.
    const outAlpha = std.saturate(ink + (1 - ink) * shadow);
    // The shadow contributes black, so only the ink carries colour into the sum
    const premultiplied = inkColor().mul(lit).mul(1 - shadow * 0.4).mul(ink);

    return d.vec4f(premultiplied.div(std.max(outAlpha, 0.0001)), outAlpha);
  };

  const rayMarch = (rayOrigin: d.v3f, rayDirection: d.v3f) => {
    'use gpu';
    const intersection = intersectBox(rayOrigin, rayDirection, getJellyBounds());

    if (!intersection.hit) {
      return renderSurface(rayOrigin, rayDirection);
    }

    let distanceFromOrigin = std.max(d.f32(0.0), intersection.tMin);

    for (let i = 0; i < MAX_STEPS; i++) {
      const currentPosition = rayOrigin.add(rayDirection.mul(distanceFromOrigin));
      const dist = getJellyDist(currentPosition);
      distanceFromOrigin += dist;

      if (dist < SURF_DIST) {
        const hitPosition = rayOrigin.add(rayDirection.mul(distanceFromOrigin));
        const state = switchBehavior.stateUniform.$;

        const m = materialUniform.$;

        const N = getNormal(hitPosition);
        const I = rayDirection;
        const cosi = std.min(1.0, std.max(0.0, std.dot(std.neg(I), N)));
        const F = fresnelSchlick(cosi, d.f32(1.0), m.ior);

        const reflection = std.saturate(d.vec3f(hitPosition.y * 1.6 + 0.25));

        const refrDir = refractDirection(I, N, cosi, m.ior);
        let refractedColor = d.vec3f();

        if (std.dot(refrDir, refrDir) > 0.5) {
          // Chromatic aberration: march the surround once per channel at its own
          // refractive index and keep R from the red march, G from green, B from blue.
          const envR = refractedEnv(I, N, cosi, hitPosition, m.ior - m.dispersion);
          const envG = refractedEnv(I, N, cosi, hitPosition, m.ior);
          const envB = refractedEnv(I, N, cosi, hitPosition, m.ior + m.dispersion);
          const env = d.vec3f(envR.x, envG.y, envB.z);

          const jellyColor = jellyColorUniform.$;
          const scatterTint = jellyColor.rgb.mul(1.5);
          const absorb = d.vec3f(1.0).sub(jellyColor.rgb).mul(m.absorbDensity);

          // Deeper parts of the blob absorb more, giving the vertical colour ramp
          const depth =
            std.saturate(
              std.mix(1, 0.6, hitPosition.y * (1 / (JELLY_HALFSIZE.y * 2)) + 0.25),
            ) * m.tint;

          const T = beerLambert(absorb.mul(depth ** 2), 0.08);

          const lightDir = std.neg(lightUniform.$.direction);
          const forward = std.max(0.0, std.dot(lightDir, refrDir));
          const scatter = scatterTint.mul(m.scatter * forward * depth ** 3);

          refractedColor = env.mul(T).add(scatter);
        }

        // Wobble energy lights the blob from within, so the click reads as landing
        const emission = jellyColorUniform.$.rgb.mul(state.glow * m.glowGain);

        // Blinn-Phong highlight. Refraction alone gives the top face almost no
        // gradient, which is most of why a wide shape reads as flat glass.
        const toLight = std.neg(lightUniform.$.direction);
        const halfVector = std.normalize(toLight.sub(rayDirection));
        const specular = std.max(0.0, std.dot(N, halfVector)) ** 42 * m.specular;

        const body = std
          .add(reflection.mul(F), refractedColor.mul(1 - F))
          .add(emission)
          .add(d.vec3f(specular));

        // Nearly clear looking straight through, opaque at grazing angles where
        // Fresnel takes over. Everything it does not cover is left to the page.
        const bodyAlpha = std.saturate(m.baseAlpha + F * m.fresnelAlpha + state.glow * 0.15);

        // Trace the frame along the refracted ray so the box structure bends
        // through the glass exactly the way the word underneath does. On total
        // internal reflection there is no refracted ray, so fall back to the
        // view ray rather than collapsing every sample onto the hit point.
        const traceDir = std.select(rayDirection, refrDir, std.dot(refrDir, refrDir) > 0.5);
        const line = wireframeAccum(hitPosition, traceDir);

        const litBody = std.tanh(body.mul(m.exposure));

        // Lines go into alpha as well as colour, so they stay solid where the
        // body itself is see-through.
        return d.vec4f(
          std.mix(litBody, d.vec3f(m.frameBrightness), line),
          std.saturate(bodyAlpha + line),
        );
      }

      if (distanceFromOrigin > intersection.tMax) {
        break;
      }
    }

    return renderSurface(rayOrigin, rayDirection);
  };

  const raymarchFn = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    randf.seed2(randomUniform.$.mul(uv));

    const ndc = d.vec2f(uv.x * 2 - 1, -(uv.y * 2 - 1));
    const ray = getRay(ndc);
    const color = rayMarch(ray.origin, ray.direction);

    // Canvas is configured alphaMode:'premultiplied'
    return d.vec4f(color.rgb.mul(color.a), color.a);
  });

  const fragmentMain = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })((input) => {
    return std.textureSample(sampleLayout.$.currentTexture, filteringSampler.$, input.uv);
  });

  const rayMarchPipeline = root.createRenderPipeline({
    vertex: common.fullScreenTriangle,
    fragment: raymarchFn,
    targets: { format: 'rgba8unorm' },
  });

  const renderPipeline = root.createRenderPipeline({
    vertex: common.fullScreenTriangle,
    fragment: fragmentMain,
    targets: { format: presentationFormat },
  });

  let lastTimestamp: number | null = null;
  let frameCount = 0;
  const taaResolver = new TAAResolver(root, width, height);

  function createRenderBindGroups() {
    return [0, 1].map((frame) =>
      root.createBindGroup(sampleLayout, {
        currentTexture: taaResolver.getResolvedTexture(frame),
      }),
    );
  }

  let renderBindGroups = createRenderBindGroups();

  let animationFrameHandle: number;

  function render(timestamp: number) {
    try {
      frameCount++;
      camera.jitter();
      const deltaTime = Math.min(
        lastTimestamp !== null ? (timestamp - lastTimestamp) * 0.001 : 0,
        0.1,
      );
      lastTimestamp = timestamp;

      randomUniform.write(d.vec2f((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2));

      switchBehavior.update(deltaTime);

      const currentFrame = frameCount % 2;

      rayMarchPipeline
        .withColorAttachment({
          view: textures[currentFrame].sampled,
          loadOp: 'clear',
          storeOp: 'store',
        })
        .draw(3);

      taaResolver.resolve(textures[currentFrame].sampled, frameCount, currentFrame);

      renderPipeline
        .withColorAttachment({ view: context })
        .with(renderBindGroups[currentFrame])
        .draw(3);
    } catch (e) {
      console.error('[JellySwitch] render error:', e);
    }

    animationFrameHandle = requestAnimationFrame(render);
  }

  function handleResize() {
    [width, height] = [canvas.width * qualityScale, canvas.height * qualityScale];
    camera.updateProjection(Math.PI / 4, width, height);
    textures = createTextures(root, width, height);
    taaResolver.resize(width, height);
    frameCount = 0;
    renderBindGroups = createRenderBindGroups();
  }

  const resizeObserver = new ResizeObserver(() => {
    handleResize();
  });
  resizeObserver.observe(canvas);

  animationFrameHandle = requestAnimationFrame(render);

  return {
    switchBehavior,
    set jellyColor(v: d.v4f) {
      jellyColorUniform.write(v);
    },
    set darkMode(v: boolean) {
      darkModeUniform.write(d.u32(v ? 1 : 0));
    },
    /** Partial material override; merged over whatever is already set. */
    set material(v: Partial<typeof MATERIAL_DEFAULTS>) {
      Object.assign(materialState, v);
      materialUniform.write(materialState);
    },
    set qualityScale(v: number) {
      qualityScale = v;
      handleResize();
    },
    onCleanup() {
      cancelAnimationFrame(animationFrameHandle);
      resizeObserver.disconnect();
    },
  };
}
