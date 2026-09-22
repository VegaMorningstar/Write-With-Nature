/**
 * The theme, and the tokens a CSS variable cannot carry.
 *
 * Most of a theme is colour, and colour belongs in index.css as custom
 * properties under `:root[data-theme="dark"]`. This file exists for the part
 * that does not fit there:
 *
 *   1. Canvas and WebGPU code cannot read a CSS variable. The glass shader
 *      samples a texture, so the page background is repainted into a canvas
 *      every frame — and that painter needs the paper colour as a string.
 *   2. Blend modes are not colours. `multiply` against beige paper is what
 *      makes the fluid cursor read as pigment soaking in; against black it is
 *      multiplication by zero, which annihilates the colour rather than
 *      dimming it. The dual, `screen`, reduces to the source on black. No
 *      value in a CSS variable can express that switch, because the operation
 *      itself has to change.
 *
 * Why this is centralised rather than edited in place: the fluid blend had
 * FIVE independent hardcoded copies — the real canvas in FluidCursor, and one
 * in each of the four glass backdrops. They were found three at a time, and
 * each time the ones left behind refracted a fluid annihilated to black while
 * the page around them showed it correctly. Anything read from here cannot
 * drift like that.
 *
 * Reading: `tokens()` is an object lookup, cheap enough to call inside a
 * per-frame repaint, which is also what makes those repaints react to a theme
 * change on their own. Anything that caches instead — React state, a shader
 * uniform — should subscribe with `onThemeChange`.
 */

/**
 * Everything the theme touches, and where.
 *
 * Kept here because the surface is wider than it looks, and the failures are
 * all the same failure: one half of a pair changed and the other not.
 *
 *   index.html          sets data-theme before first paint. Light by default;
 *                       only this and ?theme= ever select dark.
 *   src/index.css       :root is light, :root[data-theme="dark"] overrides.
 *                       Colour, --blend-overlay, and the dark-only rules for
 *                       the body background, the grain, and the text that
 *                       needed lifting off black.
 *   this file           the tokens a CSS variable cannot carry: a colour the
 *                       canvas needs as a string, blend modes, and the flags
 *                       below.
 *
 * Consumers of the tokens, all reading per frame or per call so a switch lands
 * without invalidation:
 *
 *   liquid-glass/backdrop.js   paperBase, paperGradients, stars, fluidBlend.
 *                              Caches its paper and repaints it when the theme
 *                              it was painted under stops matching.
 *   glass-alphabet/backdrop.js    fluidBlend
 *   glass-celestial/backdrop.js   fluidBlend
 *   glass-title/backdrop.js       fluidBlend
 *   components/FluidCursor.jsx    fluidBlend, via React state and onThemeChange
 *   components/fluidHue.js        fluidHue
 *   glass-buttons/GlassButtons.jsx buttonGlyph
 *   cursor-butterflies/follow.ts   cursorCreature
 *   night-sky/NightSky.jsx         stars
 *   components/Header.jsx          the sun/moon jelly, which asks for a switch
 *   theme-transition/transition.js the only caller of setTheme for that jelly.
 *                                  Header no longer calls it directly: pressing
 *                                  the ornament starts a sunset, and the theme
 *                                  changes part-way through it, under cover.
 *                                  NIGHT_PAPER below is shared with its sky.
 *
 * There are FOUR glass backdrops, not three. Every one of them repaints the
 * page for a shader that cannot read the DOM, and every one of them needs the
 * fluid blend. The masthead's was missed twice.
 */

/**
 * What `:root` in index.css renders as with no [data-theme] attribute set.
 *
 * This MUST match the CSS, and it is not the app's default theme — the inline
 * script in index.html chooses that and writes the attribute before first
 * paint. The two are different things and conflating them is a real bug: when
 * this fell back to 'dark' while the CSS base was light, any load where the
 * attribute went missing rendered a beige page with black glass panels, each
 * half obeying a different default. The attribute can go missing for dull
 * reasons — a service worker serving a stale index.html is the likely one,
 * since the shell is cached and the script lives in that file.
 *
 * So: degrade to whatever the stylesheet degrades to, and let the attribute be
 * the only thing that ever selects dark.
 */
const CSS_BASE_THEME = 'light'

/**
 * The night sky's background, named because more than one place needs it.
 *
 * It is `--paper` under [data-theme="dark"] in index.css, it is this theme's
 * paperBase for the canvas that the glass refracts, and it is where the
 * theme-transition's sunset has to end up — a sky that cooled to a slightly
 * different black than the page it uncovers would show its own edge as it
 * cleared. Exported so that third one reads it rather than keeping a copy.
 */
export const NIGHT_PAPER = '#050814'

