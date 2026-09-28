/**
 * The map's own two themes.
 *
 * OpenFreeMap serves ready-made styles — positron is pale, dark is near-black
 * — and either would do if the page were grey. It is not: the light theme is
 * printed on beige paper and the dark one is a night sky, and a stock basemap
 * dropped between those panels looks like a screenshot of a different website.
 * So the served style is taken as a starting point and recoloured here, from
 * the same handful of colours index.css uses.
 *
 * Recoloured rather than authored. A style is ~50 layers of roads, landuse,
 * boundaries and labels at a dozen zoom levels each, and writing that by hand
 * to control six colours would be a lot of surface to own. Instead the layers
 * are sorted by what they are — from their ids, which OpenFreeMap names
 * plainly — and each kind is given a colour from the palette below.
 *
 * No key and no account: OpenFreeMap's public instance asks for neither, and
 * sets no limit on views. Their attribution is required and is rendered by the
 * map component.
 */

/** Where the base styles come from. Fetched once per theme and cached. */
const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

export const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · ' +
  '<a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

/**
 * The palettes, in the same colours as the page.
 *
 * `land` matches --paper exactly so the map reads as the same sheet the panels
 * are on rather than as a window cut into it. Everything else is a step away
 * from that: water furthest, because it is the thing the eye should find
 * first at a glance, then the built-up ground, then the roads.
 */
const PALETTE = {
  light: {
    land: '#d9cdb4',        // --paper
    water: '#a9bdb4',       // --teal, lifted most of the way to the paper
    waterLine: '#9ab0a6',
    green: '#cdc5a4',       // parks and wood: a hint greener than the ground
    ice: '#e8e2d2',
    built: '#d0c3a7',       // --paper2-ish, cities as a faint darkening
    building: '#c8bb9e',
    road: '#cbbd9f',
    roadMinor: '#d3c6aa',
    boundary: '#a89b7d',
    label: '#5f5945',       // --ink, lightened enough to sit quietly on beige
    labelHalo: '#e4dac4',
    waterLabel: '#6c8177',
  },
  dark: {
    land: '#050814',        // --paper
    water: '#0d1430',       // deep navy, a clear step up from the land
    waterLine: '#16204a',
    green: '#08101c',
    ice: '#141b2e',
    built: '#0a0f1f',
    building: '#111a30',
    road: '#18203a',
    roadMinor: '#101830',
    boundary: '#2a3354',
    label: '#8e96b4',
    labelHalo: '#050814',
    waterLabel: '#6d7cae',
  },
}

/**
 * Which palette entry a layer should take, from its id.
 *
 * Ordered, first match wins: `landcover_ice_shelf` has to be tested for ice
 * before the generic landcover rule claims it. Anything unrecognised is left
 * exactly as the served style had it, so a new layer upstream degrades to
 * looking slightly off rather than disappearing.
 */
const KIND = [
  [/^background$/, 'land'],
  [/water_name|waterway_line_label/, 'waterLabelText'],
  [/^water$|^waterway$|ocean/, 'water'],
  [/ice_shelf|glacier/, 'ice'],
  [/park|wood|forest|grass|landcover/, 'green'],
  [/building/, 'building'],
  [/landuse|residential|urban/, 'built'],
  [/boundary|admin/, 'boundary'],
  [/motorway|trunk|primary|highway_major|aeroway/, 'road'],
  [/road|highway|street|path|pier|rail/, 'roadMinor'],
  [/label|place_|name/, 'labelText'],
]

const kindOf = id => KIND.find(([re]) => re.test(id))?.[1] ?? null

/**
 * Paint one layer in the palette.
 *
 * Only the colour properties are touched. Widths, dashes, zoom stops and the
 * data expressions that drive them are the served style's business and are
 * left alone — they are what make the map legible as you zoom, and they are
 * not what makes it look like someone else's site.
 */
function paint(layer, p) {
  const kind = kindOf(layer.id)
  if (!kind) return layer
  const next = { ...layer, paint: { ...layer.paint } }

  if (kind === 'labelText' || kind === 'waterLabelText') {
    next.paint['text-color'] = kind === 'waterLabelText' ? p.waterLabel : p.label
    next.paint['text-halo-color'] = p.labelHalo
    next.paint['text-halo-width'] = 1.1
    // Icons in the served styles are a sprite we are not restyling, and a
    // stock pin or shield is exactly the foreign note this is avoiding.
    if (next.layout?.['icon-image']) {
      next.layout = { ...next.layout, 'icon-image': '' }
    }
    return next
  }

  const colour = p[kind]
  if (layer.type === 'background') next.paint['background-color'] = colour
  if (layer.type === 'fill') {
    next.paint['fill-color'] = colour
    if ('fill-outline-color' in next.paint) next.paint['fill-outline-color'] = colour
  }
  if (layer.type === 'line') next.paint['line-color'] = kind === 'water' ? p.waterLine : colour
  return next
}

const cache = new Map()

/**
 * The finished style for a theme, ready to hand to MapLibre.
 *
 * Cached per theme: switching back and forth should not re-fetch a style that
 * has not changed, and the two together are under 50KB.
 */
export async function mapStyle(themeName) {
  const name = themeName === 'dark' ? 'dark' : 'light'
  if (cache.has(name)) return cache.get(name)

  const res = await fetch(STYLE_URL[name])
  if (!res.ok) throw new Error(`basemap style ${name}: HTTP ${res.status}`)
  const style = await res.json()
  const p = PALETTE[name]

  const out = {
    ...style,
    layers: style.layers.map(l => paint(l, p)),
    // Ours to state, and it has to be on screen: OpenFreeMap ask for it and
    // OpenStreetMap's licence requires it.
    sources: Object.fromEntries(
      Object.entries(style.sources).map(([k, v]) => [k, { ...v, attribution: ATTRIBUTION }])
    ),
  }
  cache.set(name, out)
  return out
}

/** The land colour, for the panel to sit on while the style is still loading. */
export const landColour = name => PALETTE[name === 'dark' ? 'dark' : 'light'].land
