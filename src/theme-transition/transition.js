/**
 * The sunset and sunrise between themes.
 *
 * Switching the attribute is instantaneous; this is what happens around it, so
 * the page appears to travel from one time of day to the other rather than
 * blinking between two stylesheets.
 *
 * The shape of both directions is the same, because a sunrise is a sunset run
 * backwards:
 *
 *   1. the jelly sinks toward the compose panel and fades out
 *   2. a sky builds over the page — deep blue above, warm below
 *   3. that sky cools to the night, or warms to the dawn
 *   4. stars fade in, or out
 *   5. the theme actually changes, hidden under a fully opaque sky
 *   6. the sky fades away and the jelly rises back into place, now the
 *      other body
 *
 * Step 5 is the point of the whole thing. The switch is abrupt no matter what
 * — a hundred styles, four glass backdrops and a star field all change on one
 * frame — so it happens while the overlay is at full opacity and nothing of
 * the page is visible. What the eye follows is the sky, which is continuous
 * across that moment.
 *
 * This module owns the clock rather than each animated part owning its own.
 * The overlay and the masthead ornament both move on this timeline, and two
 * independent rAF loops would drift apart by a frame or two — which is exactly
 * the sort of thing that reads as "slightly broken" without being nameable.
 * Listeners are called once per frame with the current phase, and update the
 * DOM directly; React state changes only at the start and end.
 */
import { theme, setTheme } from '../theme.js'

/**
 * Milestones in milliseconds. The overlap is deliberate: the jelly is still
 * sinking while the sky starts to build, and the stars come up while the last
 * of the warm light drains, which is the order these things happen in.
 */
/**
 * The two directions are not mirror images, so they get separate schedules
 * rather than one set of numbers bent to mean two things.
 *
 * Dusk: the sun goes down while the fire blooms under it, the blue front comes
 * down from the top and darkens, the fire is pushed off the bottom, the stars
 * fill in behind the front, and only then does the theme change.
 *
 * Dawn: the moon goes down, first light climbs from the bottom and erases the
 * stars ahead of it, the theme changes while the sky is still a cold blue, and
 * then the sun rises — bringing the warm colours up with it, which is the part
 * that has to happen after the switch because the sun only exists once the
 * theme is light. Then the whole sky opens out into day and clears.
 *
 * Everything overlaps. Almost nothing here waits for the step before it to
 * finish; the windows are written to run together on purpose.
 */
const DUSK = {
  drop: [0, 1700],
  fadeOut: [1250, 1800],
  sky: [100, 1150],
  /** The blue front, from the top down. */
  front: [250, 2900],
  /** The fire blooms, then is squeezed out by the front. */
  warmIn: [150, 1250],
  warmOut: [1350, 2900],
  /** Filling in behind the front, so they appear against sky that is already dark. */
  stars: [1500, 3350],
  switchAt: 3450,
  rise: [3600, 4600],
  fadeIn: [3650, 4350],
  clear: [4450, 5400],
  total: 5400,
}

const DAWN = {
  drop: [0, 1500],
  fadeOut: [1050, 1600],
  sky: [100, 1000],
  /** First light, from the bottom up. */
  front: [250, 2350],
  /** Erased from the bottom, ahead of the light. */
  stars: [350, 2400],
  switchAt: 2500,
  /** The sun comes up, and the warm colours come up with it. */
  rise: [2600, 4000],
  fadeIn: [2650, 3600],
  warmIn: [2550, 3600],
  warmOut: [3700, 4900],
  /** Full brightness, last. */
  day: [3500, 4900],
  clear: [4900, 5700],
  total: 5700,
}

export const TIMELINE = { DUSK, DAWN }
export const DURATION = Math.max(DUSK.total, DAWN.total)

/**
 * How far the jelly sinks, as a fraction of the gap between it and the compose
 * card. Not the whole gap: it should look like it is going down behind the
 * horizon, not like it is landing on the panel.
 */
export const DROP_FRACTION = 0.95
const DROP_MIN = 110
const DROP_MAX = 320

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x)
/** Progress through a window, 0 before it and 1 after. */
const span = (t, from, to) => clamp01((t - from) / (to - from))
/** Slow at both ends. Everything here is a body moving under gravity or light changing. */
const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = x => 1 - Math.pow(1 - x, 3)

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Distance to sink, measured off the page rather than guessed, so it lands
 * near the compose card on any viewport. Falls back to a sensible constant
 * when either element is missing — the tune pages have the ornament without a
 * compose card.
 */
