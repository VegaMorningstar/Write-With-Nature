import type { SpringProperties } from './spring.ts';

/** A–Z. The count is baked into the shader's uniform arrays. */
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const TILE_COUNT = LETTERS.length;

export const MATERIAL_DEFAULTS = {
  // ── Glass, same model as the liquid glass panels ──────────────────────────
  // Distances are in tile heights, so they read the same whatever size the
  // tiles end up.
  radius: 0.26,
  start: 0.06,
  end: 0.2,
  refractionStrength: 0.16,
  chromaticStrength: 0.05,
  chromaticFalloff: 0.5,
  blur: 1.6,
  edgeBlurMultiplier: 0.7,
  edgeFeather: 2,

  // Lighter than the panels': 26 small tiles stack their tint into something
  // much heavier than one large sheet of the same glass would read as.
  tintStrength: 0.02,
  tintR: 0.62,
  tintG: 0.52,
  tintB: 0.95,

  // ── Frost ─────────────────────────────────────────────────────────────────
  // The white wash is what makes it read as frosted; blur alone keeps the
  // backdrop's brightness and reads as plastic.
  frostFill: 0.14,
  frostGrain: 0.35,

  // ── Glow ──────────────────────────────────────────────────────────────────
  // A field behind the grid rather than per-tile lighting, so the tiles pick it
  // up according to where they sit — which is what gives the reference image
  // its bloom through the middle.
  glowStrength: 0.9,
  glowSpread: 0.55,
  glowEdge: 1.5,
  glowR: 0.98,
  glowG: 0.42,
  glowB: 0.86,
  // Second colour, mixed in by distance, for the pink-to-blue falloff
  glowFarR: 0.36,
  glowFarG: 0.5,
  glowFarB: 1.0,
  // Extra glow on a tile the pointer is near
  hoverGlow: 0.8,
};

/** How the grid responds to the pointer. */
export const POINTER_DEFAULTS = {
  // Falls off over this many tile widths
  radius: 2.6,
  strength: 1,
  // Impulse into the squash springs from pointer travel
  sensitivity: 40,
  gain: 1.2,
  throttleMs: 32,
  // Click
  pressScale: 0.88,
  clickImpulse: 6,
};

// Loose and quick — these are small tiles, and a long wobble on 26 of them at
// once reads as noise rather than as jelly.
export const squashProperties: SpringProperties = {
  mass: 1,
  stiffness: 900,
  damping: 12,
};

export const liftProperties: SpringProperties = {
  mass: 1,
  stiffness: 700,
  damping: 14,
};
