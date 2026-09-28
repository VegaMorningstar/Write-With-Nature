/**
 * Harvest NASA's own coordinates for every Landsat scene in images/.
 *
 * Run once, offline; the result is baked into src/data/coords.js.
 *
 *   node scripts/harvest-nasa-coords.mjs
 *
 * Where the numbers come from
 *   NASA's "Your Name in Landsat" interactive publishes a place name and a
 *   coordinate for each scene it shows. There is no API and no JSON file: the
 *   data is compiled into the widget's own bundle as a chain of branches keyed
 *   by each <img>'s alt attribute.
 *
 *     "1_0"==x.alt&&(locationTitle.innerHTML="Conesus Lake, New York, United States",
 *                    locationTitle.href="https://go.nasa.gov/...",
 *                    locationCoordinates.innerHTML="42°47'11.0 N 77°42'58.1 W",
 *                    locationCoordinates.href="https://maps.app.goo.gl/...")
 *
 *   So the bundle is fetched and read. It is a stable published asset, but it
 *   is still someone else's build output, so every assumption this file makes
 *   about its shape is checked and the run fails loudly rather than writing a
 *   half-empty file.
 *
 * Why this replaces geocoding the place name
 *   scripts/harvest-geo.mjs asks Nominatim where a name is. That returns the
 *   centroid of the named thing, which for "Amazon River, Brazil" is a point
 *   1778km from the scene NASA actually photographed. Measured over the 50
 *   places both sources know: median 36km apart, 12 of them over 100km.
 *   These coordinates are the scene's own.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IMAGES = path.join(ROOT, 'images')
const OUT = path.join(ROOT, 'src/data/coords.js')
const BUNDLE = 'https://science.nasa.gov/specials/your-name-in-landsat/assets/main.min.js'

/**
 * Scenes the matcher cannot settle on its own, decided by hand.
 *
 * Keyed by our image stem, valued with NASA's alt key, or null for "NASA does
 * not have this one". Each needs a reason, because a hand-written override is
 * a claim that the automatic answer is wrong.
 */
const OVERRIDES = {
  // NASA names this scene for the river on the Cameroon bank; we named it for
  // the city on the Chad bank. N'Djamena is 12°07'N 15°03'E and NASA's Logone
  // River is 12°00'28"N 15°03'46" — about 12km apart, the same picture.
  'S/s-1-nDjamena-chad': 's_1',

  // In our library but not in NASA's interactive, which carries neither a
  // Padma River nor a Kruger scene under any letter. They came from somewhere
  // else — most likely the gallery, which is a larger set than the widget.
  // Left without coordinates rather than given a neighbour's.
  'V/v-2-PadmaRiver-Bangladesh': null,
  'F/f-1-KrugerNationalPark-SouthAfrica': null,
}

// ── reading NASA's bundle ──────────────────────────────────────────────────

const nullIfPlaceholder = url =>
  !url || /^https?:\/\/none\.com\/?$/i.test(url) ? null : url

/** Every scene branch in the bundle, as {alt, title, dms, source, maps}. */
function parseBundle(js) {
  const BRANCH = /"([0-9A-Za-z]+_[0-9]+)"\s*==\s*x\.alt\s*&&\s*\(([\s\S]{0,900}?)\)\s*[,;}]/g
  const str = name => new RegExp(name + '\\.innerHTML\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"')
  const href = name => new RegExp(name + '\\.href\\s*=\\s*"([^"]*)"')

  const out = []
  for (const m of js.matchAll(BRANCH)) {
    const [, alt, body] = m
    const title = body.match(str('locationTitle'))?.[1]
    const dms = body.match(str('locationCoordinates'))?.[1]
    if (!title && !dms) continue
    out.push({
      alt,
      title: title && JSON.parse('"' + title + '"'),
      dms: dms && JSON.parse('"' + dms + '"'),
      // NASA puts https://none.com on the scenes they have not written up.
      // Carrying that through would put a dead link in the data and, worse,
      // one that looks real.
      source: nullIfPlaceholder(body.match(href('locationTitle'))?.[1]),
      maps: nullIfPlaceholder(body.match(href('locationCoordinates'))?.[1]),
    })
  }
  return out
}

