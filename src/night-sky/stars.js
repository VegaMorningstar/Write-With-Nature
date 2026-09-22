/**
 * The star field, for the dark theme's night sky.
 *
 * Two layers, for one reason: most of the sky never changes, and repainting a
 * viewport of stars every frame to animate a few dozen of them would be waste.
 * So the still stars are baked once into a canvas, and only the twinklers are
 * drawn live on top of it.
 *
 *   drawStars(ctx, w, h)  =  blit the baked canvas, then draw the twinklers
 *
 * Consumers take it in one of two ways, and both draw the same field, so a
 * panel refracts the sky the page shows rather than a second one a few pixels
 * off:
 *
 *   NightSky.jsx and three of the four glass backdrops call drawStars() and
 *   get both halves at once.
 *
 *   The page backdrop (liquid-glass/backdrop.js) caches its paper across
 *   frames, so it takes drawBakedStars() into that cache and overlays
 *   drawTwinklers() live each frame. Baking the twinklers would freeze them
 *   until the next resize.
 *
 * The field is deterministic: a seeded PRNG rather than Math.random, so a
 * resize puts every star back where it was. With Math.random the sky would
 * silently reshuffle whenever the window changed size, which reads as a glitch
 * rather than as a sky.
 *
 * Structure, rather than uniform scatter, is what makes it look like a sky:
 * a tilted galactic band, a handful of gaussian clusters, and the rest
 * scattered. Uniform random points look conspicuously even — the eye reads
 * them as a texture, not as space.
 */

/** Change to reshuffle the sky; any 32-bit value gives a different field. */
const SEED = 0x5eed

/** Roughly one star per this many square CSS pixels. */
const DENSITY = 820

/** How the field divides up. The remainder is scattered uniformly. */
const BAND_SHARE = 0.30
const CLUSTER_SHARE = 0.30

const BAND_CENTRE = 0.30   // as a fraction of height
const BAND_TILT = -0.16    // radians
const BAND_SPREAD = 0.085  // gaussian sigma, as a fraction of height

/** Gaussian knots of stars, for the look of distant clusters. */
const CLUSTER_COUNT = 9
const CLUSTER_SIGMA_MIN = 0.02   // as a fraction of the diagonal
const CLUSTER_SIGMA_MAX = 0.075

/** Share of stars rendered as out-of-focus blur rather than as points. */
const BOKEH_SHARE = 0.07
/** Share rendered as a small disc with a halo; the rest are sharp points. */
const SOFT_SHARE = 0.18

/**
 * How many stars breathe, and how hard.
 *
 * The first attempt at this was invisible, for two compounding reasons: only
 * about 3% of the field moved at all, and each one only swung between roughly
 * 65% and 100% of its own alpha — a change of a few levels on a dot barely a
 * pixel across. Depth is what actually reads. These now go nearly out and back,
 * and the ones chosen are biased towards the larger `soft` stars, because a
 * sharp 0.4px point can brighten as much as it likes and still not be seen.
 */
const TWINKLE_COUNT = 120
const TWINKLE_DEPTH_MIN = 0.55
const TWINKLE_DEPTH_MAX = 0.92
const TWINKLE_RATE_MIN = 0.9
const TWINKLE_RATE_MAX = 2.4
/** Chance a candidate star is taken as a twinkler; higher for the bigger kinds. */
const TWINKLE_PICK_SOFT = 0.34
const TWINKLE_PICK_SHARP = 0.06

// Starlight is not white. A few per cent of blue and amber is what stops a
// field of grey dots reading as dust on the screen.
const COLOURS = [
  { rgb: '255,252,245', weight: 0.60 },  // white, faintly warm
  { rgb: '186,214,255', weight: 0.25 },  // blue giants
  { rgb: '255,221,171', weight: 0.15 },  // amber
]

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Two uniforms summed, centred — close enough to a normal for a star field. */
function gaussish(rnd) {
  return rnd() + rnd() - 1
}

function pickColour(u) {
  let acc = 0
  for (const c of COLOURS) {
    acc += c.weight
    if (u <= acc) return c.rgb
  }
  return COLOURS[0].rgb
}

