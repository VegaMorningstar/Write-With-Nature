/**
 * The sky's appearance at a moment of the transition.
 *
 * Deliberately plain JavaScript with no React and no DOM: it takes numbers and
 * returns a CSS gradient string. That is so it can be run and checked outside a
 * browser. The previous version of this lived inside the component, and the
 * script that "verified" it re-derived the colours itself rather than calling
 * it — which proved the idea was sound while the shipped code was throwing on
 * every dark-to-light transition. A pure module is the difference between
 * testing the maths and testing what runs.
 *
 * What moves here is not only colour but position. A sunset is a front: the
 * blue comes down from the top and the fire is pushed ahead of it into the
 * horizon until there is no room left and it is gone. A sunrise is the same
 * front running the other way. Interpolating five stops in place, which is
 * what this did first, gives a screen that changes hue all at once — there is
 * no edge anywhere, so nothing reads as moving.
 */

/** The theme's own background, which is where the whole sky ends up. */
const NIGHT = '#050814'

// ── Dusk, top of the sky to the horizon ─────────────────────────────────────
//
// Eight stops rather than five, and the extra three are all in the blue.
// A single blue stop makes the whole upper sky one flat colour, which is the
// thing that read as a coloured panel rather than as depth — real sky gets
// lighter toward the horizon the entire way down, long before any sunset
// colour starts.
const DUSK_TOP = '#12365f'     // overhead, the darkest blue
const DUSK_BLUE = '#2f6ba8'    // midway down
const DUSK_INDIGO = '#465a96'  // just above the front, where blue turns
//
// And the fire is a ramp, not a colour. Blue straight into red is a
// straight line between two hues that are nearly opposite, so it passes
// through the desaturated middle and arrives as brown — which is why the
// in-between colours were not showing. Violet and magenta are the path
// around the outside of that, and they are what a sunset actually does.
const DUSK_VIOLET = '#7d4a8e'
const DUSK_MAGENTA = '#b8455f'
const DUSK_RED = '#d2553c'
const DUSK_ORANGE = '#f0863c'
const DUSK_YELLOW = '#ffd27f'

// ── Dawn ────────────────────────────────────────────────────────────────────
const DAWN_DEEP = '#1d3a66'    // the night thinning overhead
const DAWN_INDIGO = '#4e6ea8'  // the band under it
const DAWN_BLUE = '#8fbce8'    // first light
/** The sun's own colours, which arrive with it rather than before it. */
const DAWN_VIOLET = '#a4629a'
const DAWN_RED = '#d9603f'
const DAWN_ORANGE = '#ff9a4e'
const DAWN_YELLOW = '#ffe6b0'
/** Near the paper background, so the overlay's last frame is almost the page. */
const DAY_MID = '#d8d0b8'

const cache = new Map()
function rgbOf(hex) {
  let v = cache.get(hex)
  if (!v) {
    v = [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ]
    cache.set(hex, v)
  }
  return v
}

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Mixes two colours, each either a hex string or an already-mixed triple. */
function mix(a, b, k) {
  const A = typeof a === 'string' ? rgbOf(a) : a
  const B = typeof b === 'string' ? rgbOf(b) : b
  const t = clamp01(k)
  return [
    Math.round(A[0] + (B[0] - A[0]) * t),
    Math.round(A[1] + (B[1] - A[1]) * t),
    Math.round(A[2] + (B[2] - A[2]) * t),
  ]
}

const css = c => `rgb(${c[0]},${c[1]},${c[2]})`

/**
 * Stops must not run backwards, or the browser silently snaps them and the
 * front stops moving. Clamped into range and forced upward in order.
 */
function orderStops(stops) {
  let last = -20
  return stops.map(([pos, colour]) => {
    const p = Math.max(last, Math.min(125, pos))
    last = p
    return `${css(colour)} ${p.toFixed(1)}%`
  })
}

/**
 * `f` carries the eased phase values: `front` is how far the sky's leading edge
 * has travelled, `warm` how present the fire is, `day` how far the dawn has
 * opened out into morning.
 *
 * Fronts overshoot 100 on purpose. A front that stops exactly at the bottom
 * leaves a sliver of the colour it was pushing still visible at the last pixel;
 * running it to 118 pushes that off the screen.
 */
