import type { SpringProperties } from '../glass-alphabet/spring.ts';

/**
 * A glass glaze over the masthead's Landsat tiles.
 *
 * Same shader as the glass alphabet, and the same springs — what differs is
 * what goes into the backdrop. The alphabet refracts the page and a letter; this
 * refracts the satellite imagery itself, drawn into the backdrop from the very
 * <img> elements the masthead already loads.
 *
 * That also changes what the glaze can afford to do. The alphabet's box is inset
 * by its edge, which is fine when the thing behind it is a gradient — there is
 * nothing to lose. Here the box is the image and the glaze is added around it,
 * because spending the photograph's outer band on a bevel is a real loss.
 * The blur follows from the same thing: it is a mip level rather than a bias, so
 * zero genuinely means the sharpest one.
 */
export const MATERIAL_DEFAULTS = {
  // ── Shape ─────────────────────────────────────────────────────────────────
  // The masthead sizes its own tiles to the container; these are the bounds it
  // works between. `size` here means the image — a tile occupies size + 2*edge,
  // and `gap` is the space between visible tiles.
  //
  // 84 is Header.jsx's own ceiling, and on a full-width page the fit lands above
  // it, so the glazed tiles come out exactly the size the CSS ones are. Left
  // higher they would render larger than the masthead they replace. The bench is
  // narrower than the app — a 288px control panel — so tiles there are smaller
  // than this whatever the ceiling; the app page is where the size is judged.
  maxSize: 84,
  minSize: 52,
  gap: 4,
  rowGap: 7,
  spaceRatio: 0.3,   // the break between WRITE and WITH, as a fraction of a tile
  radius: 8,         // px, the image's own corner rounding

  // ── Lens ──────────────────────────────────────────────────────────────────
  // The glaze is added around the image rather than carved out of it: the SDF
  // box is the picture, and the shader inflates it by `edge` to make the visible
  // tile. Insetting the box instead — the obvious reading — spends the
  // photograph's outer band on the bevel.
  edge: 4.5,
  ringStart: 0,

  // Negative values are allowed and are worth trying. Positive pushes the
  // sample outward, so the rim shows what lies beyond the tile; negative pulls
  // the image out into the rim instead, which reads as glass thicker than the
  // picture magnifying its own edge.
  refractionStrength: 0.192,
  chromaticStrength: 0.08,
  chromaticFalloff: 5.7,

  // Exponent on the ring's displacement ramp — the edge's profile rather than
  // its strength. Linear is a flat chamfer: the surface tilts at a constant
  // rate from the image to the rim. A rounded lip barely turns near the image
  // and then sweeps fast at the outer edge, which is what above 1 gives, and
  // it is what makes the picture appear to wrap around the glass rather than
  // slide under a slope.
  edgeCurve: 2.4,
  // Dispersion through the body, on photographic detail rather than a glyph.
  bodyChromatic: 0.0008,

  // Zero is a mip level, not a bias — the body reads the sharpest mip, which is
  // what keeps the image at full clarity through the glass.
  blur: 0,
  edgeBlurMultiplier: 2,
  edgeFeather: 8,

  // Off. The tiles carry their own colour and a tint fights it.
  tintStrength: 0,
  tintR: 0.62, tintG: 0.72, tintB: 0.96,

  // ── Corner glyph ──────────────────────────────────────────────────────────
  // The letter in the tile's corner, in the overlay texture so the glaze
  // refracts it with the image underneath. Positioned against the body's corner
  // rather than the visible tile's: the glaze extends past the picture, and a
  // glyph set against its outer edge would float off into the bevel.
  letterSize: 15,
  letterWeight: 900,
  letterBlur: 0,
  letterAlign: 'right',      // which corner, horizontally
  letterBaseline: 'bottom',  // and vertically
  letterInsetX: 4,           // px in from the body's edge
  letterInsetY: 1.5,
  letterR: 240, letterG: 234, letterB: 216,
  letterOpacity: 1,

  // ── Glow ──────────────────────────────────────────────────────────────────
  glowStrength: 0.6,
  glowHalo: 8,
  glowR: 255, glowG: 178, glowB: 92,
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
