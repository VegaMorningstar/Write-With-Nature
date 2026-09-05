/**
 * Twenty-six glass tiles on one canvas.
 *
 * The letters are not in here — they are DOM text inside real <button>
 * elements sitting on top, which keeps them crisp, selectable and clickable.
 * This draws only the glass and the glow behind them.
 *
 * The glass model is TypeGPU's liquid-glass: a rounded box measured by an SDF,
 * with the backdrop displaced outward across a ring between `start` and `end`
 * and merely blurred inside it. The difference is that the SDF is a union of 26
 * boxes rather than one, so each pixel finds its nearest tile first and then
 * runs the same treatment against it.
 *
 * Everything is measured in tile heights, so a value means the same thing
 * whatever size the grid ends up.
 */
import { sdRoundedBox2d } from '@typegpu/sdf';
import { tgpu, common, d, std, type TgpuRoot } from 'typegpu';
import { TILE_COUNT } from './constants.ts';

const Params = d.struct({
  radius: d.f32,
  start: d.f32,
  end: d.f32,
  refractionStrength: d.f32,
  chromaticStrength: d.f32,
  chromaticFalloff: d.f32,
  blur: d.f32,
  edgeBlurMultiplier: d.f32,
  edgeFeather: d.f32,
  tintStrength: d.f32,
  tintColor: d.vec3f,
  frostFill: d.f32,
  frostGrain: d.f32,
  glowStrength: d.f32,
  glowSpread: d.f32,
  glowEdge: d.f32,
  glowNear: d.vec3f,
  glowFar: d.vec3f,
  hoverGlow: d.f32,
  // Per-tile form: what makes each one read as its own object rather than a
  // window onto a shared surface.
  faceGradient: d.f32,
  bevel: d.f32,
  edgeDarken: d.f32,
  lightAngle: d.f32,
  gap: d.f32,
});

/**
 * Per-tile geometry and state, as two vec4 arrays rather than a struct array —
 * a uniform array of structs pads every element to 16 bytes anyway, and this
 * keeps the layout obvious.
 *
 *   rect  = centre.xy, half-extent.xy
 *   state = squashX, squashY, glow, pressed
 */
const Tiles = d.struct({
  rect: d.arrayOf(d.vec4f, TILE_COUNT),
  state: d.arrayOf(d.vec4f, TILE_COUNT),
});

