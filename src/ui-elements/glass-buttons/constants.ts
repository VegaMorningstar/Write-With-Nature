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

  // 700 because that is the only upright weight of Playfair the page loads —
  // 500 asked for one that does not exist and got whatever was nearest. And
  // the symbols these carry are not in Playfair's glyph set at all, so they
  // fall through to the system serif, where thin strokes all but vanish once
  // the lens has displaced and blurred them. Bigger and heavier is what makes
  // them legible through glass.
  letterSize: 18,
  letterWeight: 700,
};

/** Width in px of a button carrying a word rather than a single glyph. */
export const WIDE_WIDTH = 92;

/**
 * #7EE022, at a strength well above the row's own 0.04 — enough that the tile
 * reads as a green thing made of glass rather than as clear glass with a
 * green note in it. Tint is what marks Save out now that every label in the
 * row shares one colour and one font.
 */
export const SAVE_TINT = { r: 0x7e / 255, g: 0xe0 / 255, b: 0x22 / 255, strength: 0.2 };

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
 *
 * It is a UV offset, not a pixel one: red is pulled one of these toward the
 * tile's centre and blue one away, across a texture that spans the canvas. So
 * the separation it buys is roughly `bodyChromatic × canvas width` at the rim,
 * ramping to nothing at the middle — about 2px here, where the canvas is some
 * 230px across. Past a hundredth or so it stops being a fringe on the word and
 * starts being three copies of it.
 */
export const RENDER_MATERIAL = {
  ...BUTTON_MATERIAL,

  size: 58,        // px tall
  radius: 16,
  edge: 11,
  ringStart: 3.5,

  letterSize: 23,
  // 700 for the same reason as the toolbar's: it is the only upright weight
  // of Playfair the page loads, and RENDER is a word Playfair does have, so
  // this is the one label in the app that gets the real face at the real
  // weight rather than a fallback.
  letterWeight: 700,

  bodyChromatic: 0.009,
};

/** Width in px of the compose button. */
export const RENDER_WIDTH = 196;
