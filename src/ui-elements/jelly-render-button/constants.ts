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
  baseAlpha: 0.58,
  // How hard Fresnel drives the rim opaque
  fresnelAlpha: 3.5,
  // Refractive index. Higher bends harder and displaces the word further.
  ior: 1.42,
  // Spread between the red and blue refractive indices. Red bends least, blue
  // most, so a larger spread widens the colour fringe at the rim.
  dispersion: 0.075,
  // Frosting. Scatters the refracted ray; the TAA resolves it into a blur.
  blur: 0,
  // Overall colour strength. TypeGPU's liquid-glass example runs a tintStrength
  // of 0.05 — glass reads as glass when the tint is a suggestion, not a filter.
  tint: 0.55,
  // Beer-Lambert absorption density
  absorbDensity: 20,
  // Forward subsurface scattering
  scatter: 3,
  // Blinn-Phong highlight on the blob
  specular: 0.35,
  exposure: 2,
  shadowStrength: 0.34,
  // Emission from residual wobble energy
  glowGain: 0.55,
};


// Jelly geometry — a chunky cuboid, not a pane. Depth in y and z is what gives it
// visible side faces; a shallow slab reads as flat glass no matter how it is lit.
export const JELLY_HALFSIZE = d.vec3f(0.8, 0.28, 0.4);
// Corner radius, kept proportionally large so it stays soft rather than boxy
export const JELLY_ROUND = 0.13;
// How far the blob settles into the surface, so it seats on the word
export const JELLY_SINK = 0.018;
// Droop across the long axis. Low on purpose: at this width the original's 0.8
// bends the whole shape into a banana.
export const JELLY_BEND = 0.12;

// Label plane, in world units.
export const LABEL_HALF_W = 1.2;
export const LABEL_HALF_D = 0.45;
// Refraction displaces what you see through the blob backwards by roughly
// thickness * tan(asin(sin(view angle) / IOR)) — about a quarter of a unit here,
// which is three times the word's own height. The plane is shifted by that much so
// the refracted image of the word lands under the blob instead of behind it.
// Retune this if the camera angle or the blob's thickness changes.
export const LABEL_CENTER_Z = -0.26;
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
