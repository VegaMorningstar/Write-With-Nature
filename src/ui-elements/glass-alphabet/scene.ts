/**
 * TypeGPU's liquid glass, twenty-six times over.
 *
 * The shader body is theirs, by way of our own overlay.ts — calculateWeights,
 * applyTint, sampleWithChromaticAberration and the sampling in the fragment
 * function are unchanged from
 * TypeGPU/apps/typegpu-docs/src/examples/simple/liquid-glass/index.ts.
 *
 * One thing is different, and it is the whole point of this file: their SDF is a
 * single rounded box, ours is the union of twenty-six of them. A union of SDFs
 * is their minimum, so one loop over a uniform array gives every tile the same
 * lens in one draw call — 26 canvases, or 26 passes, would each carry their own
 * backdrop upload and their own pipeline for no visual gain.
 *
 * The loop also has to carry `dir` alongside the distance. Theirs is derived
 * from the position within the box, and with a union the fragment has to use the
 * direction belonging to whichever tile actually won, or the refraction points
 * the wrong way everywhere except the nearest tile.
 *
 * Everything reaching setTiles and setParams is in box space: canvas heights,
 * with x scaled by the aspect so corners come out circular. GlassAlphabet.jsx
 * converts from pixels, which is the only sane unit to tune a 30px tile in.
 */
import { sdRoundedBox2d } from '@typegpu/sdf';
import { tgpu, common, d, std, type TgpuRoot } from 'typegpu';

export const TILE_COUNT = 26;

const Params = d.struct({
  radius: d.f32,
  start: d.f32,
  end: d.f32,
  chromaticStrength: d.f32,
  refractionStrength: d.f32,
  blur: d.f32,
  edgeFeather: d.f32,
  edgeBlurMultiplier: d.f32,
  tintStrength: d.f32,
  tintColor: d.vec3f,
  chromaticFalloff: d.f32,
});

export type SceneParams = {
  radius: number;
  start: number;
  end: number;
  chromaticStrength: number;
  refractionStrength: number;
  blur: number;
  edgeFeather: number;
  edgeBlurMultiplier: number;
  tintStrength: number;
  tintR: number;
  tintG: number;
  tintB: number;
  chromaticFalloff: number;
};

/** xy = centre in box space, zw = half-extents in box space. */
const Tiles = d.arrayOf(d.vec4f, TILE_COUNT);

const Weights = d.struct({
  inside: d.f32,
  ring: d.f32,
  outside: d.f32,
});

const TintParams = d.struct({
  color: d.vec3f,
  strength: d.f32,
});

