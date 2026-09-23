/**
 * Harvest real geology for every scene in the Landsat library.
 *
 * Run once, offline; the result is baked into src/data/geology.js. Doing this
 * at render time would mean an API call per letter, on a page that is supposed
 * to work offline as a PWA.
 *
 *   node harvest-geo.mjs
 *
 * Sources
 *   Nominatim (OSM)   place name  -> lat/lng
 *   OpenTopoData      lat/lng     -> elevation, sampled on a grid for relief
 *   Macrostrat        lat/lng     -> bedrock lithology and age (CC-BY 4.0)
 */

import fs from 'fs'
import path from 'path'

const WWN = path.resolve('wwn')
const OUT = path.join(WWN, 'src/data/geology.js')
const CACHE = path.resolve('geo-cache.json')

const UA = 'write-with-nature/1.0 (landsat block geology, one-off harvest)'
const sleep = ms => new Promise(r => setTimeout(r, ms))

const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {}
const save = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1))

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      if (r.ok) return await r.json()
      if (r.status === 429) await sleep(4000)
    } catch (e) {
      await sleep(1500)
    }
  }
  return null
}

// ── the places ────────────────────────────────────────────────────────────
const src = fs.readFileSync(path.join(WWN, 'src/data/letters.js'), 'utf8')
const labels = [...src.matchAll(/label:'((?:[^'\\]|\\.)*)'/g)].map(m =>
  m[1].replace(/\\'/g, "'")
)
const clean = l =>
  l
    .replace(/\s*\((?:false colour|2)[^)]*\)\s*/gi, '')
    .replace(/\s*\(\d\)\s*/, '')
    .trim()
const places = [...new Set(labels.map(clean))].sort()
console.log(`${places.length} unique places`)

// ── 1. geocode ────────────────────────────────────────────────────────────
// Nominatim asks for at most one request a second, so this is the slow part.
for (const p of places) {
  const key = `geo:${p}`
  if (cache[key] !== undefined) continue
  const q = encodeURIComponent(p.replace(/&/g, 'and'))
  const j = await getJSON(
    `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`
  )
  cache[key] = j && j[0] ? { lat: +j[0].lat, lng: +j[0].lon, osm: j[0].display_name } : null
  console.log(cache[key] ? `  ✓ ${p}` : `  · ${p} (not found)`)
  save()
  await sleep(1150)
}

const located = places.filter(p => cache[`geo:${p}`])
console.log(`geocoded ${located.length}/${places.length}`)

// ── 2. elevation, on a grid ───────────────────────────────────────────────
// A single spot height says little. A 5x5 grid across roughly 20 km gives the
// local relief, which is what separates a floodplain from a mountain front.
const SPAN = 0.09 // degrees, about 10 km at the equator
const todo = located.filter(p => cache[`elev:${p}`] === undefined)
for (let i = 0; i < todo.length; i += 4) {
  const batch = todo.slice(i, i + 4)
  const pts = []
  for (const p of batch) {
    const { lat, lng } = cache[`geo:${p}`]
    for (let a = -2; a <= 2; a++) {
      for (let b = -2; b <= 2; b++) {
        pts.push(`${(lat + (a * SPAN) / 2).toFixed(4)},${(lng + (b * SPAN) / 2).toFixed(4)}`)
      }
    }
  }
  const j = await getJSON(
    `https://api.opentopodata.org/v1/srtm90m?locations=${pts.join('|')}`
  )
  if (j && j.results) {
    batch.forEach((p, k) => {
      const vals = j.results
        .slice(k * 25, k * 25 + 25)
        .map(r => (r && typeof r.elevation === 'number' ? r.elevation : null))
        .filter(v => v !== null)
      cache[`elev:${p}`] = vals.length
        ? {
            min: Math.min(...vals),
            max: Math.max(...vals),
            mean: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
            n: vals.length,
          }
        : null
    })
  } else {
    batch.forEach(p => (cache[`elev:${p}`] = null))
  }
  save()
  console.log(`  elevation ${Math.min(i + 4, todo.length)}/${todo.length}`)
  await sleep(1100)
}

// ── 3. bedrock ────────────────────────────────────────────────────────────
for (const p of located) {
  const key = `lith:${p}`
  if (cache[key] !== undefined) continue
  const { lat, lng } = cache[`geo:${p}`]
  const j = await getJSON(
    `https://macrostrat.org/api/v2/geologic_units/map?lat=${lat}&lng=${lng}`
  )
  const u = j?.success?.data?.[0]
  cache[key] = u
    ? {
        name: u.name || '',
        lith: u.lith || '',
        color: u.color || '',
        top: u.t_age ?? null,
        bottom: u.b_age ?? null,
        era: u.best_int_name || '',
      }
    : null
  save()
  await sleep(220)
}
console.log('bedrock done')

// ── 4. bake ───────────────────────────────────────────────────────────────
const out = {}
for (const p of places) {
  const geo = cache[`geo:${p}`]
  if (!geo) continue
  const e = cache[`elev:${p}`]
  const l = cache[`lith:${p}`]
  out[p] = {
    lat: +geo.lat.toFixed(3),
    lng: +geo.lng.toFixed(3),
    ...(e ? { elev: e.mean, relief: e.max - e.min } : {}),
    ...(l && l.lith ? { lith: l.lith, era: l.era, unit: l.name } : {}),
  }
}

const body = `/**
 * Real geology for the Landsat scenes, harvested once and baked in.
 *
 * Keyed by the scene label in letters.js. \`relief\` is the spread of SRTM
 * elevations over roughly a 10 km grid around the point — the number that
 * separates a floodplain from a mountain front — and \`lith\` is the bedrock
 * Macrostrat reports there.
 *
 * Sources: Nominatim (OSM, ODbL), OpenTopoData/SRTM, Macrostrat (CC-BY 4.0).
 * Regenerate with scripts/harvest-geo.mjs.
 */
export const GEOLOGY = ${JSON.stringify(out, null, 1)}
`
fs.writeFileSync(OUT, body)
console.log(`wrote ${OUT} — ${Object.keys(out).length} places`)

const withLith = Object.values(out).filter(v => v.lith).length
const withElev = Object.values(out).filter(v => v.relief !== undefined).length
console.log(`  lithology: ${withLith}   elevation: ${withElev}`)
