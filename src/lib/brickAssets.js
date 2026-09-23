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

/**
 * The camera the blocks are baked from.
 *
 * Anything drawn over the tiles afterwards has to agree with this or the
 * scene falls apart, so it lives here rather than in either of the places
 * that needs it. FlockLayer reads it to aim its own camera.
 */
export const BRICK_VIEW = {
  azimuth: 20, // degrees
  elevation: 42,
  /** What the renderer was told to build. Baked in; changing it needs a re-run. */
  model: { relief: 0.13, depth: 0.68 },
}

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
export const BRICK_ASPECT = 0.9

/** Width ÷ height of one block's baked picture. */
export function brickAspect(ch, variantIndex) {
  const size = BRICK_INDEX[brickName(ch, variantIndex)]
  return size ? size[0] / size[1] : BRICK_ASPECT
}

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
