/**
 * Bake every letter's 3D block to an image.
 *
 * A block costs about fifty blur passes over a height grid plus a WebGL
 * render. Done live, that is a visible stall on every keystroke; done once,
 * here, a tile costs exactly what the flat tile it replaced cost — one <img>.
 *
 * Output goes to images/bricks/<CHAR>-<n>.webp, which the dev server already
 * serves and the deploy workflow already copies (it takes every .webp under
 * images/), so nothing else has to know about it.
 *
 * Usage, with the dev server running:
 *
 *   npm run dev
 *   node scripts/prerender-bricks.mjs                    # only what is missing
 *   node scripts/prerender-bricks.mjs --force            # everything again
 *   node scripts/prerender-bricks.mjs --only S,R,9       # just these characters
 *   node scripts/prerender-bricks.mjs --url http://…     # a different server
 *
 * Re-run it after changing anything the blocks are built from: the geometry,
 * the strata, the geology data, or BRICK_VIEW.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'images/bricks')

const argv = process.argv.slice(2)
const flag = name => argv.includes(name)
const value = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}

const BASE = value('--url', 'http://localhost:5199/Write-With-Nature/')
const FORCE = flag('--force')
const ONLY = value('--only', '')
  .split(',')
  .map(s => s.trim().toUpperCase())
  .filter(Boolean)

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  channel: 'chrome',
  // The block shaders need a GL context; on a headless box that is software,
  // which is slower but pixel-identical for what these draw.
  args: ['--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})

const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
page.on('pageerror', e => console.error('  page error:', e.message))

const url = `${BASE}?prerender`
console.log(`driving ${url}`)
await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 })
await page.waitForFunction('!!window.__prerender', { timeout: 60_000 })

const jobs = await page.evaluate(() => window.__prerender.jobs)
const wanted = ONLY.length ? jobs.filter(j => ONLY.includes(j.ch)) : jobs
console.log(`${wanted.length} block${wanted.length === 1 ? '' : 's'} to consider`)

let made = 0
let skipped = 0
let failed = 0

// Every block's pixel size, so a tile can reserve the right box before the
// picture loads. Seeded from whatever is already on disk so a partial run
// (--only) does not drop the rest.
const INDEX = path.join(ROOT, 'src/data/brick-index.js')
const sizes = {}
try {
  const prev = fs.readFileSync(INDEX, 'utf8')
  const json = prev.slice(prev.indexOf('{'), prev.lastIndexOf('}') + 1)
  Object.assign(sizes, JSON.parse(json.replace(/'/g, '"').replace(/,(\s*[}\]])/g, '$1')))
} catch {
  /* first run, or hand-edited: start clean */
}

for (const job of wanted) {
  const file = path.join(OUT, `${job.name}.webp`)
  if (!FORCE && fs.existsSync(file)) {
    skipped++
    continue
  }

  try {
    // Rendered in the page, then re-encoded to WebP there too: the canvas can
    // do it, and shipping PNGs of this many blocks would be several times the
    // weight for no visible gain.
    const shot = await page.evaluate(async ({ ch, index }) => {
      const out = await window.__prerender.render(ch, index)
      const img = new Image()
      await new Promise((res, rej) => {
        img.onload = res
        img.onerror = rej
        img.src = out.src
      })
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      return { data: c.toDataURL('image/webp', 0.9), width: img.width, height: img.height }
    }, job)
    const dataUrl = shot.data

    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'))
    sizes[job.name] = [shot.width, shot.height]
    made++
    const kb = (fs.statSync(file).size / 1024).toFixed(0)
    console.log(`  ✓ ${job.name.padEnd(6)} ${String(kb).padStart(4)} kB  ${job.label}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${job.name}: ${e.message}`)
  }
}

await browser.close()

// Measure anything that was skipped, so the index is complete even when only
// part of the library was re-baked.
for (const job of wanted) {
  if (sizes[job.name]) continue
  const file = path.join(OUT, `${job.name}.webp`)
  if (fs.existsSync(file)) sizes[job.name] = null // unknown, fall back at runtime
}
for (const k of Object.keys(sizes)) if (!sizes[k]) delete sizes[k]

fs.writeFileSync(
  INDEX,
  `/**
 * The shape of every baked block picture, in pixels.
 *
 * Blocks are not all the same shape: relief is scaled by how much real
 * landform a scene has, so a mountain range stands taller in frame than a
 * floodplain does. A tile reserves the exact size before the image loads, so
 * the row never reflows as pictures arrive.
 *
 * Written by scripts/prerender-bricks.mjs. Do not edit by hand.
 */
export const BRICK_INDEX = ${JSON.stringify(sizes, null, 1)}
`
)
console.log(`index: ${Object.keys(sizes).length} entries`)

const total = fs
  .readdirSync(OUT)
  .filter(f => f.endsWith('.webp'))
  .reduce((n, f) => n + fs.statSync(path.join(OUT, f)).size, 0)

console.log(
  `\nbaked ${made}, skipped ${skipped}${failed ? `, failed ${failed}` : ''} ` +
    `— ${(total / 1024 / 1024).toFixed(1)} MB in images/bricks`
)
process.exit(failed ? 1 : 0)
