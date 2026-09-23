/**
 * strata — what is under each scene.
 *
 * A single sediment palette for every block was a lie: a drowned shelf does
 * not look like a mountain front. This builds a stratigraphic column per
 * scene, from two sources.
 *
 * First, real data, harvested per place into data/geology.js — the bedrock
 * Macrostrat reports there, and the spread of SRTM elevations over the
 * surrounding 10 km, which is the number that tells a floodplain from a
 * mountain range. Second, when a place could not be located, statistics read
 * off the satellite image itself: how much of it is water, and how much of its
 * contrast is real landform rather than speckle.
 *
 * The column carries not just colours but the character of the bedding — how
 * steeply it dips, how hard it is folded, and how far it arches to follow the
 * ground above it.
 */

import { GEOLOGY } from '../data/geology'

export const MAX_BEDS = 10

/** Strip the false-colour suffixes so a label matches the harvested key. */
export function placeKey(label = '') {
  return label
    .replace(/\s*\((?:false colour|2)[^)]*\)\s*/gi, '')
    .replace(/\s*\(\d\)\s*/, '')
    .trim()
}

const hex = h => {
  const n = parseInt(h.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/* ── the archetypes ───────────────────────────────────────────────────────
   Bottom of the column first. `dip` tilts the whole stack, `fold` buckles it,
   `conform` is how far the beds arch to follow the surface relief, and
   `grain` is how coarse the rock reads. */
const COLUMNS = {
  // Drowned shelf: fine muds below, shelly sands above, and dead flat, because
  // nothing has ever pushed it.
  marine: {
    beds: ['#2b3742', '#3f4e57', '#5c6b6c', '#7f8d84', '#a9ae99', '#cbc6ab'],
    dip: 0.02, fold: 0.1, conform: 0.05, grain: 0.35,
  },
  // Deltas and coastal plains: many thin interbeds of sand and silt.
  coast: {
    beds: ['#5f5748', '#7b6f59', '#9c8d70', '#b9a683', '#d0bd97', '#e2d3b0'],
    dip: 0.03, fold: 0.14, conform: 0.12, grain: 0.4,
  },
  // Braided rivers: gravel at the base, cross-bedded sand, silt caps. Beds are
  // lenticular, so the boundaries wander more than a marine section's.
  floodplain: {
    beds: ['#544c3f', '#7d6f55', '#a58f6a', '#c2ad83', '#d6c69c', '#c7b994'],
    dip: 0.03, fold: 0.3, conform: 0.18, grain: 0.6,
  },
  // Arid basins: thick red sandstone with pale evaporite bands.
  desert: {
    beds: ['#6f3a28', '#9a5336', '#bd7548', '#d5945f', '#e6b783', '#f0d3a4'],
    dip: 0.05, fold: 0.16, conform: 0.1, grain: 0.5,
  },
  // Folded cover on a mountain front: alternating limestone and shale, dipping
  // hard and buckled.
  montane: {
    beds: ['#42434b', '#615f60', '#837c6e', '#a2977f', '#6a655e', '#b0a389'],
    dip: 0.2, fold: 0.42, conform: 0.5, grain: 0.55,
  },
  // Crystalline basement: no bedding worth the name, a mottled mass with a
  // thin cover on top.
  basement: {
    beds: ['#2f2e36', '#403f49', '#524b57', '#655c66', '#8a7d69', '#ab9c80'],
    dip: 0.1, fold: 0.5, conform: 0.4, grain: 0.85,
  },
  // Stacked lava flows, each with a baked red soil at its top.
  volcanic: {
    beds: ['#26262a', '#333338', '#6b4630', '#2e2e34', '#414149', '#7a5138'],
    dip: 0.06, fold: 0.18, conform: 0.2, grain: 0.7,
  },
  // Unsorted till over scoured rock.
  glacial: {
    beds: ['#3f464d', '#5c666e', '#7d868d', '#9ea6a7', '#bcc0bc', '#d2d3cd'],
    dip: 0.04, fold: 0.22, conform: 0.3, grain: 0.9,
  },
}

const has = (s, ...words) => words.some(w => s.includes(w))

// Warm ground with nothing growing on it. Both halves matter: a green
// floodplain can be faintly warm, and a bright playa is barely warm at all.
const dry = stats => stats.arid > 0.45 && (stats.green ?? 0) < 0.28

/**
 * Pick an archetype. Real bedrock decides it where we have it; relief and the
 * image's own statistics decide it where we do not.
 */
function classify(geo, stats) {
  const lith = (geo?.lith || '').toLowerCase()
  const relief = geo?.relief
  const elev = geo?.elev

  // Ice reads the same whatever is under it, and it is what you actually see.
  if (stats.ice > 0.45) return 'glacial'

  if (lith) {
    if (has(lith, 'basalt', 'volcanic', 'andesit', 'tholeiite', 'tuff', 'lava', 'basanite'))
      return 'volcanic'

    if (has(lith, 'intrusive', 'granit', 'plutonic', 'gneiss', 'schist', 'metamorphic',
                  'metasediment', 'metavolcanic', 'crystalline', 'greenschist'))
      return relief !== undefined && relief < 250 ? 'floodplain' : 'basement'

    if (has(lith, 'gypsum', 'salt', 'evaporite')) return 'desert'

    // Loose cover rather than rock. Checked before the generic sedimentary
    // case, and 'sandstone' deliberately does not count as sand.
    const loose =
      has(lith, 'alluvium', 'peat', 'laterite') ||
      (has(lith, 'clay') && has(lith, 'silt')) ||
      lith.trim() === 'gravel'
    if (loose) return elev !== undefined && elev < 25 ? 'coast' : 'floodplain'

    if (has(lith, 'limestone', 'dolostone', 'dolomit', 'carbonate')) return 'montane'

    if (has(lith, 'sedimentary', 'sandstone', 'shale', 'siltstone', 'mudstone', 'coal')) {
      if (relief !== undefined) {
        if (relief > 900) return 'montane'
        if (relief > 320) return dry(stats) ? 'desert' : 'montane'
      }
      if (dry(stats)) return 'desert'
      if (elev !== undefined && elev < 40) return 'coast'
      return 'floodplain'
    }
  }

  if (elev !== undefined && elev < 20 && stats.water > 0.3) return 'marine'
  if (relief !== undefined) {
    if (relief > 900) return 'montane'
    if (relief > 320) return dry(stats) ? 'desert' : 'montane'
    if (elev !== undefined && elev < 40) return 'coast'
  }

  // No usable record: fall back to what the scene looks like. Ruggedness is
  // checked before the water test, because a fjord is most of the way to being
  // water and is still a mountain range.
  if (stats.structure > 0.78) return 'montane'
  if (stats.water > 0.42) return 'marine'
  if (dry(stats)) return 'desert'
  return 'floodplain'
}

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Build the column for one scene.
 *
 * @param {string} label  the scene label from letters.js
 * @param {object} stats  {water, ice, arid, structure} read off the image
 * @returns {{beds:number[][], bounds:number[], dip:number, fold:number,
 *            conform:number, grain:number, kind:string, source:string}}
 */
export function columnFor(label, stats) {
  const key = placeKey(label)
  const geo = GEOLOGY[key]

  // In a false-colour rendering, vegetation comes out red. Read literally, a
  // forest then looks like the most arid ground in the library — Lake
  // Waccamaw in NIR scored higher on it than Black Rock Desert does. The
  // label says which scenes those are, so on those the colour cues are simply
  // set aside and the real record decides.
  const falseColour = /false colour/i.test(label)
  const seen = falseColour ? { ...stats, arid: 0, green: 0.5 } : stats

  const kind = classify(geo, seen)
  const arch = COLUMNS[kind]

  let seed = hash(key || kind)
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  // Beds of uneven thickness. A column of equal stripes reads as a chart, not
  // as rock; real sections are a few thick units with thin partings between.
  const n = arch.beds.length
  const w = []
  let total = 0
  for (let i = 0; i < n; i++) {
    const t = 0.45 + rnd() * 1.4
    w.push(t)
    total += t
  }
  const bounds = [0]
  let acc = 0
  for (let i = 0; i < n - 1; i++) {
    acc += w[i] / total
    bounds.push(acc)
  }

  // Steeper ground means harder deformation, which is true enough to be worth
  // using: relief is the best single hint at how much the beds have been bent.
  const relief = geo?.relief ?? seen.structure * 700
  const tectonic = Math.min(1, relief / 1400)

  return {
    kind,
    source: geo ? (geo.lith ? 'bedrock' : 'elevation') : 'image',
    place: key,
    lith: geo?.lith || '',
    era: geo?.era || '',
    relief: geo?.relief,
    elev: geo?.elev,
    beds: arch.beds.map(hex),
    bounds,
    dip: arch.dip * (0.6 + tectonic) * (rnd() < 0.5 ? -1 : 1),
    fold: arch.fold * (0.55 + tectonic * 0.9),
    conform: arch.conform,
    grain: arch.grain,
  }
}