/**
 * One star's geometry. Position and kind come from the seeded stream, so the
 * same index always yields the same star.
 */
function makeStar(rnd, w, h, clusters) {
  const roll = rnd()
  let x, y
  if (roll < BAND_SHARE) {
    x = rnd() * w
    // Tilted, so the band is not a horizontal stripe — which would read as a
    // seam rather than as the galaxy.
    const centre = BAND_CENTRE * h + Math.tan(BAND_TILT) * (x - w / 2)
    y = centre + gaussish(rnd) * BAND_SPREAD * h
  } else if (roll < BAND_SHARE + CLUSTER_SHARE) {
    const c = clusters[Math.floor(rnd() * clusters.length)]
    x = c.x + gaussish(rnd) * c.sigma
    y = c.y + gaussish(rnd) * c.sigma
  } else {
    x = rnd() * w
    y = rnd() * h
  }

  const kindRoll = rnd()
  const t = rnd()
  const rgb = pickColour(rnd())

  if (kindRoll < BOKEH_SHARE) {
    // Out of focus: a wide, very faint disc. These read as depth — something
    // the lens is not resolving — and at this alpha they never look like blobs.
    return { x, y, kind: 'bokeh', r: 2.2 + t * t * 4.2, alpha: 0.05 + rnd() * 0.09, rgb }
  }
  if (kindRoll < BOKEH_SHARE + SOFT_SHARE) {
    return { x, y, kind: 'soft', r: 0.9 + t * 0.85, alpha: 0.3 + rnd() * 0.5, rgb }
  }
  // Cubed, so the great majority are very small — the distribution that reads
  // as distance.
  return { x, y, kind: 'sharp', r: 0.32 + t * t * t * 0.62, alpha: 0.28 + rnd() * 0.66, rgb }
}

