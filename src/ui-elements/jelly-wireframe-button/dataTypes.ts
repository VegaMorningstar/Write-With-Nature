import { tgpu, d } from 'typegpu';

export const DirectionalLight = d.struct({
  direction: d.vec3f,
  color: d.vec3f,
});

export const BoxIntersection = d.struct({
  hit: d.bool,
  tMin: d.f32,
  tMax: d.f32,
});

export const Ray = d.struct({
  origin: d.vec3f,
  direction: d.vec3f,
});

export type BoundingBox = d.Infer<typeof BoundingBox>;
export const BoundingBox = d.struct({
  min: d.vec3f,
  max: d.vec3f,
});

// Everything about the glass that the tune page can move. Held in a uniform so
// changing it is a buffer write rather than a shader recompile.
export const JellyMaterial = d.struct({
  baseAlpha: d.f32,
  fresnelAlpha: d.f32,
  ior: d.f32,
  dispersion: d.f32,
  blur: d.f32,
  tint: d.f32,
  absorbDensity: d.f32,
  scatter: d.f32,
  specular: d.f32,
  exposure: d.f32,
  shadowStrength: d.f32,
  glowGain: d.f32,
  frameWidth: d.f32,
  frameBrightness: d.f32,
  frameGain: d.f32,
  frameSoftness: d.f32,
  frameFalloff: d.f32,
  frameGlow: d.f32,
  frameDepthFade: d.f32,
  frameDispersion: d.f32,
  edgeWidth: d.f32,
  edgeDark: d.f32,
  baseBright: d.f32,
  labelCenterX: d.f32,
  labelCenterZ: d.f32,
  labelScale: d.f32,
  labelInk: d.f32,
  round: d.f32,
  bend: d.f32,
  // Blob half-extents and how far it settles into the plane. Uniforms here so
  // the shape can be dialled against the wireframe, which has to track it.
  halfX: d.f32,
  halfY: d.f32,
  halfZ: d.f32,
  sink: d.f32,
});

// glow tracks how much wobble energy is left, so the click reads as landing
// without needing a separate on/off state to reward.
export const SwitchState = d.struct({
  squashX: d.f32,
  squashZ: d.f32,
  wiggleX: d.f32,
  glow: d.f32,
});

export const taaResolveLayout = tgpu.bindGroupLayout({
  currentTexture: {
    texture: d.texture2d(),
  },
  historyTexture: {
    texture: d.texture2d(),
  },
  outputTexture: {
    storageTexture: d.textureStorage2d('rgba8unorm', 'write-only'),
  },
});

export const sampleLayout = tgpu.bindGroupLayout({
  currentTexture: {
    texture: d.texture2d(),
  },
});
