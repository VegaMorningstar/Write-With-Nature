import type { SpringProperties } from '../glass-alphabet/spring.ts';

/**
 * A glass glaze over the masthead's Landsat tiles.
 *
 * Same shader as the glass alphabet, and the same springs — what differs is
 * what goes into the backdrop. The alphabet refracts the page and a letter; this
 * refracts the satellite imagery itself, drawn into the backdrop from the very
 * <img> elements the masthead already loads.
 *
 * That makes the lens numbers different in kind rather than degree. A 46px
 * alphabet tile sits over a smooth gradient and has to overdrive its refraction
 * before anything is legible; a 70px tile of coastline is dense with detail, so
 * the same settings would smear it into noise. Refraction and aberration are
 * both well below the alphabet's here, and the edge carries the effect.
 */
export const MATERIAL_DEFAULTS = {
  // ── Shape ─────────────────────────────────────────────────────────────────
  // The masthead sizes its own tiles to the container; this is the ceiling, and
  // the row gap and letter gap match index.css so the glazed version lines up
  // with the CSS one it replaces.
  maxSize: 84,
  minSize: 36,
  gap: 4,
  rowGap: 5,
  spaceRatio: 0.5,   // a space is half a tile wide
  radius: 8,         // px, corner radius of the visible tile

  // ── Lens ──────────────────────────────────────────────────────────────────
  // Narrower than the alphabet's relative to the tile: the glaze is meant to sit
  // on the image, not swallow it.
  edge: 7,
  ringStart: 1.5,

  // Well under the alphabet's 0.4. There is real detail behind these tiles, so a
  // displacement that reads as a lens over a gradient reads as damage over a
  // photograph.
  refractionStrength: 0.05,
  chromaticStrength: 0.012,
  chromaticFalloff: 1.6,
  // Dispersion through the body, on the imagery rather than a glyph. Kept small
  // for the same reason.
  bodyChromatic: 0.004,

  // The image should stay legible through the glaze, so the body is barely
  // blurred and the rim is sharper still.
  blur: 0.35,
  edgeBlurMultiplier: 0.35,
  edgeFeather: 2,

  // Barely there. The tiles carry their own colour and a tint fights it.
  tintStrength: 0.03,
  tintR: 0.62, tintG: 0.72, tintB: 0.96,

  // ── Corner glyph ──────────────────────────────────────────────────────────
  // The letter in the tile's corner, in the overlay texture so the glaze
  // refracts it with the image underneath.
  letterSize: 11,
  letterWeight: 700,
  letterBlur: 0,
  letterR: 240, letterG: 234, letterB: 216,
  letterOpacity: 0.85,

  // ── Glow ──────────────────────────────────────────────────────────────────
  glowStrength: 0.55,
  glowHalo: 8,
  glowR: 214, glowG: 178, glowB: 92,
};

export const POINTER_DEFAULTS = {
  // Falls off over this many tiles
  radius: 2.2,
  strength: 1,
  sensitivity: 40,
  gain: 0.35,
  throttleMs: 32,
  hoverImpulse: 0.35,
  hoverLift: 5,      // px a hovered tile holds itself above the row
  clickImpulse: 0.92,
  glowGain: 1,
};

// The alphabet's springs. Fifteen tiles ring for the same reason twenty-six do:
// a long wobble across a row at once reads as noise rather than as glass.
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