const THEMES = {
  light: {
    // Must equal --paper in index.css. The glass refracts this canvas, not the
    // DOM, so a disagreement shows up as panels glowing a colour the page does
    // not have.
    paperBase: '#d9cdb4',
    // Ink on paper: the fluid can only ever darken what is behind it.
    fluidBlend: 'multiply',
    // The five coloured washes across the page. They read as weathered paper
    // over beige; over black the same colours turn into a muddy grading with
    // nothing to sit on.
    paperGradients: true,
    stars: false,
    // The browser chrome's colour on mobile. Not a CSS variable: it lives in a
    // <meta> tag, which setTheme below rewrites.
    themeColor: '#2d4a1e',
    // An additive glow on beige paper is all but invisible, so paper keeps the
    // butterflies. See src/cursor-butterflies/follow.ts.
    cursorCreature: 'butterfly',
    // The full hue wheel, as the fluid library ships. Green among foliage
    // greens on paper is where it belongs; it was only ever wrong at night.
    fluidHue: 'full',
    // null leaves the glass buttons' adaptive ink alone: dark glyphs, lightened
    // only where the backdrop behind them is bright.
    buttonGlyph: null,
    // The sheet's pager and close buttons pick their own ink; null leaves them
    // to it. See src/ui-elements/glass-sheet/GlassSheet.jsx.
    sheetInk: null,
  },
  dark: {
    // Not pure black: a trace of blue is the difference between a void and a
    // sky, and it gives the stars something to sit in. Still dark enough to
    // read as black next to anything else on the page. Must match --paper.
    paperBase: NIGHT_PAPER,
    // Light on a dark ground: the fluid adds rather than subtracts.
    fluidBlend: 'screen',
    // Off, so the fluid cursor is the only colour on the page and reads as
    // light in a dark room. Must agree with the body background rule under
    // :root[data-theme="dark"] in index.css — this flag governs the canvas the
    // glass refracts, that rule governs the page itself, and if they disagree
    // the panels refract washes the page no longer has.
    paperGradients: false,
    // Governs the page layer (NightSky) and the sky the glass refracts
    // (paintPaper) together, so a panel cannot show a different sky.
    //
    // The paper grain is off in this theme too, but that is done entirely in
    // CSS — the ::before/::after rule under :root[data-theme="dark"] — because
    // nothing outside CSS ever draws it. A token for it would have no reader.
    stars: true,
    themeColor: '#050814',
    // A blue butterfly with a soft drop shadow on a night sky is a cut-out;
    // a light is what belongs there.
    cursorCreature: 'firefly',
    // See src/components/fluidHue.js.
    fluidHue: 'no-green',
    // Pinned white, which switches the adaptive ink off rather than tuning it.
    // That logic picks dark glyphs over a bright backdrop, and it is right to:
    // on paper the thing behind a button is paper. At night the thing behind
    // it is the fluid cursor, which is bright and coloured and moving — so the
    // glyphs kept turning dark as colour swept under them, and a control that
    // changes legibility depending on where the cursor has been is worse than
    // one that is simply always white. Only the buttons; the masthead glyphs
    // sit over photographs, where adapting is still the right behaviour.
    buttonGlyph: { r: 255, g: 255, b: 255 },
    // White, for the same reason the toolbar glyphs are: the sheet floats over
    // the fluid cursor, and a deep green chevron or a deep red cross on a dark
    // lens over moving colour is unreadable.
    sheetInk: 'rgba(255,255,255,0.96)',
  },
}

let current = CSS_BASE_THEME
const listeners = new Set()

function read() {
  if (typeof document === 'undefined') return CSS_BASE_THEME
  const t = document.documentElement.dataset.theme
  return t === 'light' || t === 'dark' ? t : CSS_BASE_THEME
}

/** The active theme name. */
export function theme() {
  return current
}

/** The active theme's non-CSS tokens. */
export function tokens() {
  return THEMES[current]
}

/**
 * Switch themes. Sets the attribute the CSS keys off, so the colours and these
 * tokens move together rather than one at a time.
 */
/** The <meta> that tints mobile browser chrome. Not reachable from CSS. */
function applyThemeColour(name) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEMES[name].themeColor)
}

export function setTheme(next) {
  if (next !== 'light' && next !== 'dark') return
  document.documentElement.dataset.theme = next
  // The observer below would catch this too, but doing it here means a caller
  // that reads tokens() on the next line sees the new theme rather than the old.
  if (current !== next) {
    current = next
    applyThemeColour(current)
    for (const fn of listeners) fn(current)
  }
}

/** Subscribe to theme changes. Returns an unsubscribe. */
export function onThemeChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

if (typeof document !== 'undefined') {
  current = read()
  applyThemeColour(current)
  // The attribute is the source of truth, so a change from anywhere — devtools,
  // the inline script in index.html, a future toggle — propagates. Driving the
  // meta tag from here rather than only from setTheme means it follows those
  // too, instead of only the ones that came through this module.
  new MutationObserver(() => {
    const next = read()
    if (next === current) return
    current = next
    applyThemeColour(current)
    for (const fn of listeners) fn(current)
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
}