export function skyGradient(toDark, f) {
  return toDark ? duskGradient(f) : dawnGradient(f)
}

function duskGradient(f) {
  const front = f.front * 125

  // The blue darkens as it grows, so the top of the screen is already night by
  // the time the front reaches the bottom. Each band darkens a little less
  // than the one above it, which keeps the blue a gradient the whole way down
  // instead of collapsing to one flat tone as it deepens.
  const dk = Math.min(1, f.front * 1.15)
  const top = mix(DUSK_TOP, NIGHT, dk)
  const upper = mix(DUSK_BLUE, NIGHT, dk * 0.95)
  const indigo = mix(DUSK_INDIGO, NIGHT, dk * 0.85)

  // The fire fades toward night rather than toward transparent: it has to be
  // able to disappear while still being the thing under the front.
  const violet = mix(NIGHT, DUSK_VIOLET, f.warm)
  const magenta = mix(NIGHT, DUSK_MAGENTA, f.warm)
  const red = mix(NIGHT, DUSK_RED, f.warm)
  const orange = mix(NIGHT, DUSK_ORANGE, f.warm)
  const yellow = mix(NIGHT, DUSK_YELLOW, f.warm)

  // The blue stops are spread across everything above the front rather than
  // pinned near it, so the upper sky is a ramp at every moment of the descent.
  // The warm stops trail the front at fixed distances, so the whole sunset
  // moves down as one thing.
  return `linear-gradient(to bottom, ${orderStops([
    [0, top],
    [front * 0.38, upper],
    [front - 16, indigo],
    [front - 1, violet],
    [front + 14, magenta],
    [front + 28, red],
    [Math.max(front + 42, 82), orange],
    [100, yellow],
  ]).join(', ')})`
}

function dawnGradient(f) {
  // Travels the other way: the leading edge starts at the bottom of the screen
  // and climbs.
  const front = 100 - f.front * 125

  // The night thins from the top as the light comes up under it, so the dark
  // part is a gradient too rather than a flat cap.
  const night = mix(NIGHT, DAWN_DEEP, f.front * 0.5)
  const indigo = mix(NIGHT, DAWN_INDIGO, Math.min(1, f.front * 1.1))
  const blue = DAWN_BLUE

  // The warm band only exists once the sun is on its way up, and it sits below
  // the blue rather than replacing it — through violet again, for the same
  // reason as dusk.
  const violet = mix(blue, DAWN_VIOLET, f.warm)
  const red = mix(blue, DAWN_RED, f.warm)
  const orange = mix(blue, DAWN_ORANGE, f.warm)
  const yellow = mix(blue, DAWN_YELLOW, f.warm)

  // Everything then opens out into daylight. Applied last and to every stop,
  // so the sky arrives at the page's own colour rather than clearing off it.
  const day = c => mix(c, DAY_MID, f.day)

  return `linear-gradient(to bottom, ${orderStops([
    [0, day(night)],
    [Math.min(front - 30, 34), day(night)],
    [front - 12, day(indigo)],
    [front + 6, day(blue)],
    [Math.max(front + 24, 62), day(violet)],
    [Math.max(front + 38, 78), day(red)],
    [91, day(orange)],
    [100, day(yellow)],
  ]).join(', ')})`
}

/**
 * The mask that makes the stars arrive and leave in a direction rather than
 * all at once.
 *
 * Returns stops for a vertical gradient used as `destination-in`, so it is
 * alpha only: stars survive where this is opaque. Dusk fills them in from the
 * top, against the part of the sky that has already gone dark, which is the
 * only place they would be visible anyway. Dawn erases them from the bottom,
 * ahead of the light coming up.
 */
export function starMask(toDark, f) {
  // Where the boundary is, as a fraction of the screen. Both directions keep
  // stars above the line and clear them below it; only which way it travels
  // and which end it starts from differ.
  const line = toDark ? f.stars : 1 - f.stars
  const FEATHER = 0.18
  const a = Math.max(0, line - FEATHER)
  return [
    [0, 1],
    [a, 1],
    [Math.min(1, line + FEATHER * 0.35), 0],
    [1, 0],
  ]
}
