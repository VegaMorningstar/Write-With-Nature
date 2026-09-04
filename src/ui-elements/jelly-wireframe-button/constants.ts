import { d } from 'typegpu';
import type { SpringProperties } from './spring.ts';

// Rendering constants
export const MAX_STEPS = 96;
export const MAX_DIST = 10;
export const SURF_DIST = 0.001;

// Jelly material. These live in a uniform rather than being baked into the WGSL,
// so the tune page can drive them without recompiling the shader.
export const MATERIAL_DEFAULTS = {
  // Opacity looking straight through the blob. Fresnel pushes this to 1 at the
  // rim, so lower values let more of the word and the page show through.
  baseAlpha: 0.8,
  // How hard Fresnel drives the rim opaque. Off here — with the wireframe
  // carrying the edges, a bright Fresnel rim competes with the lines.
  fresnelAlpha: 0,
  // Refractive index. Higher bends harder and displaces the word further.
  ior: 1.42,
  // Spread between the red and blue refractive indices. Red bends least, blue
  // most, so a larger spread widens the colour fringe at the rim.
  dispersion: 0.095,
  // Frosting. Scatters the refracted ray; the TAA resolves it into a blur.
  blur: 0,
  // Overall colour strength. TypeGPU's liquid-glass example runs a tintStrength
  // of 0.05 — glass reads as glass when the tint is a suggestion, not a filter.
  tint: 0.61,
  // Beer-Lambert absorption density
  absorbDensity: 19.5,
  // Forward subsurface scattering
  scatter: 2.2,
  // Blinn-Phong highlight on the blob
  specular: 0.35,
  exposure: 2.2,
  shadowStrength: 0.34,
  // Emission from residual wobble energy
  glowGain: 0.38,

  // ── Wireframe ───────────────────────────────────────────────────────────────
  // Half-thickness of the frame bars, in world units. Thin, and paired with a
  // softness well above 1, so the edges read as caught light rather than ink.
  frameWidth: 0.006,
  // How dark or bright the lines sit against the body. 0 = near-black ink,
  // 1 = white.
  frameBrightness: 1,
  // Line opacity. Pushed into the alpha channel too, so the lines stay solid
  // where the jelly itself is see-through.
  frameGain: 0.1,
  // Edge softness as a fraction of the bar width. 0 is aliased, 1 is a smear.
  frameSoftness: 2,
  // Shape of the gradient from the line's core outward. Softness sets how wide
  // the falloff is; this sets its curve. Below 1 the line spreads into a broad
  // halo, above 1 it pulls into a tight core with a long thin tail.
  frameFalloff: 1,
  // Blend: 0 paints the line over the body, 1 adds it as light. Ink sits on top
  // of the glass; light comes through it, which is the more organic of the two.
  frameGlow: 0,
  // Attenuation with distance along the ray. All twelve edges currently draw at
  // the same weight however deep they sit, which is most of what makes the shape
  // read as a diagram — the far ones should be dimmer, since you are looking
  // through more jelly to see them.
  frameDepthFade: 0,

  // Soft inner edge, from horizontal distance to the blob's silhouette rather
  // than from ambient occlusion. Occlusion marched up from the plane sees the
  // blob directly overhead across its whole footprint, so it dims the entire
  // floor uniformly instead of banding at the contact line — which reads as murk
  // under a body that is supposed to be translucent. The jelly's own SDF
  // evaluated at the plane is negative inside the footprint and zero at its
  // boundary, so its absolute value gives a true edge band.
  edgeWidth: 0.075,
  edgeDark: 0.36,
  // Overall brightness of the floor under the blob. 1 leaves it fully lit, which
  // is what keeps the base reading as translucent.
  baseBright: 0.74,

  // Where the label plane sits in z. Larger values move the word's refracted
  // image toward the camera, and so downward on screen.
  labelCenterZ: -0.05,

  // ── Shape, uniform here rather than baked, so the frame can be aligned to
  // the silhouette from the tune page ─────────────────────────────────────────
  // Corner radius. The render button runs 0.13, but a fillet that large leaves
  // no corner for a frame to sit on, so this starts much tighter.
  round: 0.04,
  // Droop across the long axis. The bend is not an affine transform, so the
  // frame cannot follow it — at anything above about 0.15 they visibly diverge.
  bend: 0,
};

