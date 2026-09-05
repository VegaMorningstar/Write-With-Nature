/**
 * TypeGPU's liquid glass, applied to the page instead of a photograph.
 *
 * The shader body is still theirs — calculateWeights, applyTint,
 * sampleWithChromaticAberration and the sampling in the fragment function are
 * unchanged from
 * TypeGPU/apps/typegpu-docs/src/examples/simple/liquid-glass/index.ts.
 *
 * Two things had to change to put it on a page rather than an image:
 *
 *   1. The texture is rebuilt every frame from the page's background and the
 *      fluid cursor canvas (see backdrop.js), so the glass stays put while what
 *      is behind it keeps moving.
 *   2. Their fragment returns the untouched background outside the lens, which
 *      is right for a full-screen demo but wrong for an overlay — it would
 *      paint a slightly-wrong copy of the page over the real one. So the
 *      outside weight becomes transparency instead. Both changes are marked
 *      OURS below.
 *
 * The lens position is a uniform rather than the mouse, since the point here is
 * that the glass is static and the background moves under it.
 */
import { sdRoundedBox2d } from '@typegpu/sdf';
import { tgpu, common, d, std, type TgpuRoot } from 'typegpu';

const Params = d.struct({
  rectDims: d.vec2f,
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
});

export const overlayDefaults = {
  centerX: 0.5,
  centerY: 0.5,
  rectW: 0.13,
  rectH: 0.01,
  radius: 0.003,
  start: 0.05,
  end: 0.1,
  chromaticStrength: 0.02,
  refractionStrength: 0.1,
  blur: 1.2,
  edgeFeather: 2.0,
  edgeBlurMultiplier: 0.7,
  tintStrength: 0.05,
  tintR: 0.58,
  tintG: 0.44,
  tintB: 0.96,
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

export async function setupOverlay(
  root: TgpuRoot,
  context: GPUCanvasContext,
  backdropCanvas: HTMLCanvasElement,
) {
  // Fixed size, written with fit: 'stretch' whatever the backdrop canvas is.
  // Recreating it on resize would leave the already-compiled pipeline holding a
  // view of a destroyed texture — the shader captures the view when it is built,
  // not on every frame. Sampling is in uv space, so the stretch undoes itself.
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

  // OURS: static, rather than following the pointer
  const centerUniform = root.createUniform(d.vec2f, d.vec2f(0.5, 0.5));

  // OURS: the backdrop covers the whole viewport, but this canvas may only
  // occupy part of it. These map the canvas's own uv onto the slice of the
  // backdrop sitting behind it, so the glass refracts what is genuinely there
  // rather than a squashed copy of the entire page.
  const uvScaleUniform = root.createUniform(d.vec2f, d.vec2f(1, 1));
  const uvOffsetUniform = root.createUniform(d.vec2f, d.vec2f(0, 0));
  const paramsUniform = root.createUniform(Params, {
    rectDims: d.vec2f(overlayDefaults.rectW, overlayDefaults.rectH),
    radius: overlayDefaults.radius,
    start: overlayDefaults.start,
    end: overlayDefaults.end,
    chromaticStrength: overlayDefaults.chromaticStrength,
    refractionStrength: overlayDefaults.refractionStrength,
    blur: overlayDefaults.blur,
    edgeFeather: overlayDefaults.edgeFeather,
    edgeBlurMultiplier: overlayDefaults.edgeBlurMultiplier,
    tintStrength: overlayDefaults.tintStrength,
    tintColor: d.vec3f(overlayDefaults.tintR, overlayDefaults.tintG, overlayDefaults.tintB),
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
    const posInBoxSpace = uv.sub(centerUniform.$);
    const sdfDist = sdRoundedBox2d(posInBoxSpace, paramsUniform.$.rectDims, paramsUniform.$.radius);
    const dir = std.normalize(posInBoxSpace.mul(paramsUniform.$.rectDims.yx));
    const normalizedDist =
      (sdfDist - paramsUniform.$.start) / (paramsUniform.$.end - paramsUniform.$.start);

    const texDim = std.textureDimensions(sampledView.$, 0);
    const featherUV = paramsUniform.$.edgeFeather / std.max(texDim.x, texDim.y);
    const weights = calculateWeights(sdfDist, paramsUniform.$.start, paramsUniform.$.end, featherUV);

    // OURS: sample the backdrop through the canvas-to-viewport mapping. The SDF
    // above still works in the canvas's own uv, so the lens sits where it is
    // placed regardless of where the canvas is on the page.
    const bgUv = uv.mul(uvScaleUniform.$).add(uvOffsetUniform.$);

    const blurSample = std.textureSampleBias(sampledView.$, sampler.$, bgUv, paramsUniform.$.blur);
    const refractedSample = sampleWithChromaticAberration(
      sampledView.$,
      sampler.$,
      bgUv.add(dir.mul(paramsUniform.$.refractionStrength * normalizedDist)),
      paramsUniform.$.chromaticStrength * normalizedDist,
      dir,
      paramsUniform.$.blur * paramsUniform.$.edgeBlurMultiplier,
    );

    const tint = TintParams({
      color: paramsUniform.$.tintColor,
      strength: paramsUniform.$.tintStrength,
    });

    const tintedBlur = applyTint(blurSample.rgb, tint);
    const tintedRing = applyTint(refractedSample, tint);

    // OURS: their third term is normalSample * weights.outside, the untouched
    // background. As an overlay that would paint our reconstruction of the page
    // over the real page, so the outside weight becomes transparency and the
    // real DOM shows through instead. Premultiplied, matching the canvas mode.
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
      console.error('[LiquidGlassOverlay] render error:', e);
    }
  }
  frameId = requestAnimationFrame(render);

  return {
    /** Called at the top of each frame, to repaint the backdrop canvas. */
    set beforeFrame(fn: (() => void) | null) {
      onFrame = fn;
    },
    /** Which slice of the viewport-sized backdrop sits behind this canvas. */
    setViewportRect(rect: { x: number; y: number; w: number; h: number }, vw: number, vh: number) {
      uvScaleUniform.write(d.vec2f(rect.w / vw, rect.h / vh));
      uvOffsetUniform.write(d.vec2f(rect.x / vw, rect.y / vh));
    },
    /** Kept for callers; the texture is a fixed size and stretches to fit. */
    resizeBackdrop(_w: number, _h: number) {},
    setParams(p: typeof overlayDefaults) {
      centerUniform.write(d.vec2f(p.centerX, p.centerY));
      paramsUniform.write({
        rectDims: d.vec2f(p.rectW, p.rectH),
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
      });
    },
    onCleanup() {
      cancelAnimationFrame(frameId);
    },
  };
}
