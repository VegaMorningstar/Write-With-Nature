import { d } from 'typegpu';
import type { SpringProperties } from './spring.ts';

// Rendering constants
export const MAX_STEPS = 96;
export const MAX_DIST = 10;
export const SURF_DIST = 0.001;
export const EXPOSURE = 2.0;

// Jelly material constants
export const JELLY_IOR = 1.42;
// Spread between the red and blue refractive indices. Red bends least, blue most,
// so a larger spread widens the colour fringe at the rim.
export const JELLY_DISPERSION = 0.075;
export const JELLY_SCATTER_STRENGTH = 3;
// Opacity looking straight through the blob. Fresnel pushes this to 1 at the rim,
// so lower values let more of the word and the page show through the middle.
export const JELLY_BASE_ALPHA = 0.58;
// Overall colour strength. TypeGPU's liquid-glass example runs a tintStrength of
// 0.05 — glass reads as glass when the tint is a suggestion, not a filter.
export const JELLY_TINT = 0.55;

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
// Highlight strength. Refraction alone leaves the top face reading flat.
export const JELLY_SPECULAR = 0.35;

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

// Contact shadow
export const SHADOW_STRENGTH = 0.34;

// Spring dynamics, exactly as tuned in TypeGPU's jelly-switch. The wobble
// envelope these give is e^(-5t) on squashX, so it settles in roughly 0.8s.
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
export const wiggleXProperties: SpringProperties = {
  mass: 1,
  stiffness: 1000,
  damping: 20,
};

// Impact impulses, matching the ones the original fires when the switch lands at
// the end of its travel.
export const JIGGLE_SQUASH_X = -5;
export const JIGGLE_SQUASH_Z = 5;
export const JIGGLE_WIGGLE_X = -10;