function dropDistance() {
  if (typeof document === 'undefined') return DROP_MIN
  const orn = document.querySelector('.ornament')
  const card = document.querySelector('.compose-card')
  if (!orn || !card) return 180
  const gap = card.getBoundingClientRect().top - orn.getBoundingClientRect().bottom
  return Math.max(DROP_MIN, Math.min(DROP_MAX, gap * DROP_FRACTION))
}

let active = null
const listeners = new Set()

/**
 * Subscribe to per-frame updates. The callback receives null when the
 * transition ends, so listeners can put whatever they moved back.
 */
export function onTransitionFrame(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** True while a transition is running. */
export function isTransitioning() {
  return active !== null
}

/**
 * One listener must not be able to stop the transition.
 *
 * The overlay goes fully opaque in the middle of this, and the theme changes
 * underneath it. A listener that throws before the loop reschedules leaves the
 * page covered by a sky that will never clear, with the old theme still set —
 * which is exactly what a missing colour in the palette table did. Failing one
 * listener and carrying on turns that into a cosmetic glitch instead of a
 * frozen page.
 */
function emit(frame) {
  for (const fn of listeners) {
    try {
      fn(frame)
    } catch (e) {
      console.warn('[transition] listener failed:', e)
    }
  }
}

/**
 * The state every listener works from.
 *
 * `sky` is how present the overlay is, `turn` how far it has travelled from
 * its starting palette to its ending one, `stars` the star layer's opacity,
 * and `drop` the jelly's offset in pixels with `bodyAlpha` its opacity. Giving
 * listeners finished numbers rather than the raw clock keeps the easing in one
 * place; otherwise the ornament and the sky would each have their own opinion
 * about what "halfway" means.
 */
const win = (t, w, ease = easeInOut) => (w ? ease(span(t, w[0], w[1])) : 0)

function frameAt(t, from, to, distance) {
  const toDark = to === 'dark'
  const T = toDark ? DUSK : DAWN

  // Eased once. `win` already applies the curve it is handed; wrapping it in
  // easeOut again squared it, which front-loaded the descent so hard the body
  // was most of the way down before the sky had started.
  const sinking = win(t, T.drop, easeOut)
  const rising = win(t, T.rise, easeOut)

  // Down while it sets, then back up from the same depth once it is the other
  // body. Between the two it sits below, invisible.
  const drop = distance * (sinking - rising)

  // Fading is its own window rather than the inverse of the descent, so the
  // body stays solid most of the way down and only goes out at the horizon.
  const bodyAlpha = 1 - win(t, T.fadeOut) + win(t, T.fadeIn)

  // The fire rises and falls. Dusk blooms it early and squeezes it out; dawn
  // brings it with the sun and then washes it into daylight.
  const warm = clamp01(win(t, T.warmIn) - win(t, T.warmOut))

  return {
    from,
    to,
    toDark,
    t,
    sky: clamp01(win(t, T.sky) - win(t, T.clear)),
    front: win(t, T.front),
    warm,
    day: win(t, T.day),
    stars: win(t, T.stars),
    drop,
    bodyAlpha: clamp01(bodyAlpha),
  }
}

/**
 * Run the transition to `next`, or switch immediately if animation is
 * unwanted or already under way.
 *
 * Re-entry is refused rather than queued. A second click mid-sunset should do
 * nothing; interrupting would leave the attribute and the overlay disagreeing
 * about which theme is arriving.
 */
export function runThemeTransition(next) {
  if (next !== 'light' && next !== 'dark') return
  const from = theme()
  if (next === from || active) return

  if (prefersReducedMotion()) {
    setTheme(next)
    return
  }

  const distance = dropDistance()
  const start = performance.now()
  const schedule = next === 'dark' ? DUSK : DAWN
  let switched = false

  active = { from, to: next, raf: 0 }

  const step = now => {
    const t = now - start
    if (t >= schedule.switchAt && !switched) {
      switched = true
      // Under full cover: the sky is opaque here, so none of what changes on
      // this frame is visible.
      setTheme(next)
    }
    if (t >= schedule.total) {
      active = null
      emit(null)
      return
    }
    emit(frameAt(t, from, next, distance))
    active.raf = requestAnimationFrame(step)
  }

  emit(frameAt(0, from, next, distance))
  active.raf = requestAnimationFrame(step)
}
