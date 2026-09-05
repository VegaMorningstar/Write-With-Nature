import type { SpringProperties } from './spring.ts';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Frosted glass keys, built in CSS and SVG.
 *
 * The first version of this rendered the tiles in a WebGPU shader. It kept
 * failing silently — a uniform method that does not exist, a stacking context
 * that let the canvas paint behind the page — and none of it was buying
 * anything the reference actually shows.
 *
 * The refraction is the same one the app's glass panels use: fractal noise,
 * blurred into a displacement map, warping the backdrop behind the tile. Doing
 * it three times at three scales and reassembling one channel from each gives
 * chromatic aberration, which is exactly how the WebGPU liquid glass samples
 * three refractive indices. Grain is a second, much finer displacement plus a
 * speckle painted over the fill — roughness and dust, the two halves of frost.
 *
 * Sized to match the colophon's alphabet grid in the app: 30px cells, 5px gaps,
 * 6px corners.
 */
export const MATERIAL_DEFAULTS = {
  // ── Shape ─────────────────────────────────────────────────────────────────
  size: 30,          // px, the tile's side — matches .alpha-cell
  radius: 6,         // px
  gap: 5,            // px between tiles

  // ── Frost ─────────────────────────────────────────────────────────────────
  // Four separate white layers land on a tile — fill, faceGradient, the
  // speckle, and whatever brightness lifts out of the backdrop — and they
  // compound. Half-opacity on each is an opaque tile, not a translucent one.
  // Kept low deliberately: the tile should be a pane, not a chiclet.
  blur: 4,
  saturate: 130,
  brightness: 1.02,
  fill: 0.06,

  // ── Refraction ────────────────────────────────────────────────────────────
  // The lens. Noise displaces the backdrop behind the tile, the way
  // #glass-element does for the compose card and the board.
  refraction: 10,      // px of displacement
  refractionScale: 0.012, // noise base frequency — low is a broad warp
  // Three displacement passes at three scales, one channel taken from each.
  // The WebGPU liquid glass does the same thing with three refractive indices.
  chromatic: 0.35,     // fraction of `refraction` separating red from blue

  // ── Grain ─────────────────────────────────────────────────────────────────
  grain: 0.5,          // speckle painted over the fill
  roughness: 1.6,      // px of fine displacement — the refractive half of frost

  // ── Rim ───────────────────────────────────────────────────────────────────
  // A bright outline the whole way round is the clearest single cue that a tile
  // is its own pane of glass, and it is what the reference leans on hardest.
  border: 0.4,
  borderWidth: 1,
  innerTop: 0.55,    // inset highlight along the top edge
  innerBottom: 0.16, // inset shade along the bottom, for thickness

  // ── Colour ────────────────────────────────────────────────────────────────
  // Each tile takes one colour from a field centred on the grid, so the bloom
  // runs through the middle instead of every tile looking identical.
  glowStrength: 0.42,
  glowSpread: 2.6,    // in tiles
  glowBlur: 10,       // px, the outer halo
  tintStrength: 0.2,  // how much of that colour lands in the tile's own face
  nearR: 255, nearG: 150, nearB: 210,   // centre of the bloom
  farR: 150, farG: 160, farB: 255,      // its edges

  // The face gradient: a soft wash rising from one corner, which is what gives
  // a flat rectangle the look of a solid with a lit face. It is the single
  // largest source of opacity on the tile — a sheen across one corner, not a
  // coat over the whole face.
  faceGradient: 0.2,
  faceAngle: 155,

  // ── Letter ────────────────────────────────────────────────────────────────
  letterSize: 14,
  letterWeight: 700,
  letterR: 74, letterG: 62, letterB: 148,
  letterOpacity: 0.85,
};

export const POINTER_DEFAULTS = {
  // Falls off over this many tiles
  radius: 2.4,
  strength: 1,
  sensitivity: 40,
  gain: 0.35,
  throttleMs: 32,
  // Crossing into a tile kicks it, whether or not the cursor is moving fast
  // enough for the travel-based nudge to fire.
  hoverImpulse: 0.35,
  hoverLift: 3,      // px a hovered tile holds itself above the grid
  clickImpulse: 0.5,
};

// Quick and loose. A long wobble across 26 tiles at once reads as noise.
export const squashProperties: SpringProperties = {
  mass: 1,
  stiffness: 900,
  damping: 13,
};

export const liftProperties: SpringProperties = {
  mass: 1,
  stiffness: 700,
  damping: 15,
};
