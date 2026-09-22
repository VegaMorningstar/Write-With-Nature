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
export const TIMELINE = {
  /**
   * The jelly sinks. Slower than the sky builds, on purpose: the body has to
   * still be descending once there is a sunset behind it, or the whole thing
   * is a sun that vanishes and then, separately, a coloured screen. The first
   * pass had it gone by 900ms and the sky not full until 1250, so the two
   * never shared the frame.
   */
  dropFrom: 0,
  dropTo: 1250,
  /** And goes out as it reaches the horizon, not as it starts moving. */
  fadeOutFrom: 900,
  fadeOutTo: 1350,
  /** The sky fades in, at full sunset or full night depending on direction. */
  skyFrom: 120,
  skyTo: 1200,
  /** Sunset cools to night, or night warms to dawn. */
  turnFrom: 1350,
  turnTo: 2300,
  /** Stars arrive or leave. */
  starsFrom: 1700,
  starsTo: 2500,
  /** The attribute changes here, under full cover. */
  switchAt: 2500,
  /** The sky clears and the other body rises into its place. */
  clearFrom: 2650,
  clearTo: 3350,
  riseFrom: 2650,
  riseTo: 3350,
  fadeInFrom: 2750,
  fadeInTo: 3250,
}

export const DURATION = TIMELINE.clearTo

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

function emit(frame) {
  for (const fn of listeners) fn(frame)
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
function frameAt(t, from, to, distance) {
  const toDark = to === 'dark'

  const sinking = easeOut(span(t, TIMELINE.dropFrom, TIMELINE.dropTo))
  const rising = easeOut(span(t, TIMELINE.riseFrom, TIMELINE.riseTo))

  // Down while it sets, then back up from the same depth once it is the other
  // body. Between the two it sits below, invisible.
  const drop = distance * (sinking - rising)

  // Fading is its own window rather than the inverse of the descent, so the
  // body stays solid most of the way down and only goes out at the horizon.
  const goneOut = easeInOut(span(t, TIMELINE.fadeOutFrom, TIMELINE.fadeOutTo))
  const comeBack = easeInOut(span(t, TIMELINE.fadeInFrom, TIMELINE.fadeInTo))
  const bodyAlpha = 1 - goneOut + comeBack

  const skyIn = easeInOut(span(t, TIMELINE.skyFrom, TIMELINE.skyTo))
  const skyOut = easeInOut(span(t, TIMELINE.clearFrom, TIMELINE.clearTo))

  return {
    from,
    to,
    toDark,
    t,
    sky: clamp01(skyIn - skyOut),
    turn: easeInOut(span(t, TIMELINE.turnFrom, TIMELINE.turnTo)),
    stars: easeInOut(span(t, TIMELINE.starsFrom, TIMELINE.starsTo)),
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
  let switched = false

  active = { from, to: next, raf: 0 }

  const step = now => {
    const t = now - start
    if (t >= TIMELINE.switchAt && !switched) {
      switched = true
      // Under full cover: the sky is opaque here, so none of what changes on
      // this frame is visible.
      setTheme(next)
    }
    if (t >= DURATION) {
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
