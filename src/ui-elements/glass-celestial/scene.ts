/**
 * The masthead's ornament, as a jelly of liquid glass that is a sun or a moon.
 *
 * The shader body is TypeGPU's liquid glass, by way of our own overlay.ts and
 * the tile scene — calculateWeights, applyTint and sampleWithChromaticAberration
 * are theirs. What differs is the shape it is measured against, and that is the
 * whole file.
 *
 * Their lens is a rounded box. This one is two shapes and a number between them:
 *
 *   sun   a disk smooth-unioned with eight rounded spokes. Smooth rather than a
 *         plain min, so the rays swell out of the body instead of being stuck
 *         onto it — the difference between a jelly and a decal.
 *   moon  the same disk with a second, offset disk smoothly subtracted. A
 *         crescent is a subtraction, which is why it belongs in an SDF and not
 *         in a path.
 *
 * `morph` mixes the two distance fields. That is not a geometrically exact
 * interpolation of the shapes — nothing about SDFs promises that — but the
 * intermediate is a continuous field, so the lens stays a lens the whole way and
 * the rays retract into the crescent rather than cross-fading through it. Driven
 * by a spring, the change overshoots and settles like everything else here.
 *
 * The `end` inflation and the ring are the same idea as the tiles: the visible
 * shape is the field plus `end`, and the band between `start` and `end` is where
 * the backdrop is displaced.
 */
import { sdDisk, sdRoundedBox2d, opSmoothUnion, opSmoothDifference } from '@typegpu/sdf';
import { tgpu, common, d, std, type TgpuRoot } from 'typegpu';

/** Spokes on the sun. Eight reads as a sun; more reads as a gear. */
export const RAY_COUNT = 8;

const Params = d.struct({
  // Shape, all in canvas heights
  radius: d.f32,
  rayInner: d.f32,
  rayLength: d.f32,
  rayThickness: d.f32,
  rayRound: d.f32,
  blendK: d.f32,
  moonOffset: d.f32,
  moonRadius: d.f32,
  morph: d.f32,
  squash: d.vec2f,

  // Lens, as on the tiles
  start: d.f32,
  end: d.f32,
  refractionStrength: d.f32,
  edgeCurve: d.f32,
  chromaticStrength: d.f32,
  chromaticFalloff: d.f32,
  bodyChromatic: d.f32,
  blur: d.f32,
  edgeBlurMultiplier: d.f32,
  edgeFeather: d.f32,
  tintStrength: d.f32,
  tintColor: d.vec3f,

  // Light and emission
  lightDir: d.vec3f,
  specularStrength: d.f32,
  specularPower: d.f32,
  specularColor: d.vec3f,
  glowStrength: d.f32,
  glowHalo: d.f32,
  glowColor: d.vec3f,
});

export type CelestialParams = {
  radius: number;
  rayInner: number;
  rayLength: number;
  rayThickness: number;
  rayRound: number;
  blendK: number;
  moonOffset: number;
  moonRadius: number;
  morph: number;
  squashX: number;
  squashY: number;
  start: number;
  end: number;
  refractionStrength: number;
  edgeCurve: number;
  chromaticStrength: number;
  chromaticFalloff: number;
  bodyChromatic: number;
  blur: number;
  edgeBlurMultiplier: number;
  edgeFeather: number;
  tintStrength: number;
  tintR: number;
  tintG: number;
  tintB: number;
  lightAzimuth: number;
  lightElevation: number;
  specularStrength: number;
  specularPower: number;
  specR: number;
  specG: number;
  specB: number;
  glowStrength: number;
  glowHalo: number;
  glowR: number;
  glowG: number;
  glowB: number;
};

const Weights = d.struct({
  inside: d.f32,
  ring: d.f32,
  outside: d.f32,
});

const TintParams = d.struct({
  color: d.vec3f,
  strength: d.f32,
});

