/**
 * TypeGPU's liquid-glass example, ported as directly as it goes.
 *
 * Source: TypeGPU/apps/typegpu-docs/src/examples/simple/liquid-glass/index.ts
 *
 * Everything between the PARAMS and SHADER markers below is their code
 * unchanged — Params, calculateWeights, applyTint,
 * sampleWithChromaticAberration and the fragment shader are byte-for-byte
 * theirs. The only thing that differs is the shape of the module: theirs runs
 * at import time against a global canvas and wires its own listeners, so that
 * part is turned into a factory a React component can own and tear down.
 *
 * This is deliberately their demo, not our panels: a texture with a glass
 * lozenge tracking the cursor. Judge the glass first; wiring it to the real
 * compose/board/colophon panels is a separate problem, and a harder one,
 * because backdrop-filter has live DOM behind it and a shader needs a texture.
 */
import { sdRoundedBox2d } from '@typegpu/sdf';
import { tgpu, common, d, std, type TgpuRoot } from 'typegpu';

// ── PARAMS ───────────────────────────────────────────────────── theirs ──────
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

export const defaultParams = {
  rectDims: d.vec2f(0.13, 0.01),
  radius: 0.003,
  start: 0.05,
  end: 0.1,
  chromaticStrength: 0.02,
  refractionStrength: 0.1,
  blur: 1.2,
  edgeFeather: 2.0,
  edgeBlurMultiplier: 0.7,
  tintStrength: 0.05,
  tintColor: d.vec3f(0.58, 0.44, 0.96),
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
// ── end PARAMS ───────────────────────────────────────────────────────────────

export async function setupLiquidGlass(
  root: TgpuRoot,
  context: GPUCanvasContext,
  imageBitmap: ImageBitmap,
) {
  const canvas = context.canvas as HTMLCanvasElement;

  const imageTexture = root
    .createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: 'rgba8unorm',
      mipLevelCount: 6,
    })
    .$usage('sampled', 'render');
  imageTexture.write(imageBitmap);
  imageTexture.generateMipmaps();

  const sampledView = imageTexture.createView();
  const sampler = root.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  });

  const mousePosUniform = root.createUniform(d.vec2f, d.vec2f(0.5, 0.5));
  const paramsUniform = root.createUniform(Params, defaultParams);

  // ── SHADER ─────────────────────────────────────────────────── theirs ──────
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

  const fragmentShader = tgpu.fragmentFn({
    in: { uv: d.vec2f },
    out: d.vec4f,
  })(({ uv }) => {
    const posInBoxSpace = uv.sub(mousePosUniform.$);
    const sdfDist = sdRoundedBox2d(posInBoxSpace, paramsUniform.$.rectDims, paramsUniform.$.radius);
    const dir = std.normalize(posInBoxSpace.mul(paramsUniform.$.rectDims.yx));
    const normalizedDist =
      (sdfDist - paramsUniform.$.start) / (paramsUniform.$.end - paramsUniform.$.start);

    const texDim = std.textureDimensions(sampledView.$, 0);
    const featherUV = paramsUniform.$.edgeFeather / std.max(texDim.x, texDim.y);
    const weights = calculateWeights(sdfDist, paramsUniform.$.start, paramsUniform.$.end, featherUV);

    const blurSample = std.textureSampleBias(sampledView.$, sampler.$, uv, paramsUniform.$.blur);
    const refractedSample = sampleWithChromaticAberration(
      sampledView.$,
      sampler.$,
      uv.add(dir.mul(paramsUniform.$.refractionStrength * normalizedDist)),
      paramsUniform.$.chromaticStrength * normalizedDist,
      dir,
      paramsUniform.$.blur * paramsUniform.$.edgeBlurMultiplier,
    );
    const normalSample = std.textureSampleLevel(sampledView.$, sampler.$, uv, 0);

    const tint = TintParams({
      color: paramsUniform.$.tintColor,
      strength: paramsUniform.$.tintStrength,
    });

    const tintedBlur = applyTint(blurSample.rgb, tint);
    const tintedRing = applyTint(refractedSample, tint);

    return tintedBlur
      .mul(weights.inside)
      .add(tintedRing.mul(weights.ring))
      .add(normalSample.mul(weights.outside));
  });
  // ── end SHADER ─────────────────────────────────────────────────────────────

  const pipeline = root.createRenderPipeline({
    vertex: common.fullScreenTriangle,
    fragment: fragmentShader,
  });

  let fixed = false;

  function updatePosition(clientX: number, clientY: number) {
    if (fixed) return;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    mousePosUniform.write(std.clamp(d.vec2f(x, y), d.vec2f(), d.vec2f(1)));
  }

  let frameId = 0;
  function render() {
    frameId = requestAnimationFrame(render);
    pipeline.withColorAttachment({ view: context }).draw(3);
  }
  frameId = requestAnimationFrame(render);

  return {
    updatePosition,
    toggleFixed(clientX: number, clientY: number) {
      fixed = !fixed;
      const wasFixed = fixed;
      fixed = false;
      updatePosition(clientX, clientY);
      fixed = wasFixed;
    },
    /**
     * Takes the params flat, since sliders deal in numbers, and rebuilds the
     * vec2f/vec3f the uniform wants. Same fields their controls write.
     */
    setParams(p: {
      rectW: number; rectH: number; radius: number; start: number; end: number;
      chromaticStrength: number; refractionStrength: number; blur: number;
      edgeFeather: number; edgeBlurMultiplier: number; tintStrength: number;
      tintR: number; tintG: number; tintB: number;
    }) {
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
