import type { SpringProperties } from './spring.ts';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Frosted glass keys, built in CSS.
 *
 * The first version of this rendered the tiles in a WebGPU shader. It kept
 * failing silently — a uniform method that does not exist, a stacking context
 * that let the canvas paint behind the page — and none of it was buying
 * anything the reference actually shows. Every feature in that image is a
 * backdrop-filter, a fill, a border and a shadow. CSS renders it deterministically
 * and hands us real buttons for free.
 */
export const MATERIAL_DEFAULTS = {
  // ── Shape ─────────────────────────────────────────────────────────────────
  size: 78,          // px, the tile's side
  radius: 22,        // px
  gap: 14,           // px between tiles

  // ── Frost ─────────────────────────────────────────────────────────────────
  blur: 14,
  saturate: 180,
  brightness: 1.06,
  // The white wash. Blur alone keeps the backdrop's brightness and reads as
  // plastic; this is what makes it frosted.
  fill: 0.34,

  // ── Rim ───────────────────────────────────────────────────────────────────
  // A bright outline the whole way round is the clearest single cue that a tile
  // is its own pane of glass, and it is what the reference leans on hardest.
  border: 0.72,
  borderWidth: 1,
  innerTop: 0.9,     // inset highlight along the top edge
  innerBottom: 0.22, // inset shade along the bottom, for thickness

  // ── Colour ────────────────────────────────────────────────────────────────
  // Each tile takes one colour from a field centred on the grid, so the bloom
  // runs through the middle instead of every tile looking identical.
  glowStrength: 0.55,
  glowSpread: 2.6,    // in tiles
  glowBlur: 26,       // px, the outer halo
  tintStrength: 0.5,  // how much of that colour lands in the tile's own face
  nearR: 255, nearG: 150, nearB: 210,   // centre of the bloom
  farR: 150, farG: 160, farB: 255,      // its edges

  // The face gradient: a soft wash rising from one corner, which is what gives
  // a flat rectangle the look of a solid with a lit face.
  faceGradient: 0.55,
  faceAngle: 155,

  // ── Letter ────────────────────────────────────────────────────────────────
  letterSize: 30,
  letterWeight: 600,
  letterR: 74, letterG: 62, letterB: 148,
  letterOpacity: 0.9,
};

export const POINTER_DEFAULTS = {
  // Falls off over this many tiles
  radius: 2.4,
  strength: 1,
  sensitivity: 40,
  gain: 0.35,
  throttleMs: 32,
  hoverLift: 6,      // px a hovered tile rises
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
