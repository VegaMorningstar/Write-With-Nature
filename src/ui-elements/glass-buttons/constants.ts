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

/**
 * #7EE022, and a strength a little above the row's own so it reads as green
 * rather than as a suggestion — but still well under a filter. Tint is what
 * marks Save out now that every label shares one colour and one font.
 */
export const SAVE_TINT = { r: 0x7e / 255, g: 0xe0 / 255, b: 0x22 / 255, strength: 0.1 };

/**
 * The compose button: the page's one action, so a bigger lens than the
 * toolbar's and a word set large enough to be read through it.
 *
 * bodyChromatic is the difference that matters here. It is dispersion through
 * the body of the glass rather than at its rim, and the letter mask is sampled
 * with it as well as the page behind — so the word itself splits into colour,
 * hardest against the edges of the lens and fading to nothing at the middle,
 * the way a slab splits light you look through at an angle and not head on.
 * The alphabet keeps it at zero: thirty-six of them fringing at once is noise.
 * One of them, carrying a word, is the whole effect.
 */
export const RENDER_MATERIAL = {
  ...BUTTON_MATERIAL,

  size: 58,        // px tall
  radius: 16,
  edge: 11,
  ringStart: 3.5,

  letterSize: 23,
  letterWeight: 600,

  bodyChromatic: 0.09,
};

/** Width in px of the compose button. */
export const RENDER_WIDTH = 196;
