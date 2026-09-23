/**
 * brickAssets — where a letter's block picture comes from.
 *
 * Building a block is not cheap: the height field alone is about fifty blur
 * passes over a grid, and then a scene has to be rendered. Doing that per tile
 * while somebody types would put a visible stall on every keystroke, so every
 * block in the library is rendered once, ahead of time, by
 * `scripts/prerender-bricks.mjs`, and shipped as an ordinary image.
 *
 * A tile therefore costs exactly what the flat tile it replaced cost: one
 * <img>. The browser has most of them cached, and the service worker has the
 * rest.
 *
 * The live renderer stays as a fallback for anything not baked yet — a new
 * scene added to letters.js before the script is re-run — so the board never
 * shows a hole, it just fills that one tile a moment later.
 */

const BASE = import.meta.env.BASE_URL

import { BRICK_INDEX } from '../data/brick-index'

// The camera every block is seen from. Defined once in brickView, which is
// free of three.js so this module can re-export it without pulling a 3D
// library into a first paint.
export { BRICK_VIEW } from './brickView'
import { BRICK_VIEW, X_ON_SCREEN } from './brickView'

/**
 * The height every block is baked at, in device pixels.
 *
 * Tiles are at most ~260 CSS px tall on the board, so this covers a 2x screen
 * with room to spare, and the file stays small enough to ship 121 of them.
 */
export const BRICK_SIZE = 560

/**
 * Fallback shape, for a scene with no baked picture yet.
 *
 * Blocks are not all the same shape: relief is scaled by how much real
 * landform a scene has, so a mountain range stands taller in frame than a
 * floodplain and the rendered image is a little taller with it. Each block's
 * true size is recorded in data/brick-index.js when it is baked, and a tile
 * reserves exactly that — otherwise the row reflows as the pictures arrive.
 */
export const BRICK_ASPECT = 0.7

/** Width ÷ height of one block's baked picture. */
export function brickAspect(ch, variantIndex) {
  const size = BRICK_INDEX[brickName(ch, variantIndex)]
  return size ? size[0] / size[1] : BRICK_ASPECT
}

/**
 * How far apart blocks stand, in block widths. 0 has them touching.
 *
 * The same number the ?word page uses, so a row on the board and a row in a
 * single 3D scene are spaced alike.
 */
export const BRICK_GAP = 0.2

/**
 * How much of a block's picture the next one's picture starts within.
 *
 * A baked frame is wider than the block inside it: a block is a slab seen at
 * three-quarters, so its bounding box is much wider than the slab is at any
 * given height. Laid out as touching boxes, blocks end up standing far
 * further apart than the same blocks in one 3D scene. Tiles therefore overlap
 * by the difference, which is what this returns — the fraction of a picture's
 * width at which the next picture begins.
 *
 * Right-hand blocks are nearer the camera at this azimuth, so a later tile
 * belongs in front of an earlier one; DOM order already paints it that way.
 */
export function brickPitch(ch, variantIndex) {
  const rec = BRICK_INDEX[brickName(ch, variantIndex)]
  const frame = rec?.[2] ?? DEFAULT_FRAME
  return Math.min(1, ((1 + BRICK_GAP) * X_ON_SCREEN) / frame)
}

/** Frame width for a block with no index entry; close enough to lay it out. */
const DEFAULT_FRAME = 1.61

/**
 * A tile's width, as a share of the nominal tile size.
 *
 * Blocks are sized by *width*, never by height. Every baked frame is the same
 * width in world units — the camera fits each block the same way, and measured
 * across the library they agree to within one per cent — while their heights
 * differ with how much relief the terrain has. Fixing the pixel height
 * instead, as an ordinary square tile would, quietly shrinks a mountain range
 * against a floodplain and the row stops standing on one line.
 *
 * The value is chosen so a block comes out about as tall as the nominal tile
 * size, which is what the row layout and the panel are built around.
 */
export const BRICK_WIDTH = 0.7

/**
 * How much horizontal room a block takes in a row, tile sizes included.
 *
 * Less than its width, because consecutive blocks overlap. Row layout needs
 * this to work out how large the tiles can be.
 */
export const BRICK_ADVANCE = BRICK_WIDTH * ((1 + BRICK_GAP) * X_ON_SCREEN) / DEFAULT_FRAME

/**
 * Stable name for one scene's block: the character it spells and which of that
 * character's scenes it is. Keyed on both because the same place can spell
 * more than one letter, and each gets its own character cut into the face.
 */
export function brickName(ch, variantIndex) {
  // Case matters on a static host and letters.js keys are upper case, but a
  // digit and a letter must not collide, so the key is used verbatim.
  return `${ch}-${variantIndex}`
}

/** URL of the baked block, whether or not it exists. */
export function brickUrl(ch, variantIndex) {
  return `${BASE}images/bricks/${brickName(ch, variantIndex)}.webp`
}

/**
 * Resolve a block picture, preferring the baked one.
 *
 * Resolves to `{ src, aspect, baked }`. The live path is imported lazily so
 * that three.js is not in the bundle a first paint has to parse: on a board
 * whose blocks are all baked, it is never loaded at all.
 *
 * @param {string} ch            the character
 * @param {number} variantIndex  which of its scenes
 * @param {string} sceneUrl      that scene's satellite image
 * @param {string} label         its place name, for the geology lookup
 */
export async function loadBrick(ch, variantIndex, sceneUrl, label) {
  const src = brickUrl(ch, variantIndex)
  if (await exists(src)) return { src, aspect: brickAspect(ch, variantIndex), baked: true }

  const { renderBrick } = await import('./brickRenderer')
  const drawn = await renderBrick(sceneUrl, BRICK_SIZE, {
    place: label,
    letter: ch,
    ...BRICK_VIEW.model,
  })
  return { src: drawn.src, aspect: drawn.aspect, baked: false }
}

// One probe per URL for the life of the page. HEAD is enough and never pulls
// the body; the <img> that follows hits the same cache entry.
const probes = new Map()
function exists(url) {
  if (!probes.has(url)) {
    probes.set(
      url,
      fetch(url, { method: 'HEAD' })
        .then(r => r.ok)
        .catch(() => false)
    )
  }
  return probes.get(url)
}
