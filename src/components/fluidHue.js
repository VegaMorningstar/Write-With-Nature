import { tokens } from '../theme.js'

/**
 * Keeps green out of the fluid cursor.
 *
 * smokey-fluid-cursor picks its colours with `HSVtoRGB(Math.random(), 1, 1)`
 * — the whole hue wheel, at full saturation. Its config exposes dissipation,
 * curl, resolution and so on, but nothing about hue, and the generator is
 * internal to the minified bundle. So the only place to intervene is the
 * randomness feeding it.
 *
 * A colour filter cannot do this job. Removing one hue while leaving the rest
 * alone is not a linear operation: any feColorMatrix that turns green into
 * teal also drags yellow towards pink, because yellow is (1,1,0) and shares
 * the green channel. Hue-rotate moves every colour by construction. The
 * transform has to happen before the colour exists, not after.
 *
 * Patching Math.random globally would work and is the obvious shortcut, but it
 * would also reach the butterflies, the cursor butterflies and the tile
 * shuffle, all of which draw from it — a permanent, invisible change to the
 * whole app to recolour one canvas. Instead the patch is installed only for
 * the duration of the library's own callbacks: its animation frame, where the
 * palette rotates, and its pointer handlers, where a press picks a fresh
 * colour. Everyone else's Math.random is untouched.
 */

/**
 * The span of the hue wheel to skip, as HSV hue in 0..1.
 *
 * Derived rather than guessed, then widened once by eye.
 *
 * At the full saturation and value the library uses, green leads both other
 * channels for hue in (0.200, 0.467) — below 0.200 red still leads as the
 * colour runs to yellow, above 0.467 blue has overtaken on the way to cyan.
 * An earlier 0.22 start left 2.7% of colours green, because the sliver from
 * 0.20 to 0.22 is yellow-green.
 *
 * "Green-dominant" turned out to be the wrong test, though. It clears actual
 * greens and still passes chartreuse, where red and green are near equal and
 * blue is absent — a yellow that leans green, which is what it looks like on
 * a dark page. Pure yellow sits at 0.167, so cutting from 0.145 takes the
 * green side of yellow with it and leaves gold, amber and orange, which all
 * live below 0.14 and are wanted.
 *
 * The upper bound stays clear of teal and turquoise, which are wanted too;
 * cyan proper begins around 0.5.
 */
const BANNED_FROM = 0.145
const BANNED_TO = 0.478

const GAP = BANNED_TO - BANNED_FROM

/**
 * Uniform on 0..1 mapped to uniform on the wheel minus the banned span. The
 * remaining hues keep their relative likelihood rather than piling up at the
 * edges of the gap, which is what a clamp would do — and a clamp would put a
 * conspicuous band of pure yellow-green and pure cyan on every other splat.
 */
function skipGreen(u) {
  const v = u * (1 - GAP)
  return v < BANNED_FROM ? v : v + GAP
}

/**
 * Runs `fn` with Math.random remapped, then restores it. Restoring in a
 * finally matters: if the library throws mid-frame, leaving the patch
 * installed would quietly bias every other consumer in the app.
 */
export function withFluidHue(fn) {
  // Per theme, and checked per call rather than once at start-up, so switching
  // themes changes the palette from the next splat on. The paper theme keeps
  // the library's full wheel: green sits with the foliage there, and it was
  // only ever wrong against the night sky.
  if (tokens().fluidHue !== 'no-green') return fn()

  const original = Math.random
  Math.random = () => skipGreen(original())
  try {
    return fn()
  } finally {
    Math.random = original
  }
}

let installed = false
let libraryLoop = null
let capturing = false

/**
 * Wraps the library's animation loop. Call `capture()` around initFluid: the
 * library registers its loop synchronously in there, so the first frame
 * requested during that window is its own. Thereafter the loop re-registers
 * itself by the same function reference, and only that reference is wrapped —
 * every other animation in the app passes straight through.
 *
 * The assumption to know about: the first frame requested inside capture() is
 * taken to be the library's. That holds because initFluid calls its loop
 * synchronously at the end of setup, and nothing else of ours runs in that
 * window. If it ever stopped holding, the wrong callback would be wrapped and
 * the guard would simply stop working — green would come back, quietly, with
 * nothing thrown. It is worth checking here first if that ever happens.
 *
 * requestAnimationFrame is left patched for the life of the page, because the
 * loop re-registers itself every frame and the wrapper has to still be there
 * when it does. The cost is one identity comparison per animation frame.
 */
export function installLoopGuard() {
  if (installed) return
  installed = true

  const original = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = function (cb) {
    if (capturing && libraryLoop === null) libraryLoop = cb
    if (cb === libraryLoop) return original(t => withFluidHue(() => cb(t)))
    return original(cb)
  }
}

/** Marks the window during which the library's loop can be identified. */
export function capture(fn) {
  capturing = true
  try {
    return fn()
  } finally {
    capturing = false
  }
}
