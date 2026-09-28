/**
 * Small square thumbnails of every Landsat scene, for the markers on the map.
 *
 *   node scripts/make-map-thumbs.mjs
 *
 * The scene images in images/ are 600px wide and average 103KB — 14.5MB for
 * the set. A map showing all of them at 40px each would pull that whole
 * library down to draw a few thousand pixels, so they are re-encoded once at
 * marker size and served from public/map-thumbs/.
 *
 * Playwright rather than an image library, because the repo already depends on
 * it for scripts/prerender-bricks.mjs and there is nothing else here that can
 * encode a webp. The page does the work in a canvas; this file just drives it.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/map-thumbs')

/** Drawn at 2x the marker's CSS size, so it stays sharp on a retina screen. */
const SIZE = 96
const QUALITY = 0.72

const { COORDS } = await import(
  'file:///' + path.join(ROOT, 'src/data/coords.js').replace(/\\/g, '/')
)

// One thumbnail per scene that has somewhere to be put.
const wanted = Object.keys(COORDS)
fs.mkdirSync(OUT, { recursive: true })

// The installed Chrome, not Playwright's own download, which is what
// scripts/prerender-bricks.mjs does and the only browser on this machine.
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.goto('about:blank')

let written = 0
let skipped = 0
let bytes = 0

for (const stem of wanted) {
  const dest = path.join(OUT, stem.replace('/', '__') + '.webp')
  if (fs.existsSync(dest)) { skipped++; bytes += fs.statSync(dest).size; continue }

  const src = path.join(ROOT, 'images', stem + '.webp')
  if (!fs.existsSync(src)) {
    console.warn(`  no source image for ${stem}`)
    continue
  }

  // Handed over as a data url: the page has no server to fetch from, and the
  // originals are small enough that inlining one at a time costs nothing.
  const dataUrl = 'data:image/webp;base64,' + fs.readFileSync(src).toString('base64')

  const encoded = await page.evaluate(async ({ url, size, quality }) => {
    const img = new Image()
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    // Centre-cropped to a square. The scenes are not square, and letterboxing
    // a marker would put theme-coloured bars inside a round thumbnail.
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
      0, 0, size, size
    )
    return c.toDataURL('image/webp', quality)
  }, { url: dataUrl, size: SIZE, quality: QUALITY })

  const buf = Buffer.from(encoded.split(',')[1], 'base64')
  fs.writeFileSync(dest, buf)
  written++
  bytes += buf.length
}

await browser.close()

console.log(`${written} written, ${skipped} already there`)
console.log(`${(bytes / 1024).toFixed(0)}KB total, ${(bytes / 1024 / (written + skipped)).toFixed(1)}KB each`)
console.log(`in ${path.relative(ROOT, OUT)}`)