/**
 * Degrees-minutes-seconds to signed decimal degrees.
 *
 * NASA writes them two ways, sometimes within the same bundle: with a space
 * before the hemisphere (42°47'11.0 N) and with an inch mark on the seconds
 * (40°21'59.6"N). Both are accepted. South and west come back negative, which
 * is the convention every mapping library expects.
 */
export function dmsToDecimal(dms) {
  if (!dms) return null
  const parts = [...dms.matchAll(/(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)\s*"?\s*([NSEW])/gi)]
  if (parts.length !== 2) return null
  const value = ([, d, m, s, hemi]) => {
    const v = Number(d) + Number(m) / 60 + Number(s) / 3600
    return /[SW]/i.test(hemi) ? -v : v
  }
  const [a, b] = parts
  const northSouthFirst = /[NS]/i.test(a[4])
  return {
    lat: Number((northSouthFirst ? value(a) : value(b)).toFixed(5)),
    lng: Number((northSouthFirst ? value(b) : value(a)).toFixed(5)),
  }
}

// ── matching our images to those records ───────────────────────────────────

/**
 * Comparable word tokens for a place name.
 *
 * Our filenames run words together in camelCase — LakeWaccamaw, FonteBoa,
 * djebelOuarkziz — so those are split before anything else; without that the
 * whole name is one token and matches nothing on NASA's spaced-out side.
 * Accents are folded, because Humaitá, Bíobío and Borgarbyggð are spelled
 * inconsistently between the two sources.
 */
function tokens(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(united states|usa|america)\b/g, ' ')
    .split(' ')
    .filter(w => w.length >= 3)
}

/** Levenshtein, for near-miss spellings: ConsensusLake vs Conesus Lake. */
function lev(a, b) {
  const m = a.length, n = b.length
  if (!m || !n) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

/** 0..1 name agreement, allowing a letter or two of misspelling per word. */
function score(a, b) {
  const A = tokens(a), B = tokens(b)
  if (!A.length || !B.length) return 0
  let hit = 0
  for (const x of A) {
    if (B.includes(x)) { hit += 1; continue }
    const near = B.some(y => Math.abs(x.length - y.length) <= 3 &&
      lev(x, y) <= Math.max(1, Math.floor(x.length / 4)))
    if (near) hit += 0.85
  }
  // Against the shorter side: NASA spells out country names our filenames
  // leave off, and those extra words should not read as a miss.
  return hit / Math.min(A.length, B.length)
}

/** Our scenes, one per image stem, with .webp and .png counted once. */
function readImages() {
  const out = new Map()
  for (const dir of fs.readdirSync(IMAGES)) {
    const full = path.join(IMAGES, dir)
    if (!fs.statSync(full).isDirectory()) continue
    // images/bricks/ is prerendered output from scripts/prerender-bricks.mjs,
    // one render per scene rather than a scene of its own. It is named by our
    // own letter and index (A-3.webp), so it carries no place to match on.
    if (dir === 'bricks') continue
    for (const file of fs.readdirSync(full)) {
      const m = file.match(/^(.+)\.(png|webp)$/i)
      if (!m) continue
      const stem = `${dir}/${m[1]}`
      if (out.has(stem)) continue
      const parts = m[1].match(/^([0-9A-Za-z])-(?:(\d+)-)?(.+)$/)
      if (!parts) { out.set(stem, { stem, letter: dir, idx: null, slug: m[1] }); continue }
      out.set(stem, {
        stem,
        letter: parts[1].toUpperCase(),
        idx: parts[2] ?? null,
        // The band suffix names the rendering, not the place.
        slug: parts[3].replace(/-(NIR|SWIR)$/i, ''),
      })
    }
  }
  return [...out.values()].sort((a, b) => a.stem.localeCompare(b.stem))
}

/**
 * Pick the record for one image.
 *
 * By name, not by index. Our per-letter numbering has drifted from NASA's —
 * our a-1 is NASA's a_2 and so on down the letter — so joining on the key
 * quietly attaches one scene's coordinates to a different scene's picture. It
 * would have done so for 19 of our images. The place name is the thing the
 * two sides actually agree on; the index is only consulted to break a tie.
 */
function pick(img, recs) {
  if (Object.hasOwn(OVERRIDES, img.stem)) {
    const alt = OVERRIDES[img.stem]
    return alt === null ? null : recs.find(r => r.alt === alt) ?? null
  }

  const rank = pool => pool
    .map(r => ({ r, s: score(img.slug, r.title || '') }))
    .sort((a, b) => b.s - a.s)

  // Prefer a record NASA files under the same letter, then widen. A scene can
  // be used under a letter NASA files elsewhere: our R/ has the Province of
  // Sondrio, which NASA keys under 3.
  let ranked = rank(recs.filter(r => r.alt.split('_')[0].toUpperCase() === img.letter))
  if (!ranked.length || ranked[0].s < 0.5) {
    const wide = rank(recs)
    if (wide.length && wide[0].s >= 0.5) ranked = wide
  }
  if (!ranked.length || ranked[0].s < 0.5) return null

  // On a tie, the index decides — and only on a tie. NASA files the two
  // distinct Regina scenes as 7_0 / 7_1 / l_2 / l_3, which is exactly how our
  // four Regina files are numbered, so there the key is the tie-break the
  // names cannot give.
  const tied = ranked.filter(x => x.s === ranked[0].s)
  const byIndex = tied.find(x => x.r.alt.toLowerCase() === `${img.letter.toLowerCase()}_${img.idx}`)
  return (byIndex ?? tied[0]).r
}

// ── run ────────────────────────────────────────────────────────────────────

const cached = process.argv[2]
const js = cached ? fs.readFileSync(cached, 'utf8') : await fetch(BUNDLE).then(r => {
  if (!r.ok) throw new Error(`NASA bundle: HTTP ${r.status}`)
  return r.text()
})

const recs = parseBundle(js)
if (recs.length < 100) throw new Error(`only ${recs.length} scene records parsed — the bundle's shape has changed`)
for (const r of recs) Object.assign(r, dmsToDecimal(r.dms) || {})
const undecodable = recs.filter(r => r.lat == null)
if (undecodable.length) throw new Error(`unparsed coordinates: ${undecodable.map(r => r.alt + ' ' + r.dms).join(', ')}`)

const imgs = readImages()
const coords = {}
const missed = []
for (const img of imgs) {
  const rec = pick(img, recs)
  if (!rec) { missed.push(img.stem); continue }
  coords[img.stem] = {
    place: rec.title,
    lat: rec.lat,
    lng: rec.lng,
    dms: rec.dms,
    nasa: rec.source,
    map: rec.maps,
  }
}

const header = `/**
 * Where each Landsat scene actually is, as NASA publishes it.
 *
 * Keyed by the image's path under images/, without its extension, so a scene
 * joins to letters.js by url regardless of whether the .png or the .webp is
 * being served.
 *
 * \`lat\`/\`lng\` are signed decimal degrees, decoded from the \`dms\` string NASA
 * shows. \`nasa\` is their write-up of the scene and \`map\` their Google Maps
 * pin, both as published.
 *
 * These are per-scene, not per-place. Two scenes sharing a name can sit a long
 * way apart — NASA has two Regina scenes 31km apart and three Amazon River
 * ones — which is why this is not keyed by the label the way geology.js is.
 *
 * Generated; regenerate with scripts/harvest-nasa-coords.mjs.
 * ${imgs.length - missed.length} of ${imgs.length} scenes.${missed.length ? ' Without coordinates, because NASA\'s\n * interactive does not carry them: ' + missed.join(', ') + '.' : ''}
 */
export const COORDS = `

fs.writeFileSync(OUT, header + JSON.stringify(coords, null, 1) + '\n')

console.log(`scene records from NASA : ${recs.length}`)
console.log(`our scenes              : ${imgs.length}`)
console.log(`  given coordinates     : ${imgs.length - missed.length}`)
console.log(`  left without          : ${missed.length}${missed.length ? '  (' + missed.join(', ') + ')' : ''}`)
console.log(`wrote ${path.relative(ROOT, OUT)}`)
