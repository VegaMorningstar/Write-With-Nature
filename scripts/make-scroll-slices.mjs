/**
 * Cut the scroll's rollers and sheet out of one rendered image.
 *
 *   node scripts/make-scroll-slices.mjs <source.png>
 *
 * The map panel is a scroll that opens to any height, and no single picture
 * of a scroll can stretch to an arbitrary height without the rollers going
 * with it. So the picture is cut into three: the head roller, the foot roller,
 * and the flat sheet between them. On the page the two rollers keep their own
 * proportions and the sheet is scaled to fill whatever height the map needs,
 * where a parchment texture can take being squashed without anyone noticing
 * and a brass finial cannot.
 *
 * Where to cut is measured, not typed. The source has a real alpha channel,
 * so the opaque extent of each row says what is there: the rollers with their
 * finials are wider than the sheet, and the row where the opaque width drops
 * from roller-wide to sheet-wide is where the roller ends. The same numbers
 * give the sheet's torn edges as a fraction of the roller's width, which is
 * what the CSS needs to put the map on the paper rather than on the brass.
 *
 * Playwright rather than an image library, for the same reason as
 * make-map-thumbs.mjs: the repo already depends on it and nothing else here
 * can decode a PNG or encode a webp. Uses the installed Chrome, as that
 * script does.
 *
 * Output: public/scroll/{head,foot,sheet}.webp and public/scroll/geometry.json,
 * the last of which is what the stylesheet's numbers are derived from.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/scroll')
const SRC = path.resolve(process.argv[2] || '')
if (!process.argv[2] || !fs.existsSync(SRC)) {
  console.error('usage: node scripts/make-scroll-slices.mjs <source.png>')
  process.exit(1)
}

/** Widest the panel gets on screen is ~1220px; 2x of that for a retina screen. */
const BAND_WIDTH = 2440
const QUALITY = 0.86
/** Alpha below this is treated as empty: antialiased fringe, not paper. */
const OPAQUE = 24

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
// Navigating straight to the file gives an <img> Chrome has already decoded;
// handing 11MB through evaluate() as a data url would be the slow way round.
await page.goto('file:///' + SRC.replace(/\\/g, '/'))