// Sphere-traced, so these are a step ceiling rather than a fixed count. The
// box's diagonal is about 1.9 units, so the march length covers it with room for
// the far edges beyond.
export const FRAME_STEPS = 32;
export const FRAME_MARCH_LENGTH = 2.2;


// Jelly geometry — a chunky cuboid, not a pane. Depth in y and z is what gives it
// visible side faces; a shallow slab reads as flat glass no matter how it is lit.
export const JELLY_HALFSIZE = d.vec3f(0.8, 0.28, 0.4);
// Corner radius, kept proportionally large so it stays soft rather than boxy
// Corner radius and bend live in MATERIAL_DEFAULTS here, not as constants — the
// wireframe has to be aligned to the silhouette, and that needs a slider.
// How far the blob settles into the surface, so it seats on the word
export const JELLY_SINK = 0.018;

// Label plane, in world units.
export const LABEL_HALF_W = 1.2;
export const LABEL_HALF_D = 0.45;
// The plane's z offset is MATERIAL_DEFAULTS.labelCenterZ, a uniform in this
// variant rather than a constant. Refraction displaces what you see through the
// blob backwards by roughly thickness * tan(asin(sin(view angle) / IOR)), and
// that shift depends on the IOR, the blob's thickness and the camera angle — all
// of which are now sliders, so where the word lands has to be one too.
// Ink is an albedo multiplier on the lit plane, not a flat colour, so the letters
// pick up the same lighting and AO as the surface they sit on.
export const LABEL_INK = d.vec3f(0.12, 0.13, 0.11);
export const LABEL_INK_DARK = d.vec3f(0.92, 0.94, 0.9);

// Surface lighting for the label plane, as tuned in the original. This is what the
// refracted rays land on, so it is what fills the blob's interior.
export const AMBIENT_COLOR = d.vec3f(0.6);
export const AMBIENT_INTENSITY = 0.6;
export const SPECULAR_POWER = 10;
export const SPECULAR_INTENSITY = 0.6;

// Ambient occlusion, marched against the jelly itself so the plane darkens under
// the blob. Kept at the original's short radius on purpose — widening it turns
// contact shading into a blanket darkening that swallows the word.
// Only used for the contact shadow cast on the page outside the blob, where the
// blob is not directly overhead and occlusion behaves sensibly. The inset edge
// seen *through* the glass uses the silhouette band instead — see edgeWidth.
export const AO_STEPS = 3;
export const AO_RADIUS = 0.12;
export const AO_INTENSITY = 0.5;
export const AO_BIAS = SURF_DIST * 5;


// Spring dynamics. The squash pair is TypeGPU's tuning untouched, giving an
// e^(-5t) envelope on squashX so it settles in roughly 0.8s.
export const squashXProperties: SpringProperties = {
  mass: 1,
  stiffness: 1000,
  damping: 10,
};
export const squashZProperties: SpringProperties = {
  mass: 1,
  stiffness: 900,
  damping: 12,
};
// Softened from TypeGPU's 1000 to slow the rock from 5.0 Hz to 3.5 Hz. The decay
// rate is unchanged — that is damping / 2m, which stiffness does not touch — so
// this is a slower sway over the same span, not a longer one.
export const wiggleXProperties: SpringProperties = {
  mass: 1,
  stiffness: 480,
  damping: 20,
};

// Impact impulses, matching the ones the original fires when the switch lands at
// the end of its travel.
export const JIGGLE_SQUASH_X = -5;
export const JIGGLE_SQUASH_Z = 5;
export const JIGGLE_WIGGLE_X = -10;
