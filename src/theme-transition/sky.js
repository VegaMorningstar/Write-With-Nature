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

// ── Dusk ────────────────────────────────────────────────────────────────────
/** Late afternoon, the blue the front starts as before it deepens. */
const DUSK_BLUE = '#3d7ab8'
/** The theme's own background, which is where the whole sky ends up. */
const NIGHT = '#050814'
/** The fire, top of the band to the horizon. */
const DUSK_RED = '#b9432f'
const DUSK_ORANGE = '#ee8038'
const DUSK_YELLOW = '#ffd27f'

// ── Dawn ────────────────────────────────────────────────────────────────────
/** First light, climbing from the horizon. */
const DAWN_BLUE = '#7fb0e4'
/** The sun's own colours, which arrive with it rather than before it. */
const DAWN_RED = '#d9603f'
const DAWN_ORANGE = '#ff9a4e'
const DAWN_YELLOW = '#ffe6b0'
/** Near the paper background, so the overlay's last frame is almost the page. */
const DAY_TOP = '#c9cdc0'
const DAY_BOTTOM = '#e2d6b6'

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
  const front = f.front * 118

  // The blue grows down and darkens as it goes, so the top of the screen is
  // already night by the time the front reaches the bottom.
  const blue = mix(DUSK_BLUE, NIGHT, Math.min(1, f.front * 1.25))

  // The fire fades toward night rather than toward transparent: it has to be
  // able to disappear while still being the thing under the front.
  const red = mix(NIGHT, DUSK_RED, f.warm)
  const orange = mix(NIGHT, DUSK_ORANGE, f.warm)
  const yellow = mix(NIGHT, DUSK_YELLOW, f.warm)

  // The blend across the front is wide on purpose. Narrower than about a fifth
  // of the screen and the boundary stops being a sky and becomes a line with
  // two colours either side of it.
  return `linear-gradient(to bottom, ${orderStops([
    [0, blue],
    [front - 12, blue],
    [front + 7, red],
    [Math.max(front + 18, 76), orange],
    [100, yellow],
  ]).join(', ')})`
}

function dawnGradient(f) {
  // Travels the other way: the leading edge starts at the bottom of the screen
  // and climbs.
  const front = 100 - f.front * 118

  const night = mix(NIGHT, DAWN_BLUE, f.front * 0.35)
  const blue = DAWN_BLUE

  // The warm band only exists once the sun is on its way up, and it sits below
  // the blue rather than replacing it.
  const red = mix(blue, DAWN_RED, f.warm)
  const orange = mix(blue, DAWN_ORANGE, f.warm)
  const yellow = mix(blue, DAWN_YELLOW, f.warm)

  // Everything then opens out into daylight. Applied last and to every stop,
  // so the sky arrives at the page's own colour rather than clearing off it.
  const day = c => mix(c, mix(DAY_TOP, DAY_BOTTOM, 0.5), f.day)

  return `linear-gradient(to bottom, ${orderStops([
    [0, day(night)],
    [front - 6, day(night)],
    [front + 4, day(blue)],
    [Math.max(front + 14, 70), day(red)],
    [88, day(orange)],
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
