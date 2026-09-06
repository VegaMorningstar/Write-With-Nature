import type { SpringProperties } from './spring.ts';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * TypeGPU's liquid glass, one lens per letter.
 *
 * A CSS attempt came before this and was abandoned. backdrop-filter can blur a
 * backdrop but not displace one, so there was no refraction available to it at
 * any setting.
 *
 * Distances here are in pixels and converted to the shader's box space at write
 * time. The shader works in canvas heights, which is right for it and useless
 * for tuning a tile: `end` at the page panels' 0.09 would be 16px of inflation
 * on a tile whose half-width is 15.
 *
 * The lens numbers started from the approved liquid-glass square, carried across
 * by proportion rather than by value — that square's ring is 0.6 of the box's
 * half-height and begins at 0.27 of it, and the visible shape is the box plus
 * `end`. They have since been tuned past it: the edge is wider still, at 10.5
 * against a 23px half-tile, and the refraction and rim aberration both run far
 * harder than the square's. A tile this small has to overdrive both before the
 * bend is legible at all.
 */
export const MATERIAL_DEFAULTS = {
  // ── Shape ─────────────────────────────────────────────────────────────────
  size: 46,          // px, the tile's side
  radius: 10,        // px, corner radius of the visible tile
  gap: 4,            // px between tiles

  // ── Lens ──────────────────────────────────────────────────────────────────
  // The visible tile is the SDF box inflated by `edge`, and the ring between
  // `ringStart` and `edge` is where the backdrop is displaced outward. Inside
  // that ring the glass only blurs; outside it, nothing is drawn at all. A wide
  // ring against a small box is what gives the edge its depth — the thin rim
  // this had before is why the tiles read as flat panes.
  edge: 10.5,           // px the box is inflated by — the rim's width
  ringStart: 3.5,      // px; the flat blurred band before the rim begins

  // How far the ring drags the backdrop, in canvas heights. Their square runs
  // 0.1 and this now uses the same units, so the number transfers directly.
  refractionStrength: 0.4,
  // Splits that displacement across three refractive indices at the rim. Red
  // bends least, blue most, so this is the width of the colour fringe.
  chromaticStrength: 0.1,
  // Exponent on the fringe's ramp across the ring. 1 is their linear version;
  // higher pushes the colour into the outer rim.
  chromaticFalloff: 1.85,

  // Exponent on the ring's displacement ramp. 1 is TypeGPU's linear chamfer;
  // above it the bend concentrates at the outer rim and the edge reads as a
  // rounded lip rather than a bevel.
  edgeCurve: 1,

  // Dispersion through the body rather than the rim — the jelly's `dispersion`,
  // which is what fringes the word seen through it. Strongest against the
  // tile's own edge and fading to nothing at its centre, since a slab splits
  // light where you look through it at an angle and not head on.
  bodyChromatic: 0,

  // Mip bias for the blur seen through the body.
  blur: 0,
  // The rim is sharper than the body at anything below 1, which is what makes
  // the edge read as a bevel rather than a smear.
  edgeBlurMultiplier: 0.2,
  edgeFeather: 2,

  // Glass reads as glass when the tint is a suggestion, not a filter — their
  // example runs 0.05, and the jelly kept it.
  tintStrength: 0.04,
  tintR: 0.02, tintG: 0.44, tintB: 0.96,

  // ── Letter ────────────────────────────────────────────────────────────────
  // In its own texture, so it is displaced and fringed by the lens like
  // everything else behind the tile but does not take the body's mip bias. That
  // separation is the whole reason the glyph can stay sharp.
  letterSize: 20,
  letterWeight: 600,
  letterBlur: 0,
  letterR: 28, letterG: 26, letterB: 16,
  letterOpacity: 1,

  // ── Glow ──────────────────────────────────────────────────────────────────
  // Emission from residual wobble energy, as on the jelly. This is what marks a
  // press now that the focus ring is keyboard-only.
  glowStrength: 0.9,
  glowHalo: 4,      // px the light reaches past the tile
  glowR: 174, glowG: 216, glowB: 115,

  // ── Light ─────────────────────────────────────────────────────────────────
  // A highlight from a directional source, off the bevel the ring already
  // implies. Azimuth is measured on screen with 90 straight down from the top;
  // elevation is degrees above the surface, so 90 is directly overhead and
  // lights the flat body rather than the edge.
  lightAzimuth: 90,
  lightElevation: 35,
  specularStrength: 0,
  // Tightness. High keeps the highlight to a thin bright line along the lip;
  // low spreads it into a broad sheen across the whole bevel.
  specularPower: 40,
  specR: 255, specG: 252, specB: 240,
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
  clickImpulse: 0.92,
  // How hard residual spring energy turns into light
  glowGain: 1,
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