export async function setupAlphabet(
  root: TgpuRoot,
  context: GPUCanvasContext,
  backdropCanvas: HTMLCanvasElement,
) {
  // Fixed size, written with fit: 'stretch'. Recreating it on resize would leave
  // the compiled pipeline holding a view of a destroyed texture — the shader
  // captures the view when it is built, not on every frame. Sampling is in uv
  // space, so
  // the stretch undoes itself.
  //
  // The backdrop here covers only the grid's own rectangle rather than the whole
  // viewport, so 1024 across a few hundred CSS pixels is genuinely oversampled —
  // which matters, because the letters live in this texture and are read through
  // a lens.
  const TEX_SIZE = 1024;
  const backdropTexture = root
    .createTexture({
      size: [TEX_SIZE, TEX_SIZE, 1],
      // 6 levels, because textureSampleBias needs a mip chain for the blur
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

  const shapeScaleUniform = root.createUniform(d.vec2f, d.vec2f(1, 1));

  const tilesUniform = root.createUniform(
    Tiles,
    Array.from({ length: TILE_COUNT }, () => d.vec4f(0.5, 0.5, 0.02, 0.02)),
  );

  const paramsUniform = root.createUniform(Params, {
    radius: 0.02,
    start: 0,
    end: 0.03,
    chromaticStrength: 0.006,
    refractionStrength: 0.02,
    blur: 1.2,
    edgeFeather: 2,
    edgeBlurMultiplier: 0.7,
    tintStrength: 0.05,
    tintColor: d.vec3f(0.58, 0.44, 0.96),
    chromaticFalloff: 1,
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
    blur: number,
  ) => {
    'use gpu';
    const samples = d.arrayOf(d.vec3f, 3)();
    for (const i of tgpu.unroll(std.range(3))) {
      const channelOffset = dir * (d.f32(i) - 1) * offset;
      samples[i] = std.textureSampleBias(tex, samp, uv - channelOffset, blur).rgb;
    }
    return d.vec3f(samples[0].x, samples[1].y, samples[2].z);
  };
  // ── end theirs ──────────────────────────────────────────────────────────────

  const fragmentShader = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    // Box space: canvas heights, x widened by the aspect so the space is
    // isotropic and a square tile is square.
    const p = uv.mul(shapeScaleUniform.$);

    // Union of the tiles. Track the winning tile's direction as well as its
    // distance — with one box theirs is the only direction there is, but here
    // every tile refracts outward from its own centre.
    let sdfDist = d.f32(1e6);
    let dir = d.vec2f(0, 1);

    for (const i of std.range(TILE_COUNT)) {
      const tile = tilesUniform.$[i];
      const half = d.vec2f(tile.z, tile.w);
      const rel = p.sub(d.vec2f(tile.x, tile.y));
      const dist = sdRoundedBox2d(rel, half, paramsUniform.$.radius);

      // Theirs, per tile. Guarded against the exact centre, where the vector is
      // zero and normalize returns NaN — the weights discard that pixel, but a
      // NaN survives multiplication by zero and would punch a hole in it.
      const raw = rel.mul(d.vec2f(half.y, half.x));
      const dirI = raw.div(std.max(std.length(raw), 1e-6));

      const closer = dist < sdfDist;
      sdfDist = std.select(sdfDist, dist, closer);
      dir = std.select(dir, dirI, closer);
    }

    const normalizedDist =
      (sdfDist - paramsUniform.$.start) / (paramsUniform.$.end - paramsUniform.$.start);

    const texDim = std.textureDimensions(sampledView.$, 0);
    const featherUV = paramsUniform.$.edgeFeather / std.max(texDim.x, texDim.y);
    const weights = calculateWeights(sdfDist, paramsUniform.$.start, paramsUniform.$.end, featherUV);

    // The backdrop covers exactly this canvas, so the canvas's own uv indexes it
    // directly — no viewport mapping, unlike the page panels.
    const blurSample = std.textureSampleBias(sampledView.$, sampler.$, uv, paramsUniform.$.blur);
    const refractedSample = sampleWithChromaticAberration(
      sampledView.$,
      sampler.$,
      uv.add(dir.mul(paramsUniform.$.refractionStrength * normalizedDist)),
      // Saturate before the power — normalizedDist runs negative inside the ring
      // and past 1 outside it, and a fractional exponent on a negative base is
      // not a number. The weights discard those regions anyway.
      paramsUniform.$.chromaticStrength *
        std.saturate(normalizedDist) ** paramsUniform.$.chromaticFalloff,
      dir,
      paramsUniform.$.blur * paramsUniform.$.edgeBlurMultiplier,
    );

    const tint = TintParams({
      color: paramsUniform.$.tintColor,
      strength: paramsUniform.$.tintStrength,
    });

    const tintedBlur = applyTint(blurSample.rgb, tint);
    const tintedRing = applyTint(refractedSample, tint);

    // Their third term is the untouched background at weights.outside. Between
    // tiles that would paint our reconstruction of the page over the real page,
    // so the outside weight becomes transparency and the gaps show the real DOM.
    // Premultiplied, matching the canvas mode.
    const cover = std.saturate(weights.inside + weights.ring);
    const glass = tintedBlur.rgb.mul(weights.inside).add(tintedRing.rgb.mul(weights.ring));

    return d.vec4f(glass, cover);
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
    /** Called at the top of each frame, to repaint the backdrop canvas. */
    set beforeFrame(fn: (() => void) | null) {
      onFrame = fn;
    },
    /**
     * Aspect correction. Pass the canvas's CSS size; every distance in the tiles
     * and params is then measured in canvas heights.
     */
    setShapeScale(w: number, h: number) {
      shapeScaleUniform.write(d.vec2f(h > 0 ? w / h : 1, 1));
    },
    /**
     * The whole array, every frame. Not writePartial — that is a buffer method,
     * and calling it on a uniform throws from inside the render loop where the
     * only sign of it is a silent black canvas.
     */
    setTiles(tiles: { cx: number; cy: number; hx: number; hy: number }[]) {
      tilesUniform.write(
        tiles.map(t => d.vec4f(t.cx, t.cy, Math.max(t.hx, 0.0005), Math.max(t.hy, 0.0005))),
      );
    },
    setParams(p: SceneParams) {
      paramsUniform.write({
        radius: p.radius,
        start: p.start,
        end: p.end,
        chromaticStrength: p.chromaticStrength,
        refractionStrength: p.refractionStrength,
        blur: p.blur,
        edgeFeather: p.edgeFeather,
        edgeBlurMultiplier: p.edgeBlurMultiplier,
        tintStrength: p.tintStrength,
        tintColor: d.vec3f(p.tintR, p.tintG, p.tintB),
        chromaticFalloff: Math.max(p.chromaticFalloff ?? 1, 0.05),
      });
    },
    onCleanup() {
      cancelAnimationFrame(frameId);
    },
  };
}
