import type { SpringProperties } from '../glass-alphabet/spring.ts';

/**
 * The sun/moon ornament.
 *
 * Distances are fractions of the canvas's height, which is what the shader
 * works in — unlike the tiles, this element has one shape rather than a grid, so
 * there is no pixel layout to reason about and no reason to convert.
 *
 * The two states differ only in colour and in `morph`. Everything about the
 * glass is shared, so the sun and the moon are visibly the same material.
 */
export const MATERIAL_DEFAULTS = {
  // ── Shape ─────────────────────────────────────────────────────────────────
  radius: 0.17,        // the disk both states are built from
  rayInner: 0.245,     // how far out each spoke sits
  rayLength: 0.072,
  rayThickness: 0.030,
  rayRound: 0.028,
  // Smoothing on the union and the subtraction. This is what makes the spokes
  // swell out of the body rather than being stuck on, and what keeps the
  // crescent's horns from ending in needle points.
  blendK: 0.055,
  moonOffset: 0.135,   // how far the bite is shifted
  moonRadius: 0.20,

  // ── Lens ──────────────────────────────────────────────────────────────────
  // A wide ring against a small shape, as on the alphabet: at this size the
  // edge is nearly the whole element, so that is where the glass has to live.
  start: 0,
  end: 0.052,
  refractionStrength: 0.26,
  edgeCurve: 1.15,
  chromaticStrength: 0.055,
  chromaticFalloff: 2.2,
  bodyChromatic: 0.006,
  blur: 0.35,
  edgeBlurMultiplier: 0.4,
  edgeFeather: 2,

  // ── Light ─────────────────────────────────────────────────────────────────
  lightAzimuth: 118,
  lightElevation: 10,
  specularStrength: 1.1,
  specularPower: 38,
  specR: 255, specG: 250, specB: 232,
};

/**
 * Per state: the tint through the body, and the colour it throws when touched.
 * The sun runs warmer and more tinted — a sun that is not gold is a hole in the
 * page — while the moon keeps more of the background, since a crescent reads by
 * its shape and wants to look like cold glass.
 */
export const SUN = {
  tintStrength: 0.30,
  tintR: 1, tintG: 0.66, tintB: 0.16,
  glowR: 255, glowG: 148, glowB: 40,
};

export const MOON = {
  tintStrength: 0.20,
  tintR: 0.76, tintG: 0.68, tintB: 1,
  glowR: 198, glowG: 164, glowB: 255,
};

export const POINTER_DEFAULTS = {
  // Emission when hovered, and how much residual wobble adds on top
  hoverGlow: 0.85,
  glowGain: 0.9,
  glowHalo: 0.055,

  // Impulses. A velocity kick peaks at roughly v/omega, and omega here is 28.6,
  // so these land at about 10% deformation on hover and 28% on a press —
  // matched to the alphabet's 7% and 25%, which is the feel this should share.
  // The first pass at 2.4 and 5.5 gave 2% and 5%: the springs were running, and
  // nothing moved enough to see.
  hoverImpulse: 6,
  clickImpulse: 16,
  // How far the squash spring deforms the shape, as a fraction
  squashGain: 0.5,
  // The secondary ring, on the vertical only — a jelly does not squash
  // symmetrically, and a single axis reads as a pulse rather than a wobble.
  wobbleGain: 0.34,
  // Rays lengthen on the bounce. A sun whose body squashes while its spokes
  // stay rigid reads as a decal on a jelly rather than one object.
  rayStretch: 0.4,
};

/**
 * Squash rings quickly and loosely; the morph is heavier and lands with one
 * overshoot, so the change of state reads as a flip rather than a fade.
 */
export const squashProperties: SpringProperties = {
  mass: 1,
  stiffness: 820,
  damping: 12,
};

/** Softer and slower than the squash, so the two rings beat against each other
 *  instead of moving as one. */
export const wobbleProperties: SpringProperties = {
  mass: 1,
  stiffness: 430,
  damping: 9,
};

export const morphProperties: SpringProperties = {
  mass: 1,
  stiffness: 190,
  damping: 19,
};
