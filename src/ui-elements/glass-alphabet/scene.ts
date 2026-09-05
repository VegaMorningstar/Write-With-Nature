/**
 * TypeGPU's liquid glass, twenty-six times over.
 *
 * The shader body is theirs, by way of our own overlay.ts — calculateWeights,
 * applyTint, sampleWithChromaticAberration and the sampling in the fragment
 * function come from
 * TypeGPU/apps/typegpu-docs/src/examples/simple/liquid-glass/index.ts.
 *
 * Four things are ours, each marked OURS below:
 *
 *   1. Their SDF is a single rounded box; ours is the union of twenty-six, which
 *      is their minimum. One loop over a uniform array gives every tile the same
 *      lens in one draw call. The loop has to carry `dir` and the glow along
 *      with the distance, since with a union the fragment must use the values
 *      belonging to whichever tile actually won.
 *   2. The letters live in their own texture rather than in the backdrop. Two
 *      reasons: the backdrop is sampled at a mip bias to blur the glass body,
 *      which turns a 15px letter to mush, and a separate texture can be given
 *      its own dispersion so the letter fringes like the word under the jelly.
 *      It carries a mask in its alpha and takes its colour from a uniform, so
 *      the three chromatic samples produce real fringing on the glyph edges
 *      rather than three copies of a coloured bitmap.
 *   3. Refraction is converted out of box space before it is added to uv.
 *      Theirs adds a box-space offset straight to uv, which on a canvas that is
 *      not square displaces horizontally and vertically by different numbers of
 *      pixels. Their demo is square enough not to care; a wide grid is not.
 *   4. Emission from residual wobble energy, as on the jelly — full strength
 *      inside the tile and decaying outside it, so a pressed tile both brightens
 *      and throws light into the gaps around it.
 *
 * Everything reaching setTiles and setParams is in box space: canvas heights,
 * with x scaled by the aspect so corners come out circular. GlassAlphabet.jsx
 * converts from pixels, which is the only sane unit to tune a 46px tile in.
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
  // OURS
  bodyChromatic: d.f32,
  bodyDepth: d.f32,
  letterBlur: d.f32,
  letterColor: d.vec3f,
  glowStrength: d.f32,
  glowHalo: d.f32,
  glowColor: d.vec3f,
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
  bodyChromatic: number;
  bodyDepth: number;
  letterBlur: number;
  letterR: number;
  letterG: number;
  letterB: number;
  glowStrength: number;
  glowHalo: number;
  glowR: number;
  glowG: number;
  glowB: number;
};

/** xy = centre in box space, zw = half-extents in box space. */
const Tiles = d.arrayOf(d.vec4f, TILE_COUNT);
/** x = glow, from residual wobble energy. The rest is padding. */
const Glows = d.arrayOf(d.vec4f, TILE_COUNT);

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
  paperCanvas: HTMLCanvasElement,
  letterCanvas: HTMLCanvasElement,
) {
  // Fixed size, written with fit: 'stretch'. Recreating it on resize would leave
  // the compiled pipeline holding a view of a destroyed texture — the shader
  // captures the view when it is built, not on every frame. Sampling is in uv
  // space, so the stretch undoes itself.
  //
  // Both backdrops cover only the grid's own rectangle rather than the whole
  // viewport, so 1024 across a few hundred CSS pixels is oversampled — which is
  // the point for the letters, which are read through a lens at mip 0.
  const TEX_SIZE = 1024;

  const makeTexture = () =>
    root
      .createTexture({
        size: [TEX_SIZE, TEX_SIZE, 1],
        // 6 levels, because textureSampleBias needs a mip chain for the blur
        format: 'rgba8unorm',
        mipLevelCount: 6,
      })
      .$usage('sampled', 'render');

  const paperTexture = makeTexture();
  const letterTexture = makeTexture();
  const paperView = paperTexture.createView();
  const letterView = letterTexture.createView();

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
  const glowsUniform = root.createUniform(
    Glows,
    Array.from({ length: TILE_COUNT }, () => d.vec4f(0, 0, 0, 0)),
  );

  const paramsUniform = root.createUniform(Params, {
    radius: 0.02,
    start: 0.02,
    end: 0.04,
    chromaticStrength: 0.02,
    refractionStrength: 0.1,
    blur: 1.2,
    edgeFeather: 2,
    edgeBlurMultiplier: 0.7,
    tintStrength: 0.05,
    tintColor: d.vec3f(0.58, 0.44, 0.96),
    chromaticFalloff: 1,
    bodyChromatic: 0.01,
    bodyDepth: 0.05,
    letterBlur: 0,
    letterColor: d.vec3f(0.11, 0.1, 0.06),
    glowStrength: 0,
    glowHalo: 0.03,
    glowColor: d.vec3f(0.68, 0.85, 0.45),
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

  /**
   * OURS: the same three-index split, against a coverage mask instead of colour.
   * The letter texture carries only alpha, so what comes back is how much of the
   * glyph each channel sees — mixing the letter colour through that gives real
   * fringing on the glyph's edges rather than three tinted copies of it.
   */
  const sampleMaskWithChromaticAberration = (
    tex: d.texture2d<d.F32>,
    samp: d.sampler,
    uv: d.v2f,
    offset: number,
    dir: d.v2f,
    blur: number,
  ) => {
    'use gpu';
    const samples = d.arrayOf(d.f32, 3)();
    for (const i of tgpu.unroll(std.range(3))) {
      const channelOffset = dir * (d.f32(i) - 1) * offset;
      samples[i] = std.textureSampleBias(tex, samp, uv - channelOffset, blur).w;
    }
    return d.vec3f(samples[0], samples[1], samples[2]);
  };

  const fragmentShader = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    // Box space: canvas heights, x widened by the aspect so the space is
    // isotropic and a square tile is square.
    const p = uv.mul(shapeScaleUniform.$);

    // OURS: union of the tiles. Carry the winning tile's direction and glow as
    // well as its distance — with one box theirs is the only direction there is,
    // but here every tile refracts outward from its own centre.
    let sdfDist = d.f32(1e6);
    let dir = d.vec2f(0, 1);
    let glow = d.f32(0);

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
      glow = std.select(glow, glowsUniform.$[i].x, closer);
    }

    const normalizedDist =
      (sdfDist - paramsUniform.$.start) / (paramsUniform.$.end - paramsUniform.$.start);

    const texDim = std.textureDimensions(paperView.$, 0);
    const featherUV = paramsUniform.$.edgeFeather / std.max(texDim.x, texDim.y);
    const weights = calculateWeights(sdfDist, paramsUniform.$.start, paramsUniform.$.end, featherUV);

    // OURS: dir is a unit vector in box space, and uv is not — on a canvas wider
    // than it is tall, adding one to the other displaces further horizontally
    // than vertically. Dividing by the shape scale converts back, so the
    // strength is a distance in canvas heights like every other param here.
    const ringUv = uv.add(
      dir.mul(paramsUniform.$.refractionStrength * normalizedDist).div(shapeScaleUniform.$),
    );

    // Their ramp: no fringing at the inner edge of the ring, most at the outer.
    // Saturate before the power — normalizedDist runs negative inside the ring
    // and past 1 outside it, and a fractional exponent on a negative base is not
    // a number. The weights discard those regions anyway.
    const ringOffset =
      paramsUniform.$.chromaticStrength *
      std.saturate(normalizedDist) ** paramsUniform.$.chromaticFalloff;

    // OURS: the body disperses too, the way the jelly's does. Strongest against
    // the tile's own edge and fading to nothing at its centre — a slab of glass
    // splits light where you look through it at an angle, not head on.
    const bodyOffset =
      paramsUniform.$.bodyChromatic *
      std.saturate(1 + sdfDist / std.max(paramsUniform.$.bodyDepth, 1e-4));

    const paperBody = sampleWithChromaticAberration(
      paperView.$, sampler.$, uv, bodyOffset, dir, paramsUniform.$.blur,
    );
    const paperRing = sampleWithChromaticAberration(
      paperView.$, sampler.$, ringUv, ringOffset, dir,
      paramsUniform.$.blur * paramsUniform.$.edgeBlurMultiplier,
    );

    // OURS: the letters at their own bias — zero by default, so the glyph stays
    // sharp while the page behind it blurs. Sampling both out of one texture is
    // what made them mush.
    const maskBody = sampleMaskWithChromaticAberration(
      letterView.$, sampler.$, uv, bodyOffset, dir, paramsUniform.$.letterBlur,
    );
    const maskRing = sampleMaskWithChromaticAberration(
      letterView.$, sampler.$, ringUv, ringOffset, dir, paramsUniform.$.letterBlur,
    );

    const bodyColor = std.mix(paperBody, paramsUniform.$.letterColor, maskBody);
    const ringColor = std.mix(paperRing, paramsUniform.$.letterColor, maskRing);

    const tint = TintParams({
      color: paramsUniform.$.tintColor,
      strength: paramsUniform.$.tintStrength,
    });

    const tintedBlur = applyTint(bodyColor, tint);
    const tintedRing = applyTint(ringColor, tint);

    // Their third term is the untouched background at weights.outside. Between
    // tiles that would paint our reconstruction of the page over the real page,
    // so the outside weight becomes transparency and the gaps show the real DOM.
    // Premultiplied, matching the canvas mode.
    const cover = std.saturate(weights.inside + weights.ring);
    const glass = tintedBlur.rgb.mul(weights.inside).add(tintedRing.rgb.mul(weights.ring));

    // OURS: emission from residual wobble energy, as the jelly does it. Full
    // strength anywhere inside the lens and decaying outside it, so one term is
    // both the tile brightening and the light it throws into the gaps.
    const halo =
      std.exp(-std.max(sdfDist - paramsUniform.$.end, 0) / std.max(paramsUniform.$.glowHalo, 1e-5)) *
      glow * paramsUniform.$.glowStrength;

    return d.vec4f(
      glass.add(paramsUniform.$.glowColor.mul(halo)),
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
      paperTexture.write(paperCanvas, { fit: 'stretch' });
      paperTexture.generateMipmaps();
      letterTexture.write(letterCanvas, { fit: 'stretch' });
      letterTexture.generateMipmaps();
      pipeline.withColorAttachment({ view: context }).draw(3);
    } catch (e) {
      console.error('[GlassAlphabet] render error:', e);
    }
  }
  frameId = requestAnimationFrame(render);

  return {
    /** Called at the top of each frame, to repaint the backdrop canvases. */
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
    setTiles(tiles: { cx: number; cy: number; hx: number; hy: number; glow: number }[]) {
      tilesUniform.write(
        tiles.map(t => d.vec4f(t.cx, t.cy, Math.max(t.hx, 0.0005), Math.max(t.hy, 0.0005))),
      );
      glowsUniform.write(tiles.map(t => d.vec4f(t.glow, 0, 0, 0)));
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
        bodyChromatic: p.bodyChromatic,
        bodyDepth: Math.max(p.bodyDepth, 1e-4),
        letterBlur: p.letterBlur,
        letterColor: d.vec3f(p.letterR / 255, p.letterG / 255, p.letterB / 255),
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