const result = await page.evaluate(async ({ BAND_WIDTH, QUALITY, OPAQUE }) => {
  const img = document.querySelector('img')
  await img.decode()
  const W = img.naturalWidth, H = img.naturalHeight

  const full = document.createElement('canvas')
  full.width = W; full.height = H
  const fctx = full.getContext('2d', { willReadFrequently: true })
  fctx.drawImage(img, 0, 0)
  const a = fctx.getImageData(0, 0, W, H).data

  // Per row: leftmost and rightmost opaque column, or null if the row is empty.
  const rows = new Array(H)
  for (let y = 0; y < H; y++) {
    let l = -1, r = -1
    const base = y * W * 4 + 3
    for (let x = 0; x < W; x++) { if (a[base + x * 4] > OPAQUE) { l = x; break } }
    if (l >= 0) for (let x = W - 1; x >= l; x--) { if (a[base + x * 4] > OPAQUE) { r = x; break } }
    rows[y] = l >= 0 ? [l, r] : null
  }
  const first = rows.findIndex(Boolean)
  const last = H - 1 - [...rows].reverse().findIndex(Boolean)

  // The rollers are the widest thing in the picture. The sheet is what is
  // there in the middle rows. Cut where the width has come down from the
  // roller's to the sheet's.
  const widths = rows.map(r => (r ? r[1] - r[0] + 1 : 0))
  const rollerW = Math.max(...widths)
  const mid = Math.round((first + last) / 2)
  const sheetW = widths[mid]
  // A row belongs to a roller while it is meaningfully wider than the sheet.
  const isRoller = w => w > sheetW + (rollerW - sheetW) * 0.12
  // Found from the sheet side, walking outward from the middle. Walking in
  // from the picture's edge fails on the foot: the last opaque row of a
  // roller is the thin antialiased sliver of its rounded underside, narrower
  // than the sheet, so a walk that starts there stops before it begins. The
  // sheet's rows are all the same width, so the first roller-wide row past
  // them is unambiguous in either direction.
  let headEnd = mid
  while (headEnd > first && !isRoller(widths[headEnd - 1])) headEnd--
  let footStart = mid
  while (footStart < last && !isRoller(widths[footStart + 1])) footStart++

  // The axle: the row where each roller is widest, since the finials are
  // mounted on it. On the page the sheet should look as if it passes under
  // the roll at that line, so the part of the band below the axle (for the
  // head) lies over the map and only the part above it projects.
  const argmax = (from, to) => { let best = from; for (let y = from; y <= to; y++) if (widths[y] > widths[best]) best = y; return best }
  const headAxle = argmax(first, headEnd - 1)
  const footAxle = argmax(footStart + 1, last)

  // The sheet's edges, taken across the middle third so one deep bite in the
  // tear does not stand in for the whole edge.
  let sl = W, sr = 0
  for (let y = headEnd + Math.round((footStart - headEnd) / 3); y < footStart - Math.round((footStart - headEnd) / 3); y++) {
    if (rows[y]) { sl = Math.min(sl, rows[y][0]); sr = Math.max(sr, rows[y][1]) }
  }
  // And the rollers' full extent, finials included.
  let rl = W, rr = 0
  for (let y = first; y < headEnd; y++) { if (rows[y]) { rl = Math.min(rl, rows[y][0]); rr = Math.max(rr, rows[y][1]) } }

  const cut = (sx, sy, sw, sh, outW) => {
    const scale = outW / sw
    const c = document.createElement('canvas')
    c.width = outW; c.height = Math.round(sh * scale)
    const ctx = c.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(full, sx, sy, sw, sh, 0, 0, c.width, c.height)
    return { data: c.toDataURL('image/webp', QUALITY), w: c.width, h: c.height }
  }

  const bandW = rr - rl + 1
  const head = cut(rl, first, bandW, headEnd - first, BAND_WIDTH)
  const foot = cut(rl, footStart + 1, bandW, last - footStart, BAND_WIDTH)
  // The sheet at the same scale as the bands, so its width on screen is the
  // right fraction of theirs.
  const sheetOutW = Math.round((sr - sl + 1) * (BAND_WIDTH / bandW))
  const sheet = cut(sl, headEnd, sr - sl + 1, footStart - headEnd + 1, sheetOutW)

  // Each roller in three, so it can be any width at a fixed height: the two
  // finials keep their shape and only the cylinder between them stretches.
  // Stretching runs along the cylinder's own shading, which is the direction
  // paper texture forgives. A cap is the finial plus a little cylinder, so
  // the stretched middle starts under it and the seam is hidden.
  const scale = BAND_WIDTH / bandW
  const capW = (sl - rl) + Math.round(bandW * 0.05)
  const midW = Math.round(bandW * 0.2)
  const cx = Math.round((rl + rr) / 2)
  // The middle crop sits near the roller's centre, where the photographed
  // cylinder still bulges: its opaque extent there is a shorter vertical run
  // than the whole band, because the top and bottom of the tube curve inward
  // toward the finial. Cutting the full band height for this slice pulls in
  // transparent corners, which stretched into the middle piece read as chips
  // out of the roller with the panel behind showing through. So its vertical
  // range is found separately: only rows where every sampled column across
  // the crop's own width is opaque, which is the tallest rectangle of real
  // roller this slice of the photograph actually has.
  const midL = cx - Math.round(midW / 2), midR = midL + midW - 1
  const fullyOpaqueRow = y => {
    const base = y * W * 4 + 3
    for (let x = midL; x <= midR; x += 4) if (a[base + x * 4] <= OPAQUE) return false
    return true
  }
  // Seeded from the centre of each band on its own — not the whole image's
  // midpoint, which falls in the gap between the two rollers, on the sheet,
  // where these columns are not roller pixels at all and the walk would stop
  // before it started.
  const opaqueSpan = (y0, y1) => {
    const seed = Math.round((y0 + y1) / 2)
    let a1 = seed, b1 = seed
    while (a1 > y0 && fullyOpaqueRow(a1 - 1)) a1--
    while (b1 < y1 - 1 && fullyOpaqueRow(b1 + 1)) b1++
    return [a1, b1]
  }

  const three = (y0, y1) => {
    const [my0, my1] = opaqueSpan(y0, y1)
    return {
      l: cut(rl, y0, capW, y1 - y0, Math.round(capW * scale)),
      m: cut(midL, my0, midW, my1 - my0 + 1, Math.round(midW * scale)),
      r: cut(rr - capW + 1, y0, capW, y1 - y0, Math.round(capW * scale)),
    }
  }
  const headParts = three(first, headEnd)
  const footParts = three(footStart + 1, last + 1)

  return {
    source: { width: W, height: H },
    px: { first, headEnd, footStart, last, headAxle, footAxle, rollerLeft: rl, rollerRight: rr, sheetLeft: sl, sheetRight: sr },
    // Everything the stylesheet needs, as fractions of the roller band's
    // width, so they hold at any panel width.
    geometry: {
      bandAspect: +((headEnd - first) / bandW).toFixed(5),
      footAspect: +((last - footStart) / bandW).toFixed(5),
      sheetLeft: +((sl - rl) / bandW).toFixed(5),
      sheetRight: +((rr - sr) / bandW).toFixed(5),
      sheetWidth: +((sr - sl + 1) / bandW).toFixed(5),
      // How far down each band its axle sits, as a fraction of that band's
      // own height. The head overlaps the sheet by (1 - headAxle) of itself,
      // the foot by footAxle of itself.
      // Width of a finial cap relative to the band's height. On the page the
      // roller is a fixed height, so a cap is this many times that height wide.
      capPerHeight: +(capW / (headEnd - first)).toFixed(5),
      headAxle: +((headAxle - first) / (headEnd - first)).toFixed(5),
      footAxle: +((footAxle - footStart - 1) / (last - footStart)).toFixed(5),
    },
    slices: { head, foot, sheet, headParts, footParts },
  }
}, { BAND_WIDTH, QUALITY, OPAQUE })

await browser.close()

const write = (name, s) => {
  const buf = Buffer.from(s.data.split(',')[1], 'base64')
  fs.writeFileSync(path.join(OUT, name + '.webp'), buf)
  return `${name}.webp ${s.w}x${s.h} ${(buf.length / 1024).toFixed(0)}KB`
}
console.log('source     :', result.source.width + 'x' + result.source.height)
console.log('cut rows   :', JSON.stringify(result.px))
console.log('geometry   :', JSON.stringify(result.geometry))
console.log(write('head', result.slices.head))
console.log(write('foot', result.slices.foot))
console.log(write('sheet', result.slices.sheet))
for (const [band, parts] of [['head', result.slices.headParts], ['foot', result.slices.footParts]]) {
  for (const k of ['l', 'm', 'r']) console.log(write(band + '-' + k, parts[k]))
}
fs.writeFileSync(path.join(OUT, 'geometry.json'), JSON.stringify(result.geometry, null, 2) + '\n')
console.log('geometry.json written; in', path.relative(ROOT, OUT))
