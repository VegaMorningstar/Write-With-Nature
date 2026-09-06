/**
 * Regenerates src/data/letters.js from whatever is in images/.
 *
 * Existing labels are kept verbatim — they were written by hand and read better
 * than anything derivable. Only new files get a label derived from the filename,
 * which is where NASA encodes the location.
 */
const fs = require('fs')
const path = require('path')

const ROOT = process.argv[2]
const IMAGES = path.join(ROOT, 'images')
const DATA = path.join(ROOT, 'src/data/letters.js')

// ── Keep the labels we already have ────────────────────────────────────────
const existing = {}
{
  const src = fs.readFileSync(DATA, 'utf8')
  // Both quote styles: a label containing an apostrophe (N'Djamena) is written
  // with double quotes, and missing those silently re-derives a good label.
  const re = /u\('([^']+)','([^']+)'\),label:(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g
  let m
  while ((m = re.exec(src))) {
    existing[`${m[1]}/${m[2]}`] = (m[3] ?? m[4]).replace(/\\(['"])/g, '$1')
  }
}

// Words that should not be title-cased when a camel-case run is split
const LOWER = new Set(['of', 'and', 'the', 'de', 'do', 'da'])
// NASA's own spellings that are worth correcting in user-facing text
const FIXES = {
  Hudsan: 'Hudson',
  Mozmbique: 'Mozambique',
  Consensus: 'Conesus',
  Kyrgystan: 'Kyrgyzstan',
  Columbia: 'Colombia',
  Golmund: 'Golmud',
}

const splitCamel = s =>
  s.replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1 $2')
    .replace(/([A-ZÀ-Þ]+)([A-ZÀ-Þ][a-zà-ÿ])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map(w => FIXES[w] || w)
    .map((w, i) => (i > 0 && LOWER.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(' ')

function deriveLabel(key, file) {
  let stem = file.replace(/\.(png|webp)$/i, '')
  // Strip the "<key>-<index>-" or "<key>-" prefix NASA uses for ordering
  const k = key.toLowerCase()
  stem = stem.replace(new RegExp(`^${k}-\\d+-`, 'i'), '').replace(new RegExp(`^${k}-`, 'i'), '')

  // Band suffix: these are the same scene rendered in false colour
  let band = ''
  const bm = stem.match(/-(NIR|SWIR)$/i)
  if (bm) {
    band = ` (false colour, ${bm[1].toUpperCase()})`
    stem = stem.slice(0, bm.index)
  }

  const parts = stem.split('-')
    .map(splitCamel)
    .map(p => p.trim())
    .filter(Boolean)
    // The existing labels name a US state without also naming the country
    .filter(p => !/^(USA|US)$/i.test(p))
    .map(p => (p === p.toLowerCase() ? p.replace(/\b\w/g, c => c.toUpperCase()) : p))

  return parts.join(', ') + band
}

// ── Read the library ───────────────────────────────────────────────────────
const keys = fs.readdirSync(IMAGES).filter(k => /^[A-Z0-9]$/.test(k)).sort()
const out = {}
let derived = 0
for (const key of keys) {
  const files = fs.readdirSync(path.join(IMAGES, key))
    .filter(f => f.endsWith('.webp'))
    .map(f => f.replace(/\.webp$/, '.png'))
    .sort()
  out[key] = files.map(file => {
    const label = existing[`${key}/${file}`]
    if (label === undefined) derived++
    return { file, label: label ?? deriveLabel(key, file), isNew: label === undefined }
  })

  // NASA ships the same scene name twice under a key often enough to matter —
  // two Regina crops, two Paw Paw Bends. Number the repeats so the tooltip can
  // tell them apart.
  const seen = new Map()
  for (const e of out[key]) {
    const n = (seen.get(e.label) || 0) + 1
    seen.set(e.label, n)
    if (n > 1) e.label = `${e.label} (${n})`
  }
}

if (process.argv[3] === '--preview') {
  for (const key of keys) {
    const fresh = out[key].filter(e => e.isNew)
    if (fresh.length) console.log(key + ': ' + fresh.map(e => e.label).join(' | '))
  }
  console.log(`\n${derived} new entries, ${Object.values(out).flat().length} total`)
  process.exit(0)
}

// ── Emit ───────────────────────────────────────────────────────────────────
const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
const body = keys.map(key =>
  `  ${/^[0-9]$/.test(key) ? `'${key}'` : key}:[` +
  out[key].map(e => `{url:u('${key}','${e.file}'),label:'${esc(e.label)}'}`).join(',') +
  '],').join('\n')

const header = `const BASE = import.meta.env.BASE_URL

const u = (letter, file) =>
  \`\${BASE}images/\${letter}/\${file.replace('.png', '.webp')}\`

/**
 * NASA's 'Your Name in Landsat' library — real Landsat 8 & 9 scenes where the
 * surface happens to look like a character, keyed by the character it forms.
 *
 * Digits are in here as well as letters: the gallery gained numerals in its 2026
 * refresh, so a date or a house number can be written the same way a word can.
 *
 * Several scenes appear more than once under the same key, as false-colour
 * renderings of the same ground — NIR and SWIR pick out vegetation and water
 * that the natural-colour version flattens, and they read as genuinely
 * different tiles. Clicking a tile cycles the variants.
 *
 * Generated from images/ by scripts/gen_letters.cjs; hand-written labels are
 * preserved on regeneration, so editing one here survives.
 */
export const LETTERS = {
`

fs.writeFileSync(DATA, header + body + '\n}\n\nexport const TITLE_LINES = [\'WRITE WITH\', \'NATURE\']\n')
console.log(`wrote ${Object.values(out).flat().length} entries across ${keys.length} keys (${derived} new)`)
