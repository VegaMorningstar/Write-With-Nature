/**
 * The sky that covers the page while the theme changes.
 *
 * Two layers over everything: a gradient that travels from sunset to night
 * (or night to dawn), and the star field fading in or out above it. The
 * timeline comes from transition.js; this only paints.
 *
 * It writes styles onto refs inside the frame callback rather than going
 * through React state. A three second animation is roughly 180 frames, and
 * 180 re-renders of a component that owns two divs and a canvas is a lot of
 * reconciliation for something that is only ever setting a background string.
 * React is used for mounting and unmounting, which happens twice.
 */
import { useEffect, useRef, useState } from 'react'
import { onTransitionFrame } from './transition.js'
import { drawStars } from '../night-sky/stars.js'

/**
 * The palettes, top of the screen first.
 *
 * Five stops rather than two because a real sky is not a linear ramp: the
 * interesting part is the band near the horizon, where the warm light is, and
 * it occupies the bottom third. Spacing the stops unevenly is what puts it
 * there.
 */
const STOPS = [0, 45, 70, 88, 100]

/** Full sunset: deep blue overhead down through violet to fire at the horizon. */
const SUNSET = ['#12325f', '#4a3f7a', '#b8563c', '#e8904a', '#f0c070']

/** The night this theme actually is. Flat, because the night sky here is flat. */
const NIGHT = ['#050814', '#050814', '#060a18', '#070c1c', '#081024']

/**
 * The sunrise proper, and the reason the dawn is two segments rather than one.
 *
 * Going straight from night to a pale morning sky is a straight line in RGB
 * from a dark desaturated navy to a light desaturated blue, and it passes
 * through the grey in the middle: measured, the horizon hit rgb(107,106,104)
 * at 40% of the turn, which is neutral grey, and the whole sky went flat and
 * dead for about a second. A sunrise is not the absence of night, it is fire
 * at the horizon first. So night warms into this, and only then opens out
 * into morning — which is also what makes it read as the sunset run backwards.
 */
const SUNRISE = ['#2a4a86', '#7a5f9c', '#d9684a', '#ffab5e', '#ffe0a0']

/** First light: cool above, warm below, brighter than sunset and less saturated. */
const DAWN = ['#7ba6dd', '#bcc3dd', '#f0c9a4', '#ffd79a', '#fff0cd']

/** Where the sunrise hands over to the morning. */
const SUNRISE_HOLD = 0.55

/**
 * Where the dawn hands over to the real page. Close to the paper background,
 * so the last of the fade has almost nothing left to travel.
 */
const DAY = ['#c8cbbe', '#d4cdb8', '#dccfb2', '#e0d2b0', '#e4d6b4']

const hexToRgb = h => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]
const RGB = Object.fromEntries(
  [...SUNSET, ...NIGHT, ...DAWN, ...DAY].map(h => [h, hexToRgb(h)]),
)

function mix(aHex, bHex, k) {
  const a = RGB[aHex]
  const b = RGB[bHex]
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`
}

/**
 * How late each stop starts moving, as a fraction of the turn.
 *
 * The stops do not all travel together, because a sky does not change all at
 * once. Dusk drains from the top down and the last light stays at the horizon;
 * dawn does the reverse, arriving at the horizon and climbing.
 *
 * This is not decoration. Moving all five in step made the sunrise pass
 * through grey on its way from night to dawn — a straight line in RGB from
 * near-black to pale blue goes through exactly that — and the whole sky went
 * flat and dead for about a second in the middle. Staggered, there is always
 * a lit part and a dark part, and the boundary between them is what reads as
 * the sun being somewhere.
 */
const DUSK_LEAD = [0, 0.10, 0.20, 0.30, 0.40]
const DAWN_LEAD = [0.40, 0.30, 0.20, 0.10, 0]

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x)
const stopTurn = (turn, lead) => clamp01((turn - lead) / (1 - lead))

/**
 * The gradient for this instant.
 *
 * Going dark, the sky starts at full sunset and cools to night. Going light,
 * it starts at night — which is what the page already looks like, so the
 * overlay arrives invisibly — and warms to dawn, then on to something close
 * to paper so the hand-off at the end is not a step.
 */
function skyAt(toDark, turn) {
  const lead = toDark ? DUSK_LEAD : DAWN_LEAD
  const stops = STOPS.map((pos, i) => {
    const k = stopTurn(turn, lead[i])
    let colour
    if (toDark) {
      // One straight run. Sunset is already saturated and night is dark, so
      // there is no washed-out middle to route around.
      colour = mix(SUNSET[i], NIGHT[i], k)
    } else if (k <= SUNRISE_HOLD) {
      colour = mix(NIGHT[i], SUNRISE[i], k / SUNRISE_HOLD)
    } else {
      // Past the fire, opening out to morning and then to something close to
      // paper, so the overlay does not clear from a vivid sky straight onto
      // beige and show its own edge.
      const rest = (k - SUNRISE_HOLD) / (1 - SUNRISE_HOLD)
      colour = rest <= 0.5
        ? mix(SUNRISE[i], DAWN[i], rest / 0.5)
        : mix(DAWN[i], DAY[i], (rest - 0.5) / 0.5)
    }
    return `${colour} ${pos}%`
  })
  return `linear-gradient(to bottom, ${stops.join(', ')})`
}

export default function ThemeTransition() {
  const [running, setRunning] = useState(false)
  const skyRef = useRef(null)
  const starRef = useRef(null)

  useEffect(() => onTransitionFrame(frame => {
    // The cursor creatures are fixed to the viewport outside .page, so the sky
    // cannot cover them from in here — and they are the one thing that would
    // otherwise be seen changing species mid-sunset. Taken out with the rest
    // of the page and brought back with it.
    const creatures = document.getElementById('cursor-butterflies-canvas')

    if (!frame) {
      if (creatures) creatures.style.opacity = ''
      setRunning(false)
      return
    }
    if (creatures) creatures.style.opacity = (1 - frame.sky).toFixed(3)
    setRunning(true)

    const sky = skyRef.current
    if (sky) {
      sky.style.opacity = String(frame.sky)
      sky.style.background = skyAt(frame.toDark, frame.turn)
    }

    const canvas = starRef.current
    if (!canvas) return
    // Going dark the stars arrive, going light they leave — the same ramp,
    // read forwards or backwards.
    const alpha = frame.toDark ? frame.stars : 1 - frame.stars
    // Under the sky's own opacity as well as their own: stars should not be
    // brighter than the sky they are in while it is still fading up.
    const shown = alpha * frame.sky
    canvas.style.opacity = String(shown)
    if (shown <= 0.002) return

    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.round(w * dpr)
    const ch = Math.round(h * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    // The same field the night theme shows, so the stars that fade up here are
    // in the positions they will still be in when the overlay clears.
    drawStars(ctx, w, h)
  }), [])

  if (!running) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        // Above the cursor creatures at 100000, not merely above the page.
        // They are the one thing that outranks everything else, and left
        // underneath the sky they would have gone on fluttering over the
        // sunset and then popped from butterflies to fireflies mid-scene, in
        // full view. Behind the sky they simply leave with the rest of the
        // page and come back as whatever the new theme flies.
        //
        // Swallows pointer events for the duration: the sky is not something
        // you can click through, and a second press on a jelly you cannot see
        // would only be refused anyway.
        zIndex: 100001,
        pointerEvents: 'auto',
      }}
    >
      <div ref={skyRef} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
      <canvas
        ref={starRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0 }}
      />
    </div>
  )
}