function drawStar(ctx, s, alpha) {
  if (s.kind === 'bokeh') {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r)
    g.addColorStop(0, `rgba(${s.rgb},${alpha.toFixed(3)})`)
    g.addColorStop(0.55, `rgba(${s.rgb},${(alpha * 0.45).toFixed(3)})`)
    g.addColorStop(1, `rgba(${s.rgb},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  if (s.kind === 'soft') {
    const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4.5)
    halo.addColorStop(0, `rgba(${s.rgb},${(alpha * 0.5).toFixed(3)})`)
    halo.addColorStop(1, `rgba(${s.rgb},0)`)
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r * 4.5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = `rgba(${s.rgb},${alpha.toFixed(3)})`
  ctx.beginPath()
  ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
  ctx.fill()
}

let baked = null
let twinklers = []
let bakedW = 0
let bakedH = 0
let bakedDpr = 0

function build(w, h, dpr) {
  const rnd = mulberry32(SEED)
  const diag = Math.hypot(w, h)

  const clusters = []
  for (let i = 0; i < CLUSTER_COUNT; i++) {
    clusters.push({
      x: rnd() * w,
      y: rnd() * h,
      sigma: (CLUSTER_SIGMA_MIN + rnd() * (CLUSTER_SIGMA_MAX - CLUSTER_SIGMA_MIN)) * diag,
    })
  }

  if (!baked) baked = document.createElement('canvas')
  baked.width = Math.round(w * dpr)
  baked.height = Math.round(h * dpr)
  const ctx = baked.getContext('2d')
  // A refused context is rare but not impossible, and this runs inside a frame
  // loop — throwing here would take the whole page's animation with it. Give up
  // on the sky instead; a starless night is a far better failure than a dead
  // render loop. bakedW stays 0, so the draw functions no-op too.
  if (!ctx) {
    twinklers = []
    bakedW = 0
    bakedH = 0
    bakedDpr = 0
    return
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const count = Math.round((w * h) / DENSITY)
  // The twinklers are taken from the front of the same stream and left out of
  // the bake, so they are not drawn twice — once frozen and once breathing.
  const live = []
  for (let i = 0; i < count; i++) {
    const s = makeStar(rnd, w, h, clusters)
    if (s.y < -20 || s.y > h + 20 || s.x < -20 || s.x > w + 20) continue

    const pick = s.kind === 'soft' ? TWINKLE_PICK_SOFT : s.kind === 'sharp' ? TWINKLE_PICK_SHARP : 0
    if (live.length < TWINKLE_COUNT && rnd() < pick) {
      live.push({
        ...s,
        // All out of phase, so no two blink together.
        phase: rnd() * Math.PI * 2,
        speed: TWINKLE_RATE_MIN + rnd() * (TWINKLE_RATE_MAX - TWINKLE_RATE_MIN),
        depth: TWINKLE_DEPTH_MIN + rnd() * (TWINKLE_DEPTH_MAX - TWINKLE_DEPTH_MIN),
        // Twinklers are drawn a touch larger than they were baked, so the ones
        // at peak brightness are the ones the eye lands on.
        r: s.r * 1.25,
      })
      continue
    }
    drawStar(ctx, s, s.alpha)
  }

  twinklers = live
  bakedW = w
  bakedH = h
  bakedDpr = dpr
}

/**
 * Device ratio for the baked field, capped by total area rather than by ratio
 * alone. At dpr 2 a 4K window asks for 7680x4320 — 33 megapixels, north of
 * 100MB of backing store for a field of dots, and the allocation most likely
 * to fail and hand back a null context. Backing the ratio off instead costs
 * nothing visible: these are one-pixel points on a flat ground, not type.
 */
function starDpr(w, h) {
  const MAX_PX = 8e6
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (w * h * dpr * dpr <= MAX_PX) return dpr
  return Math.max(1, Math.sqrt(MAX_PX / (w * h)))
}

function ensure() {
  const w = Math.max(1, window.innerWidth)
  const h = Math.max(1, window.innerHeight)
  const dpr = starDpr(w, h)
  if (!baked || w !== bakedW || h !== bakedH || dpr !== bakedDpr) build(w, h, dpr)
  return baked
}

/**
 * Draws the sky into any context, in that context's current transform, as if
 * it covered a `w` x `h` viewport.
 *
 * `t` is milliseconds, and defaults to the clock — which is what every caller
 * actually uses. The parameter exists so a caller *could* pin a frame's time
 * if the twinkle ever needed to be identical to the microsecond across the
 * page and the panels; nothing threads a shared clock today. Within one frame
 * the readings differ by well under a millisecond, and the slowest twinkler
 * takes about seven seconds a cycle, so the drift is invisible.
 */
export function drawStars(ctx, w, h, t = performance.now()) {
  drawBakedStars(ctx, w, h)
  drawTwinklers(ctx, w, h, t)
}

/**
 * The still stars only — one blit.
 *
 * Split out for callers that cache their background across frames. The page
 * backdrop paints its paper once and blits it, so baking the twinklers into it
 * would freeze them; it takes this, then overlays drawTwinklers() live.
 */
export function drawBakedStars(ctx, w, h) {
  const c = ensure()
  if (!c || !c.width || !c.height || !bakedW) return
  ctx.drawImage(c, 0, 0, w, h)
}

/** The breathing stars only, at time `t` in milliseconds. */
export function drawTwinklers(ctx, w, h, t = performance.now()) {
  ensure()
  if (!bakedW || !bakedH) return

  // Scale from the baked field's own space to whatever this caller is using,
  // so twinklers land on the same pixels as the baked stars around them.
  const sx = w / bakedW
  const sy = h / bakedH
  const sec = t / 1000

  for (const s of twinklers) {
    // Never fully out: a star that blinks to nothing reads as a dead pixel.
    const pulse = 1 - s.depth * (0.5 + 0.5 * Math.sin(sec * s.speed + s.phase))
    drawStar(ctx, { ...s, x: s.x * sx, y: s.y * sy }, s.alpha * pulse)
  }
}

/** Rebuilds if the viewport changed. Cheap to call; a no-op when it has not. */
export function refreshStars() {
  ensure()
}
