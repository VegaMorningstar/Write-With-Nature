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

/**
 * The theme's own background, which is where the whole sky ends up — imported
 * rather than copied, because a sunset that cooled to a slightly different
 * black than the page under it would show its own edge as it cleared.
 */
import { NIGHT_PAPER as NIGHT } from '../theme.js'

/**
 * How far past the bottom of the screen the front travels.
 *
 * Exported because the dusk star lag is measured against it: the stars trail
 * the front by a fraction of the SCREEN, and converting the front's progress
 * into a screen position needs this number. It was a literal here and a
 * separate constant there, and retuning one would have silently desynchronised
 * the stars from the sky they are supposed to be following.
 */
export const FRONT_OVERSHOOT = 1.25

// ── Dusk, top of the sky to the horizon ─────────────────────────────────────
//
// Six blue anchors rather than one, and they are what this section is for.
// A single blue stop makes the whole upper sky one flat colour, which is the
// thing that read as a coloured panel rather than as depth — real sky gets
// lighter toward the horizon the entire way down, long before any sunset
// colour starts.
const DUSK_ZENITH = '#0c2344'  // straight up, where the night starts
const DUSK_TOP = '#14395f'     // overhead
const DUSK_BLUE = '#2f6ba8'    // midway down
const DUSK_AZURE = '#3f76b0'   // the brightest of it, above the turn
const DUSK_STEEL = '#42639f'   // beginning to cool toward the front
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
const DAWN_STEEL = '#2d4f82'   // the first hint of colour under the night
const DAWN_INDIGO = '#4e6ea8'  // the band under it
const DAWN_AZURE = '#6e96cc'   // between the indigo and first light
const DAWN_BLUE = '#8fbce8'    // first light
const DAWN_PALE = '#b3d4f2'    // the lightest, just above the horizon
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
 * Anchors must not run backwards, or the browser silently snaps them and the
 * front stops moving. Clamped into range and forced upward in order.
 */
function monotonic(anchors) {
  let last = -40
  const clamped = anchors.map(([pos, c]) => {
    const p = Math.max(last, Math.min(140, pos))
    last = p
    return { p, c }
  })

  // Where several anchors land on the same position — which happens whenever
  // the front has run off one end and a whole band has been pushed out of
  // sight — only the last of them still describes the sky there. Keeping the
  // others leaves zero-width segments, and a zero-width segment between two
  // different colours is a hard step: at the end of the dawn, seven anchors
  // collapsed onto 0% and the first of them won, so the very top of the sky
  // snapped back to night for one stop. That measured as a 240-unit jump
  // between neighbouring stops, which is about as visible as an edge gets.
  return clamped.filter((a, i) => i === clamped.length - 1 || clamped[i + 1].p > a.p)
}

/** Continuous in value and in slope, which is the whole point of using it. */
const smooth = x => x * x * (3 - 2 * x)

/** The colour of an anchor ramp at one position, blended smoothly. */
function sampleRamp(anchors, pos) {
  if (pos <= anchors[0].p) return anchors[0].c
  const last = anchors[anchors.length - 1]
  if (pos >= last.p) return last.c
  for (let i = 1; i < anchors.length; i++) {
    const b = anchors[i]
    if (pos <= b.p) {
      const a = anchors[i - 1]
      const width = b.p - a.p
      if (width <= 0) return b.c
      return mix(a.c, b.c, smooth((pos - a.p) / width))
    }
  }
  return last.c
}

/**
 * How many stops the emitted gradient carries. Around this many is where the
 * banding stops being findable on a full-height sky at this contrast.
 */
const BANDS = 56

/**
 * Turns anchors into a CSS gradient by sampling, rather than handing the
 * anchors straight to the browser.
 *
 * This is the part that makes it smooth, and more stops alone would not have:
 * CSS interpolates linearly between whatever stops it is given, so a colour
 * written at two positions is the same straight line no matter how many extra
 * stops sit on it. What was visible was the kink where two such lines met.
 * Linear blending is continuous in value but not in slope, and the eye is very
 * good at finding a slope discontinuity in a large flat area — it reads as an
 * edge, which is exactly the banding this had.
 *
 * Sampling a smoothstep between the anchors makes the slope continuous too, so
 * there is no edge left at an anchor to find. The many stops are then just a
 * fine enough quantisation of that curve to hide the linear segments between
 * them.
 */
