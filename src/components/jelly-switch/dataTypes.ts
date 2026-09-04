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
