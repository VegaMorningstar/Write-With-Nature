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
 * DOM directly; React state changes only when the overlay mounts and unmounts.
 */
import { theme, setTheme } from '../theme.js'
import { FRONT_OVERSHOOT } from './sky.js'

/**
 * Windows in milliseconds, each [from, to].
 *
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
  // No window for the stars going this way. They are driven off the front's
  // own position instead — see STAR_LAG — so that they fill in behind the blue
  // as it takes the screen rather than arriving after it has finished. A
  // separate window made them a second event that happened once the sky was
  // already dark; tied to the front they are part of the same one.
  // Paced off the stars rather than off the clock, and matched to the dawn.
  //
  // The dusk stars are complete at about 2205ms — they finish early, because
  // they only have to catch the front and the front overshoots. The moon then
  // used to wait until 3600 to start rising, nearly a second and a half of a
  // finished night sky with nothing happening in it, and then hurried up in
  // 1000ms. The dawn's sun starts 200ms after its own stars are done and takes
  // 1400ms. These are those same offsets: +100 to the switch, +200 to the
  // rise, +250 to the fade, and the same durations.
  switchAt: 2350,
  rise: [2450, 3850],
  fadeIn: [2500, 3450],
  // 900ms of held night after the moon is up, as the dawn holds its risen sun
  // before clearing.
  clear: [4750, 5550],
  total: 5550,
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

// DUSK and DAWN are not exported. Each direction's own `total` is what the
// runner ends on, so there is no single duration for a caller to hold, and a
// shared one would be wrong for whichever direction was shorter.

/**
 * How far the jelly sinks, as a fraction of the gap between it and the compose
 * card. Not the whole gap: it should look like it is going down behind the
 * horizon, not like it is landing on the panel.
 */
const DROP_FRACTION = 0.95
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
  if (!orn || !card) return DROP_MIN
  const gap = card.getBoundingClientRect().top - orn.getBoundingClientRect().bottom
  return Math.max(DROP_MIN, Math.min(DROP_MAX, gap * DROP_FRACTION))
}

/**
 * Whether one is running. A flag rather than a handle, because nothing can
 * cancel a transition part-way: the theme changes in the middle of it, so
 * stopping early would leave the sky and the attribute disagreeing about which
 * theme has arrived. It runs to the end or not at all.
 *
 * The one consequence worth knowing: if the tab is backgrounded mid-sunset,
 * rAF stops and this stays set, so further clicks are refused until the tab is
 * focused again — at which point the loop resumes and finishes normally.
 */
let active = false
const listeners = new Set()

/**
 * Subscribe to per-frame updates. The callback receives null when the
 * transition ends, so listeners can put whatever they moved back.
 */
export function onTransitionFrame(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
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

/** One eased window, or 0 for a direction that does not have that window. */
const win = (t, w, ease = easeInOut) => (w ? ease(span(t, w[0], w[1])) : 0)

/**
 * How far the stars trail the dusk front, as a fraction of the SCREEN.
 *
 * Measured in screen height rather than in the front's progress, because the
 * front overshoots — it runs to 125% so the last of the fire is pushed off the
 * bottom — while the star line only ever spans the screen itself. Trailing by
 * a fraction of progress therefore drifted: the gap between the blue edge and
 * the topmost star grew from about 11% of the screen early to over 40% late.
 * In screen terms it now stays at this, the whole way down.
 *
 * Non-zero on purpose. The two move together — a strip of sky goes blue and
 * gets its stars at much the same moment, the way dusk actually works — but
 * not simultaneously, or stars appear inside the lit edge of the front itself.
 */
const STAR_LAG = 0.16

/**
 * Per-frame state for the listeners.
 *
 * `sky` is how present the overlay is, `front` how far the sky's leading edge
 * has travelled, `warm` how present the fire is, `day` how far the dawn has
 * opened into morning, `stars` where the star mask's boundary sits, and `drop`
 * the jelly's offset in pixels with `bodyAlpha` its opacity.
 *
 * Listeners get finished numbers rather than the raw clock, which keeps the
 * easing in one place — otherwise the ornament and the sky would each have
 * their own opinion about what "halfway" means, and they have to agree.
 */
function frameAt(t, to, distance) {
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

  const front = win(t, T.front)

  // Going dark, the stars are the front: the same boundary, a little behind.
  // Going light they keep their own window, because there the light comes up
  // from the bottom while the stars go out ahead of it, and the two want
  // different speeds.
  const stars = toDark
    ? clamp01(front * FRONT_OVERSHOOT - STAR_LAG)
    : win(t, T.stars)

  return {
    toDark,
    sky: clamp01(win(t, T.sky) - win(t, T.clear)),
    front,
    warm,
    day: win(t, T.day),
    stars,
    drop,
    bodyAlpha: clamp01(bodyAlpha),
  }
}

/**
 * Run the transition to `next`, or switch immediately if animation is
 * unwanted. Does nothing at all if one is already under way.
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

  const start = performance.now()
  const schedule = next === 'dark' ? DUSK : DAWN
  let switched = false

  // Measured once, then again only if the layout actually changes under it.
  // Re-reading it every frame would force a synchronous layout twice per
  // frame, on a page already running four glass shaders and a fluid sim —
  // and the gap it measures only moves when the viewport does.
  let distance = dropDistance()
  const remeasure = () => { distance = dropDistance() }
  window.addEventListener('resize', remeasure)

  active = true

  const finish = () => {
    window.removeEventListener('resize', remeasure)
    active = false
    emit(null)
  }

  const step = now => {
    const t = now - start
    if (t >= schedule.switchAt && !switched) {
      switched = true
      // Under full cover: the sky is opaque here, so none of what changes on
      // this frame is visible.
      setTheme(next)
    }
    if (t >= schedule.total) {
      finish()
      return
    }
    emit(frameAt(t, next, distance))
    requestAnimationFrame(step)
  }

  emit(frameAt(0, next, distance))
  requestAnimationFrame(step)
}
