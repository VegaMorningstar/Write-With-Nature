import type { SpringProperties } from './spring.ts';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * TypeGPU's liquid glass, one lens per letter.
 *
 * A CSS attempt came before this and was abandoned. backdrop-filter can blur a
 * backdrop but not displace one, so there is no refraction available to it at
 * any setting — the tiles came out as flat white chips however the tint was
 * tuned, which is exactly what they were.
 *
 * Distances here are in pixels and converted to the shader's box space at write
 * time. The shader works in canvas heights, which is right for it and useless
 * for tuning a 30px tile: `end` at the panels' 0.09 would be 16px of inflation
 * on a tile whose half-width is 15.
 */
export const MATERIAL_DEFAULTS = {
  // ── Shape ─────────────────────────────────────────────────────────────────
  size: 30,          // px, the tile's side — matches .alpha-cell in the app
  radius: 9,         // px, corner radius of the visible tile
  gap: 5,            // px between tiles

  // ── Lens ──────────────────────────────────────────────────────────────────
  // The visible tile is the SDF box inflated by `edge`, and the ring between
  // `ringStart` and `edge` is where the backdrop is displaced outward. Inside
  // that ring the glass only blurs; outside it, nothing is drawn at all.
  edge: 6,           // px the box is inflated by — the rim's width
  ringStart: 0,      // px; above zero leaves a flat blurred band before the rim

  // How far the ring drags the backdrop, as a fraction of the canvas. Their demo
  // runs 0.1 across a full-screen lozenge; on a 30px tile that would haul in
  // colour from the far side of the grid.
  refractionStrength: 0.02,
  // Splits that displacement across three refractive indices. Red bends least,
  // blue most, so this is the width of the colour fringe at the rim.
  chromaticStrength: 0.006,
  // Exponent on the fringe's ramp across the ring. 1 is their linear version;
  // higher pushes the colour into the outer rim.
  chromaticFalloff: 1,

  // Mip bias for the blur seen through the body.
  blur: 1.2,
  // The rim is sharper than the body at anything below 1, which is what makes
  // the edge read as a bevel rather than a smear.
  edgeBlurMultiplier: 0.7,
  edgeFeather: 2,

  // Glass reads as glass when the tint is a suggestion, not a filter — their
  // example runs 0.05, and the jelly kept it.
  tintStrength: 0.06,
  tintR: 0.58, tintG: 0.44, tintB: 0.96,

  // ── Letter ────────────────────────────────────────────────────────────────
  // Painted into the backdrop rather than laid over the canvas, so it sits under
  // the glass and gets refracted with everything else behind the tile.
  letterSize: 15,
  letterWeight: 700,
  letterR: 28, letterG: 26, letterB: 16,
  letterOpacity: 0.62,
};

export const POINTER_DEFAULTS = {
  // Falls off over this many tiles
  radius: 2.4,
  strength: 1,
  sensitivity: 40,
  gain: 0.35,
  throttleMs: 32,
  // Crossing into a tile kicks it, whether or not the cursor was moving fast
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