export async function setupCelestial(
  root: TgpuRoot,
  context: GPUCanvasContext,
  backdropCanvas: HTMLCanvasElement,
  texSize = 512,
) {
  const backdropTexture = root
    .createTexture({
      size: [texSize, texSize, 1],
      format: 'rgba8unorm',
      mipLevelCount: 6,
    })
    .$usage('sampled', 'render');
  const view = backdropTexture.createView();

  const sampler = root.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  const shapeScaleUniform = root.createUniform(d.vec2f, d.vec2f(1, 1));
  const paramsUniform = root.createUniform(Params, {
    radius: 0.17,
    rayInner: 0.24,
    rayLength: 0.075,
    rayThickness: 0.032,
    rayRound: 0.03,
    blendK: 0.05,
    moonOffset: 0.14,
    moonRadius: 0.2,
    morph: 0,
    squash: d.vec2f(1, 1),
    start: 0,
    end: 0.05,
    refractionStrength: 0.2,
    edgeCurve: 1.1,
    chromaticStrength: 0.05,
    chromaticFalloff: 2,
    bodyChromatic: 0.008,
    blur: 0.4,
    edgeBlurMultiplier: 0.4,
    edgeFeather: 2,
    tintStrength: 0.2,
    tintColor: d.vec3f(1, 0.62, 0.18),
    lightDir: d.vec3f(0, -0.57, 0.82),
    specularStrength: 0.8,
    specularPower: 40,
    specularColor: d.vec3f(1, 1, 1),
    glowStrength: 0,
    glowHalo: 0.05,
    glowColor: d.vec3f(1, 0.6, 0.2),
  });

  // ── theirs, unchanged ───────────────────────────────────────────────────────
  const calculateWeights = (sdfDist: number, start: number, end: number, featherUV: number) => {
    'use gpu';
    const inside = 1 - std.smoothstep(start - featherUV, start + featherUV, sdfDist);
    const outside = std.smoothstep(end - featherUV, end + featherUV, sdfDist);
    const ring = std.max(0, 1 - inside - outside);
    return Weights({ inside, ring, outside });
  };

  const applyTint = (color: d.v3f, tint: d.Infer<typeof TintParams>) => {
    'use gpu';
    return std.mix(d.vec4f(color, 1), d.vec4f(tint.color, 1), tint.strength);
  };

  const sampleWithChromaticAberration = (
    tex: d.texture2d<d.F32>,
    samp: d.sampler,
    uv: d.v2f,
    offset: number,
    dir: d.v2f,
    level: number,
  ) => {
    'use gpu';
    const samples = d.arrayOf(d.vec3f, 3)();
    for (const i of tgpu.unroll(std.range(3))) {
      const channelOffset = dir * (d.f32(i) - 1) * offset;
      samples[i] = std.textureSampleLevel(tex, samp, uv - channelOffset, level).rgb;
    }
    return d.vec3f(samples[0].x, samples[1].y, samples[2].z);
  };
  // ── end theirs ──────────────────────────────────────────────────────────────

  /** A disk with eight spokes swelling out of it. */
  const sdSun = (p: d.v2f) => {
    'use gpu';
    const P = paramsUniform.$;
    let dist = sdDisk(p, P.radius);
    for (const i of tgpu.unroll(std.range(RAY_COUNT))) {
      // Rotate the sample rather than the spoke: one box, eight directions.
      const a = (d.f32(i) / RAY_COUNT) * 6.2831855;
      const c = std.cos(a);
      const s = std.sin(a);
      const q = d.vec2f(p.x * c - p.y * s, p.x * s + p.y * c);
      const ray = sdRoundedBox2d(
        d.vec2f(q.x - P.rayInner, q.y),
        d.vec2f(P.rayLength, P.rayThickness),
        P.rayRound,
      );
      dist = opSmoothUnion(dist, ray, P.blendK);
    }
    return dist;
  };

  /** The same disk with an offset one taken out of it. */
  const sdMoon = (p: d.v2f) => {
    'use gpu';
    const P = paramsUniform.$;
    const body = sdDisk(p, P.radius);
    const bite = sdDisk(d.vec2f(p.x - P.moonOffset, p.y), P.moonRadius);
    return opSmoothDifference(bite, body, P.blendK);
  };

  const fragmentShader = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    const P = paramsUniform.$;
    // Centred, isotropic, and squashed by the springs — the deformation happens
    // in the field, so the glass itself stretches rather than a picture of it.
    const centred = uv.sub(d.vec2f(0.5, 0.5)).mul(shapeScaleUniform.$);
    const p = d.vec2f(centred.x / P.squash.x, centred.y / P.squash.y);

    const sdfDist = std.mix(sdSun(p), sdMoon(p), P.morph);

    // Outward direction, from the field's own gradient rather than from a centre
    // — a crescent's inner edge does not point away from the middle, and using
    // the centre there would refract the wrong way along the whole inside curve.
    const e = 0.0015;
    const grad = d.vec2f(
      std.mix(sdSun(d.vec2f(p.x + e, p.y)), sdMoon(d.vec2f(p.x + e, p.y)), P.morph) -
        std.mix(sdSun(d.vec2f(p.x - e, p.y)), sdMoon(d.vec2f(p.x - e, p.y)), P.morph),
      std.mix(sdSun(d.vec2f(p.x, p.y + e)), sdMoon(d.vec2f(p.x, p.y + e)), P.morph) -
        std.mix(sdSun(d.vec2f(p.x, p.y - e)), sdMoon(d.vec2f(p.x, p.y - e)), P.morph),
    );
    const dir = grad.div(std.max(std.length(grad), 1e-6));

    const normalizedDist = (sdfDist - P.start) / (P.end - P.start);
    const texDim = std.textureDimensions(view.$, 0);
    const featherUV = P.edgeFeather / std.max(texDim.x, texDim.y);
    const weights = calculateWeights(sdfDist, P.start, P.end, featherUV);

    const edgeRamp = std.saturate(normalizedDist) ** P.edgeCurve;
    const ringUv = uv.add(dir.mul(P.refractionStrength * edgeRamp).div(shapeScaleUniform.$));
    const ringOffset =
      P.chromaticStrength * std.saturate(normalizedDist) ** P.chromaticFalloff;
    const bodyOffset =
      P.bodyChromatic * std.saturate(1 + sdfDist / std.max(P.radius, 1e-4));

    const bodyColor = sampleWithChromaticAberration(
      view.$, sampler.$, uv, bodyOffset, dir, P.blur,
    );
    const ringColor = sampleWithChromaticAberration(
      view.$, sampler.$, ringUv, ringOffset, dir, P.blur * P.edgeBlurMultiplier,
    );

    const tint = TintParams({ color: P.tintColor, strength: P.tintStrength });
    const tintedBody = applyTint(bodyColor, tint);
    const tintedRing = applyTint(ringColor, tint);

    const cover = std.saturate(weights.inside + weights.ring);
    const glass = tintedBody.rgb.mul(weights.inside).add(tintedRing.rgb.mul(weights.ring));

    // The bevel's normal, lit the way the tiles are
    const theta = edgeRamp * 1.5707964;
    const normal = d.vec3f(dir.x * std.sin(theta), dir.y * std.sin(theta), std.cos(theta));
    const halfVector = std.normalize(P.lightDir.add(d.vec3f(0, 0, 1)));
    const specular =
      std.saturate(std.dot(normal, halfVector)) ** std.max(P.specularPower, 1) *
      P.specularStrength * cover;

    // Hover and wobble energy, spilling past the shape as a halo
    const halo =
      std.exp(-std.max(sdfDist - P.end, 0) / std.max(P.glowHalo, 1e-5)) * P.glowStrength;

    return d.vec4f(
      glass.add(P.specularColor.mul(specular)).add(P.glowColor.mul(halo)),
      std.saturate(cover + halo),
    );
  });

  const pipeline = root.createRenderPipeline({
    vertex: common.fullScreenTriangle,
    fragment: fragmentShader,
  });

  let frameId = 0;
  let onFrame: (() => void) | null = null;

  function render() {
    frameId = requestAnimationFrame(render);
    try {
      onFrame?.();
      backdropTexture.write(backdropCanvas, { fit: 'stretch' });
      backdropTexture.generateMipmaps();
      pipeline.withColorAttachment({ view: context }).draw(3);
    } catch (e) {
      console.error('[GlassCelestial] render error:', e);
    }
  }
  frameId = requestAnimationFrame(render);

  return {
    set beforeFrame(fn: (() => void) | null) {
      onFrame = fn;
    },
    setShapeScale(w: number, h: number) {
      shapeScaleUniform.write(d.vec2f(h > 0 ? w / h : 1, 1));
    },
    setParams(p: CelestialParams) {
      paramsUniform.write({
        radius: p.radius,
        rayInner: p.rayInner,
        rayLength: p.rayLength,
        rayThickness: p.rayThickness,
        rayRound: p.rayRound,
        blendK: Math.max(p.blendK, 1e-4),
        moonOffset: p.moonOffset,
        moonRadius: p.moonRadius,
        morph: p.morph,
        squash: d.vec2f(Math.max(p.squashX, 0.05), Math.max(p.squashY, 0.05)),
        start: p.start,
        end: Math.max(p.end, 0.0005),
        refractionStrength: p.refractionStrength,
        edgeCurve: Math.max(p.edgeCurve, 0.05),
        chromaticStrength: p.chromaticStrength,
        chromaticFalloff: Math.max(p.chromaticFalloff, 0.05),
        bodyChromatic: p.bodyChromatic,
        blur: p.blur,
        edgeBlurMultiplier: p.edgeBlurMultiplier,
        edgeFeather: p.edgeFeather,
        tintStrength: p.tintStrength,
        tintColor: d.vec3f(p.tintR, p.tintG, p.tintB),
        lightDir: (() => {
          const a = (p.lightAzimuth * Math.PI) / 180;
          const e2 = (p.lightElevation * Math.PI) / 180;
          return d.vec3f(Math.cos(e2) * Math.cos(a), -Math.cos(e2) * Math.sin(a), Math.sin(e2));
        })(),
        specularStrength: p.specularStrength,
        specularPower: Math.max(p.specularPower, 1),
        specularColor: d.vec3f(p.specR / 255, p.specG / 255, p.specB / 255),
        glowStrength: p.glowStrength,
        glowHalo: Math.max(p.glowHalo, 1e-5),
        glowColor: d.vec3f(p.glowR / 255, p.glowG / 255, p.glowB / 255),
      });
    },
    onCleanup() {
      cancelAnimationFrame(frameId);
    },
  };
}