function emitGradient(anchors) {
  const ramp = monotonic(anchors)
  const stops = []
  for (let i = 0; i <= BANDS; i++) {
    const p = (i / BANDS) * 100
    stops.push(`${css(sampleRamp(ramp, p))} ${p.toFixed(1)}%`)
  }
  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

/**
 * `f` carries the eased phase values: `front` is how far the sky's leading edge
 * has travelled, `warm` how present the fire is, `day` how far the dawn has
 * opened out into morning.
 *
 * Fronts overshoot 100 on purpose. A front that stops exactly at the bottom
 * leaves a sliver of the colour it was pushing still visible at the last pixel;
 * running it past the bottom pushes that off the screen — see FRONT_OVERSHOOT.
 */
export function skyGradient(toDark, f) {
  return toDark ? duskGradient(f) : dawnGradient(f)
}

function duskGradient(f) {
  const front = f.front * FRONT_OVERSHOOT * 100

  // The blue darkens as it grows, so the top of the screen is already night by
  // the time the front reaches the bottom. Each band darkens a little less
  // than the one above it, which keeps the blue a gradient the whole way down
  // instead of collapsing to one flat tone as it deepens.
  const dk = Math.min(1, f.front * 1.15)
  const zenith = mix(DUSK_ZENITH, NIGHT, dk)
  const top = mix(DUSK_TOP, NIGHT, dk * 0.98)
  const blue = mix(DUSK_BLUE, NIGHT, dk * 0.96)
  const azure = mix(DUSK_AZURE, NIGHT, dk * 0.94)
  const steel = mix(DUSK_STEEL, NIGHT, dk * 0.9)
  const indigo = mix(DUSK_INDIGO, NIGHT, dk * 0.85)

  // The fire fades toward night rather than toward transparent: it has to be
  // able to disappear while still being the thing under the front.
  const violet = mix(NIGHT, DUSK_VIOLET, f.warm)
  const magenta = mix(NIGHT, DUSK_MAGENTA, f.warm)
  const red = mix(NIGHT, DUSK_RED, f.warm)
  const orange = mix(NIGHT, DUSK_ORANGE, f.warm)
  const yellow = mix(NIGHT, DUSK_YELLOW, f.warm)

  // Six anchors through the blue rather than two, spread across everything
  // above the front rather than pinned near it, so the upper sky is a full
  // ramp at every moment of the descent. The warm anchors trail the front at
  // fixed distances, so the whole sunset moves down as one thing.
  // The bands are spaced widely on purpose. Every anchor is a colour the sky
  // has to get through, and the screen is only so tall: packed close, the
  // travel between two of them lands in a few per cent of the height and
  // becomes a visible edge however many stops are sampled across it. Spread
  // out, the same colours arrive as a ramp.
  return emitGradient([
    [0, zenith],
    [front * 0.16, top],
    [front * 0.36, blue],
    [front * 0.56, azure],
    [front - 30, steel],
    [front - 12, indigo],
    [front + 8, violet],
    [front + 26, magenta],
    [front + 44, red],
    [Math.max(front + 60, 84), orange],
    [100, yellow],
  ])
}

function dawnGradient(f) {
  // Travels the other way: the leading edge starts at the bottom of the screen
  // and climbs.
  const front = 100 - f.front * FRONT_OVERSHOOT * 100

  // The night thins from the top as the light comes up under it, so the dark
  // part is a gradient too rather than a flat cap.
  const lift = Math.min(1, f.front * 1.1)
  const night = mix(NIGHT, DAWN_DEEP, f.front * 0.5)
  const steel = mix(NIGHT, DAWN_STEEL, lift)
  const indigo = mix(NIGHT, DAWN_INDIGO, lift)
  const azure = mix(NIGHT, DAWN_AZURE, lift)
  const blue = DAWN_BLUE
  const pale = DAWN_PALE

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

  return emitGradient([
    [0, day(night)],
    [Math.min(front - 52, 22), day(night)],
    [front - 38, day(steel)],
    [front - 22, day(indigo)],
    [front - 6, day(azure)],
    [front + 12, day(blue)],
    [front + 30, day(pale)],
    [Math.max(front + 46, 62), day(violet)],
    [Math.max(front + 58, 78), day(red)],
    [91, day(orange)],
    [100, day(yellow)],
  ])
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