export async function setupGlassAlphabet(
  root: TgpuRoot,
  context: GPUCanvasContext,
  backdropCanvas: HTMLCanvasElement,
) {
  // Fixed size, written with fit:'stretch'. Sampling is in uv, so the stretch
  // undoes itself, and the pipeline keeps one view for its lifetime.
  const TEX_SIZE = 1024;
  const backdropTexture = root
    .createTexture({
      size: [TEX_SIZE, TEX_SIZE, 1],
      format: 'rgba8unorm',
      mipLevelCount: 6,
    })
    .$usage('sampled', 'render');
  const sampledView = backdropTexture.createView();

  const sampler = root.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  const paramsUniform = root.createUniform(Params);
  const tilesUniform = root.createUniform(Tiles);
  // x = aspect, so the shape space is isotropic; y unused
  const shapeUniform = root.createUniform(d.vec2f, d.vec2f(1, 1));
  // Which slice of the viewport-sized backdrop sits behind this canvas
  const uvScaleUniform = root.createUniform(d.vec2f, d.vec2f(1, 1));
  const uvOffsetUniform = root.createUniform(d.vec2f, d.vec2f(0, 0));
  // Pointer in shape space, for the hover glow
  const pointerUniform = root.createUniform(d.vec2f, d.vec2f(-99, -99));

  const hash = (p: d.v2f) => {
    'use gpu';
    // Cheap value noise for the frost speckle — a texture would be one more
    // resource for something this small.
    return std.fract(std.sin(std.dot(p, d.vec2f(127.1, 311.7))) * 43758.5453);
  };

  const sampleChromatic = (
    uv: d.v2f,
    offset: number,
    dir: d.v2f,
    blur: number,
  ) => {
    'use gpu';
    const samples = d.arrayOf(d.vec3f, 3)();
    for (const i of tgpu.unroll(std.range(3))) {
      const channelOffset = dir * (d.f32(i) - 1) * offset;
      samples[i] = std.textureSampleBias(sampledView.$, sampler.$, uv - channelOffset, blur).rgb;
    }
    return d.vec3f(samples[0].x, samples[1].y, samples[2].z);
  };

  const fragmentShader = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    const p = paramsUniform.$;
    // Isotropic, in tile heights
    const pos = d.vec2f(uv.x * shapeUniform.$.x, uv.y);

    // Nearest tile. Twenty-six boxes is few enough to just test them all; a
    // grid lookup would be faster but would tie the shader to the layout.
    let nearest = d.f32(1e9);
    let nearestCentre = d.vec2f();
    let nearestHalf = d.vec2f(0.05, 0.05);
    let nearestGlow = d.f32(0);
    // Every distance below is a fraction of a tile's half-height, converted
    // through this. Shape space is normalised by the HOST height, and a tile is
    // only a small fraction of that, so treating the two as the same unit
    // collapses the boxes to nothing.
    let nearestScale = d.f32(0.05);

    for (let i = 0; i < TILE_COUNT; i++) {
      const rect = tilesUniform.$.rect[i];
      const state = tilesUniform.$.state[i];

      const centre = rect.xy;
      const tileH = std.max(rect.w, 0.004);

      // Squash scales the local coordinate, so a positive value widens the tile.
      // The box is inset by `end` and `gap` because the shader inflates it by
      // `end` to make the visible shape — without that the visible tile
      // overflows its button and meets its neighbours.
      const grown = d.vec2f(rect.z * (1 + state.x), rect.w * (1 + state.y));
      const inset = (p.end + p.gap) * tileH;
      const half = d.vec2f(
        std.max(grown.x - inset, 0.004),
        std.max(grown.y - inset, 0.004),
      );

      const dist = sdRoundedBox2d(
        pos.sub(centre),
        half,
        p.radius * std.min(half.x, half.y),
      );

      if (dist < nearest) {
        nearest = dist;
        nearestCentre = centre;
        nearestHalf = half;
        nearestGlow = state.z;
        nearestScale = tileH;
      }
    }

    // Their weights: inside the ring is frosted, the ring refracts, outside is
    // left alone — which for an overlay means left transparent.
    // Into shape-space distances
    const startD = p.start * nearestScale;
    const endD = p.end * nearestScale;
    const featherUV = p.edgeFeather * 0.004 * nearestScale;

    const inside = 1 - std.smoothstep(startD - featherUV, startD + featherUV, nearest);
    const outside = std.smoothstep(endD - featherUV, endD + featherUV, nearest);
    const ring = std.max(0, 1 - inside - outside);
    const cover = std.saturate(inside + ring);

    if (cover < 0.002) {
      return d.vec4f();
    }

    const normalizedDist = (nearest - startD) / std.max(endD - startD, 0.0001);
    const dir = std.normalize(pos.sub(nearestCentre) + d.vec2f(0.0001, 0.0001));

    const bgUv = uv.mul(uvScaleUniform.$).add(uvOffsetUniform.$);

    const blurred = std.textureSampleBias(sampledView.$, sampler.$, bgUv, p.blur).rgb;
    // Scaled by the tile too: these offsets are in backdrop uv, and an offset
    // sized for a whole panel would drag half the page through a 40px tile.
    const refracted = sampleChromatic(
      bgUv.add(dir.mul(p.refractionStrength * normalizedDist * nearestScale)),
      p.chromaticStrength * (std.saturate(normalizedDist) ** p.chromaticFalloff) * nearestScale,
      dir,
      p.blur * p.edgeBlurMultiplier,
    );

    let colour = std.mix(blurred, refracted, ring);

    // Frost: the white wash is what reads as frosted, and the speckle is the
    // roughness of the surface catching light.
    const speckle = (hash(std.floor(uv.mul(900))) - 0.5) * p.frostGrain * 0.35;
    colour = std.mix(colour, d.vec3f(1), p.frostFill).add(d.vec3f(speckle));

    colour = std.mix(colour, p.tintColor, p.tintStrength);

    // The glow field is sampled at the TILE'S CENTRE, not per pixel. Sampling
    // it per pixel gives one smooth wash flowing across the whole grid, which
    // is exactly what makes 26 tiles read as a single sheet. One colour per
    // tile is what makes each one an object.
    const gridCentre = d.vec2f(shapeUniform.$.x * 0.5, 0.5);
    const tileOffset = nearestCentre.sub(gridCentre);
    const field = std.exp(-std.dot(tileOffset, tileOffset) / std.max(p.glowSpread, 0.01));
    const glowColour = std.mix(p.glowFar, p.glowNear, field);

    // Position within this tile, -1..1 on each axis
    const local = pos.sub(nearestCentre).div(std.max(nearestHalf, d.vec2f(0.004)));
    const radial = std.saturate(std.length(local));

    // Each tile brighter through its middle and deeper at its rim — the soft
    // internal gradient that gives a cube its volume.
    const face = std.mix(1.0, 1 - radial * radial, p.faceGradient);

    // Bevel: the rim turns over, so it catches or loses the light by which way
    // it faces. This is the cue that separates neighbouring tiles from each
    // other even where their colours match.
    const theta = (p.lightAngle * 3.14159265) / 180;
    const lightDir = d.vec2f(std.cos(theta), std.sin(theta));
    const rim = std.smoothstep(-endD, 0, nearest);
    const facing = std.dot(std.normalize(local + d.vec2f(0.0001, 0.0001)), lightDir);
    const bevel = facing * rim * p.bevel;

    // Darkening into the rim, so tiles do not bleed into their neighbours
    const edgeShade = 1 - rim * p.edgeDarken;

    const pointerDist = std.length(pos.sub(pointerUniform.$));
    const pointerLift = std.exp(-pointerDist * pointerDist * 6) * p.hoverGlow;

    const glow = glowColour.mul(
      (field * p.glowStrength + nearestGlow + pointerLift) * face * (1 - rim * 0.35 * p.glowEdge),
    );

    const shaded = colour.mul(edgeShade).add(d.vec3f(bevel)).add(glow);

    return d.vec4f(shaded.mul(cover), cover);
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
      console.error('[GlassAlphabet] render error:', e);
    }
  }
  frameId = requestAnimationFrame(render);

  return {
    set beforeFrame(fn: (() => void) | null) {
      onFrame = fn;
    },
    setShapeScale(w: number, h: number) {
      shapeUniform.write(d.vec2f(h > 0 ? w / h : 1, 1));
    },
    setViewportRect(rect: { x: number; y: number; w: number; h: number }, vw: number, vh: number) {
      uvScaleUniform.write(d.vec2f(rect.w / vw, rect.h / vh));
      uvOffsetUniform.write(d.vec2f(rect.x / vw, rect.y / vh));
    },
    setPointer(x: number, y: number) {
      pointerUniform.write(d.vec2f(x, y));
    },
    /** rect = [cx, cy, hx, hy] per tile, in shape space. */
    setTileRects(rects: number[][]) {
      tilesUniform.writePartial({
        rect: rects.map((r, i) => ({ idx: i, value: d.vec4f(r[0], r[1], r[2], r[3]) })),
      });
    },
    /** state = [squashX, squashY, glow, pressed] per tile. */
    setTileStates(states: number[][]) {
      tilesUniform.writePartial({
        state: states.map((s, i) => ({ idx: i, value: d.vec4f(s[0], s[1], s[2], s[3]) })),
      });
    },
    setParams(o: Record<string, number>) {
      paramsUniform.write({
        radius: o.radius,
        start: o.start,
        end: o.end,
        refractionStrength: o.refractionStrength,
        chromaticStrength: o.chromaticStrength,
        chromaticFalloff: Math.max(o.chromaticFalloff, 0.05),
        blur: o.blur,
        edgeBlurMultiplier: o.edgeBlurMultiplier,
        edgeFeather: o.edgeFeather,
        tintStrength: o.tintStrength,
        tintColor: d.vec3f(o.tintR, o.tintG, o.tintB),
        frostFill: o.frostFill,
        frostGrain: o.frostGrain,
        glowStrength: o.glowStrength,
        glowSpread: o.glowSpread,
        glowEdge: o.glowEdge,
        glowNear: d.vec3f(o.glowR, o.glowG, o.glowB),
        glowFar: d.vec3f(o.glowFarR, o.glowFarG, o.glowFarB),
        hoverGlow: o.hoverGlow,
        faceGradient: o.faceGradient,
        bevel: o.bevel,
        edgeDarken: o.edgeDarken,
        lightAngle: o.lightAngle,
        gap: o.gap,
      });
    },
    onCleanup() {
      cancelAnimationFrame(frameId);
    },
  };
}
