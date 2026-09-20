import { MATERIAL_DEFAULTS } from '../glass-alphabet/constants.ts';

/**
 * The alphabet's lens, refitted to a toolbar.
 *
 * Everything optical is inherited: a second set of hand-tuned refraction
 * numbers would be two things to keep in step, and the material is the same
 * material. What changes is the geometry, because these tiles are 36px rather
 * than 46 and one of them is a word rather than a glyph. The rim scales with
 * the tile — a 10.5px edge against an 18px half-height would eat the button.
 */
export const BUTTON_MATERIAL = {
  ...MATERIAL_DEFAULTS,

  size: 36,        // px, the button's height, and the icons' width
  radius: 10,      // px, matching the corner the CSS buttons had
  gap: 6,
  edge: 8,         // px of rim, in proportion to the smaller tile
  ringStart: 2.6,

  letterSize: 15,
  letterWeight: 500,
};

/** Width in px of a button carrying a word rather than a single glyph. */
export const WIDE_WIDTH = 92;
