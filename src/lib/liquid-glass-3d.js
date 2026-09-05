/*!
 * liquid-glass-3d.js — glass that reads as a thick blob rather than a flat plate.
 *
 * Ported from the structure of TypeGPU's liquid-glass example. Theirs is a
 * WebGPU fragment shader sampling a background texture; ours has to work on
 * live DOM through backdrop-filter, so the shader cannot come across directly.
 * What does come across is the thing that makes it look three-dimensional:
 *
 *   const dir = normalize(posInBoxSpace * rectDims.yx)
 *   const normalizedDist = (sdfDist - start) / (end - start)
 *   refracted = sampleWithChromaticAberration(
 *     tex, sampler, uv + dir * (refractionStrength * normalizedDist), ...)
 *
 * The displacement is *radial* — outward from the centre — and its magnitude
 * ramps across a band measured from the shape's edge, computed from a rounded
 * box SDF. That is a bevel: the surface turns over as it approaches the rim, so
 * the backdrop stretches hardest right at the edge and not at all in the middle.
 *
 * The previous implementation displaced by a pair of linear X/Y gradients, so
 * every pixel shifted in nearly the same direction by nearly the same amount.
 * That is a flat pane of glass, which is what it looked like.
 *
 * So the SDF is evaluated in JS into a displacement map, and feDisplacementMap
 * applies it — three times at different scales for chromatic aberration, which
 * is the same per-channel trick their shader uses. The same SDF pass also emits
 * a bevel lighting map, since a lit edge is the other half of reading as solid.
 *
 * Chromium only for real refraction; Safari and Firefox get a frosted fallback.
 */

'use strict'

const SVG_NS = 'http://www.w3.org/2000/svg'
let _uid = 0
let _defs = null

// The SDF is smooth, so the maps can be generated small and stretched by
// feImage. A full-size map on a large panel is a few hundred thousand pixels of
// JS per resize for no visible gain.
const MAP_MAX = 220

const supported = (() => {
  const ua = navigator.userAgent
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return false
  if (/Firefox/.test(ua)) return false
  return CSS.supports('backdrop-filter', 'url(#lg)')
})()

// ── Shared pointer state ─────────────────────────────────────────────────────
let _mouseX = 0
let _mouseY = 0
let _bound = false
const _highlights = new Set()
const _elastics = new Set()

function _bindMouse() {
  if (_bound) return
  _bound = true
  window.addEventListener('mousemove', e => {
    _mouseX = e.clientX
    _mouseY = e.clientY
    _highlights.forEach(_refreshHighlight)
    if (_elastics.size) requestAnimationFrame(() => _elastics.forEach(_refreshElastic))
  }, { passive: true })
}

// ── Rounded-box SDF ──────────────────────────────────────────────────────────
// Negative inside, zero on the edge, positive outside — the 2D case of what
// @typegpu/sdf's sdRoundedBox2d computes.
function _sdRoundedBox(px, py, halfW, halfH, r) {
  const qx = Math.abs(px) - halfW + r
  const qy = Math.abs(py) - halfH + r
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  const inside = Math.min(Math.max(qx, qy), 0)
  return outside + inside - r
}

/**
 * One pass over the shape producing both maps.
 *
 * displacement: R and B carry the outward direction scaled by the edge ramp,
 *   biased around 128 because feDisplacementMap reads a channel as
 *   (value/255 - 0.5) * scale.
 * bevel: grey where the surface is flat, lighter where it faces the light and
 *   darker where it faces away, alpha confined to the band. Composited with
 *   overlay, so mid-grey is a no-op.
 */
function _hslToRgb(hDeg, s, l) {
  const h = ((hDeg % 360) + 360) % 360 / 360
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = t => {
    t = (t + 1) % 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)]
}

function _buildMaps(w, h, radius, o) {
  const s = Math.min(1, MAP_MAX / Math.max(w, h))
  const mw = Math.max(8, Math.round(w * s))
  const mh = Math.max(8, Math.round(h * s))

  const halfW = mw / 2
  const halfH = mh / 2
  const r = Math.min(radius * s, Math.min(halfW, halfH))

  // Band width, as a fraction of the shape's smaller half-dimension
  const band = Math.max(1, Math.min(halfW, halfH) * o.band)
  const bevelBand = Math.max(1, band * o.bevelWidth)

  const theta = (o.lightAngle * Math.PI) / 180
  const lx = Math.cos(theta)
  const ly = Math.sin(theta)

  // Feather on the ring's inner boundary, matching their edgeFeather
  const feather = Math.max(0.5, band * o.feather)

  const dispCanvas = document.createElement('canvas')
  dispCanvas.width = mw
  dispCanvas.height = mh
  const dispCtx = dispCanvas.getContext('2d')
  const disp = dispCtx.createImageData(mw, mh)

  const bevCanvas = document.createElement('canvas')
  bevCanvas.width = mw
  bevCanvas.height = mh
  const bevCtx = bevCanvas.getContext('2d')
  const bev = bevCtx.createImageData(mw, mh)

  // The ring weight. Their calculateWeights makes this a plateau — it feathers
  // at `start` and then stays at 1 across the whole band — while the
  // displacement ramps linearly within it. Two different curves doing two
  // different jobs; collapsing them into one is what softens the effect.
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = mw
  maskCanvas.height = mh
  const maskCtx = maskCanvas.getContext('2d')
  const mask = maskCtx.createImageData(mw, mh)

  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const i = (y * mw + x) * 4
      const px = x + 0.5 - halfW
      const py = y + 0.5 - halfH

      const dist = _sdRoundedBox(px, py, halfW, halfH, r)

      // Outward direction. The aspect weighting mirrors their
      // normalize(posInBoxSpace * rectDims.yx) — without it the displacement
      // skews on panels that are much wider than they are tall.
      const ax = px * mh
      const ay = py * mw
      const len = Math.hypot(ax, ay) || 1
      const ux = ax / len
      const uy = ay / len

      // Their normalizedDist: 0 at the ring's inner edge, 1 at the outer. Linear
      // by default, because that is what (sdfDist - start) / (end - start) is.
      const t = Math.max(0, Math.min(1, (dist + band) / band))
      const ramp = t ** o.falloff

      disp.data[i] = 128 + ux * ramp * 127 * o.strength
      disp.data[i + 1] = 128
      disp.data[i + 2] = 128 + uy * ramp * 127 * o.strength
      disp.data[i + 3] = 255

      // Plateau across the band, feathered only on the way in
      const weight = _smoothStep(-band - feather, -band + feather, dist)
      mask.data[i] = 255
      mask.data[i + 1] = 255
      mask.data[i + 2] = 255
      mask.data[i + 3] = Math.round(Math.max(0, Math.min(1, weight)) * 255)

      // Bevel: how much this part of the turned-over edge faces the light
      const bt = Math.max(0, Math.min(1, (dist + bevelBand) / bevelBand))
      const bramp = bt ** o.bevelFalloff
      const facing = ux * lx + uy * ly
      const shade = 128 + facing * bramp * 127

      bev.data[i] = shade
      bev.data[i + 1] = shade
      bev.data[i + 2] = shade
      bev.data[i + 3] = Math.max(0, Math.min(255, bramp * 255 * o.bevel))
    }
  }

  dispCtx.putImageData(disp, 0, 0)
  bevCtx.putImageData(bev, 0, 0)
  maskCtx.putImageData(mask, 0, 0)

  return {
    displacement: dispCanvas.toDataURL(),
    bevel: bevCanvas.toDataURL(),
    ringMask: maskCanvas.toDataURL(),
  }
}

// ── SVG filter ───────────────────────────────────────────────────────────────
function _ensureDefs() {
  if (_defs) return _defs
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.style.position = 'absolute'
  _defs = document.createElementNS(SVG_NS, 'defs')
  svg.appendChild(_defs)
  document.body.appendChild(svg)
  return _defs
}

/**
 * The filter graph, mirroring their fragment shader:
 *
 *   tintedBlur * weights.inside + tintedRing * weights.ring + normal * outside
 *
 * The middle of the panel gets a plain blurred backdrop; the ring gets a
 * *less* blurred one that has been displaced outward and split per channel;
 * the two are mixed by the ring mask. Outside needs no branch — backdrop-filter
 * only applies within the element, so it is already untouched.
 *
 * Note edgeBlurMultiplier is below 1 in their defaults: the ring is sharper
 * than the middle, not blurrier. The refraction detail is the point of the
 * ring, and blurring it away defeats it.
 */
function _buildFilter(id) {
  const filter = document.createElementNS(SVG_NS, 'filter')
  filter.setAttribute('id', id)
  filter.setAttribute('x', '-40%')
  filter.setAttribute('y', '-40%')
  filter.setAttribute('width', '180%')
  filter.setAttribute('height', '180%')
  filter.setAttribute('color-interpolation-filters', 'sRGB')

  const feMap = document.createElementNS(SVG_NS, 'feImage')
  feMap.setAttribute('result', 'map')
  feMap.setAttribute('preserveAspectRatio', 'none')
  filter.appendChild(feMap)

  const feRing = document.createElementNS(SVG_NS, 'feImage')
  feRing.setAttribute('result', 'ringMask')
  feRing.setAttribute('preserveAspectRatio', 'none')
  filter.appendChild(feRing)

  // inside path — the frosted body
  const insideBlur = document.createElementNS(SVG_NS, 'feGaussianBlur')
  insideBlur.setAttribute('in', 'SourceGraphic')
  insideBlur.setAttribute('result', 'insideBlur')
  filter.appendChild(insideBlur)

  // ring path — sharper source, then displaced
  const ringBlur = document.createElementNS(SVG_NS, 'feGaussianBlur')
  ringBlur.setAttribute('in', 'SourceGraphic')
  ringBlur.setAttribute('result', 'ringSrc')
  filter.appendChild(ringBlur)

  const KEEP = [
    '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
    '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
    '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
  ]

  const displacements = []
  const channels = []
  for (let i = 0; i < 3; i++) {
    const d = document.createElementNS(SVG_NS, 'feDisplacementMap')
    d.setAttribute('in', 'ringSrc')
    d.setAttribute('in2', 'map')
    d.setAttribute('xChannelSelector', 'R')
    d.setAttribute('yChannelSelector', 'B')
    d.setAttribute('result', 'd' + i)
    filter.appendChild(d)
    displacements.push(d)

    const cm = document.createElementNS(SVG_NS, 'feColorMatrix')
    cm.setAttribute('in', 'd' + i)
    cm.setAttribute('type', 'matrix')
    cm.setAttribute('values', KEEP[i])
    cm.setAttribute('result', 'c' + i)
    filter.appendChild(cm)
    channels.push('c' + i)
  }

  const b1 = document.createElementNS(SVG_NS, 'feBlend')
  b1.setAttribute('in', channels[0])
  b1.setAttribute('in2', channels[1])
  b1.setAttribute('mode', 'screen')
  b1.setAttribute('result', 'c01')
  filter.appendChild(b1)

  const b2 = document.createElementNS(SVG_NS, 'feBlend')
  b2.setAttribute('in', 'c01')
  b2.setAttribute('in2', channels[2])
  b2.setAttribute('mode', 'screen')
  b2.setAttribute('result', 'ringOut')
  filter.appendChild(b2)

  // weights.ring — keep the refracted result only where the mask is opaque
  const ringPart = document.createElementNS(SVG_NS, 'feComposite')
  ringPart.setAttribute('in', 'ringOut')
  ringPart.setAttribute('in2', 'ringMask')
  ringPart.setAttribute('operator', 'in')
  ringPart.setAttribute('result', 'ringPart')
  filter.appendChild(ringPart)

  // weights.inside — the frosted body everywhere the mask is not
  const insidePart = document.createElementNS(SVG_NS, 'feComposite')
  insidePart.setAttribute('in', 'insideBlur')
  insidePart.setAttribute('in2', 'ringMask')
  insidePart.setAttribute('operator', 'out')
  insidePart.setAttribute('result', 'insidePart')
  filter.appendChild(insidePart)

  const combined = document.createElementNS(SVG_NS, 'feComposite')
  combined.setAttribute('in', 'ringPart')
  combined.setAttribute('in2', 'insidePart')
  combined.setAttribute('operator', 'over')
  combined.setAttribute('result', 'combined')
  filter.appendChild(combined)

  // applyTint — mix(color, tintColor, strength). A colour matrix does this in
  // one pass: scale the channels by (1 - strength) and add tint * strength
  // through the constant column.
  const tint = document.createElementNS(SVG_NS, 'feColorMatrix')
  tint.setAttribute('in', 'combined')
  tint.setAttribute('type', 'matrix')
  filter.appendChild(tint)

  _ensureDefs().appendChild(filter)
  return { filter, feMap, feRing, insideBlur, ringBlur, displacements, tint }
}

// ── Overlays ─────────────────────────────────────────────────────────────────
function _createBevel(el) {
  const span = document.createElement('span')
  span.setAttribute('aria-hidden', 'true')
  Object.assign(span.style, {
    position: 'absolute', inset: '0', borderRadius: 'inherit',
    pointerEvents: 'none', backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat', mixBlendMode: 'overlay', zIndex: '3',
  })
  el.appendChild(span)
  return span
}

const _RIM_MASK = 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)'

function _refreshHighlight(h) {
  const rect = h.el.getBoundingClientRect()
  if (!rect.width) return
  const ox = ((_mouseX - (rect.left + rect.width * 0.5)) / (rect.width * 0.5)) * 100
  const oy = ((_mouseY - (rect.top + rect.height * 0.5)) / (rect.height * 0.5)) * 100
  const angle = 135 + ox * 1.2
  const p1 = Math.max(10, 33 + oy * 0.3)
  const p2 = Math.min(90, 66 + oy * 0.4)
  const g = a =>
    `linear-gradient(${angle.toFixed(1)}deg, rgba(255,255,255,${a}) ${p1.toFixed(1)}%, rgba(255,255,255,0) ${p2.toFixed(1)}%)`
  h.s1.style.background = g((0.12 + Math.abs(ox) * 0.0008).toFixed(3))
  h.s2.style.background = g((0.32 + Math.abs(ox) * 0.0008).toFixed(3))
}

function _createHighlight(el) {
  const base = {
    position: 'absolute', inset: '0', borderRadius: 'inherit',
    padding: '1.5px', pointerEvents: 'none',
    WebkitMask: _RIM_MASK, WebkitMaskComposite: 'xor', maskComposite: 'exclude',
  }
  const s1 = document.createElement('span')
  Object.assign(s1.style, base, { mixBlendMode: 'screen', opacity: '0.65', zIndex: '1' })
  const s2 = document.createElement('span')
  Object.assign(s2.style, base, { mixBlendMode: 'overlay', opacity: '0.5', zIndex: '2' })
  el.appendChild(s1)
  el.appendChild(s2)

  const entry = { el, s1, s2 }
  _highlights.add(entry)
  _bindMouse()
  _refreshHighlight(entry)
  return () => { _highlights.delete(entry); s1.remove(); s2.remove() }
}

// ── Elasticity ───────────────────────────────────────────────────────────────
const ACTIVATION_ZONE = 200

function _smoothStep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function _refreshElastic(e) {
  const rect = e.el.getBoundingClientRect()
  if (!rect.width) return
  const dX = _mouseX < rect.left ? rect.left - _mouseX : _mouseX > rect.right ? _mouseX - rect.right : 0
  const dY = _mouseY < rect.top ? rect.top - _mouseY : _mouseY > rect.bottom ? _mouseY - rect.bottom : 0
  const factor = 1 - _smoothStep(0, ACTIVATION_ZONE, Math.hypot(dX, dY))

  if (factor < 0.001) {
    if (e._active) { e.el.style.transform = ''; e._active = false }
    return
  }
  e._active = true

  const cx = rect.left + rect.width * 0.5
  const cy = rect.top + rect.height * 0.5
  const nx = (_mouseX - cx) / (rect.width * 0.5)
  const ny = (_mouseY - cy) / (rect.height * 0.5)
  const str = e.elasticity

  const sx = Math.max(0.8, 1 + Math.abs(nx) * str * 0.3 - Math.abs(ny) * str * 0.15)
  const sy = Math.max(0.8, 1 + Math.abs(ny) * str * 0.3 - Math.abs(nx) * str * 0.15)

  e.el.style.transform =
    `translate(${((_mouseX - cx) * str * 0.04 * factor).toFixed(2)}px,` +
    `${((_mouseY - cy) * str * 0.04 * factor).toFixed(2)}px) ` +
    `scaleX(${(1 + (sx - 1) * factor).toFixed(4)}) scaleY(${(1 + (sy - 1) * factor).toFixed(4)})`
}

function _createElasticity(el, elasticity) {
  Object.assign(el.style, {
    transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
    willChange: 'transform',
  })
  const entry = { el, elasticity, _active: false }
  _elastics.add(entry)
  _bindMouse()
  return () => {
    _elastics.delete(entry)
    el.style.transform = ''
    el.style.transition = ''
    el.style.willChange = ''
  }
}

function _resolveRadius(el, w, h, override) {
  if (override != null) return override
  const raw = getComputedStyle(el).borderTopLeftRadius || '0px'
  const v = parseFloat(raw) || 0
  return raw.trim().endsWith('%') ? (v / 100) * Math.min(w, h) : v
}

export const GLASS_3D_DEFAULTS = {
  // Ring width as a fraction of the panel's smaller half-dimension. Theirs works
  // out at roughly 0.45 of the lens: (end - start) against the lens half-height.
  // This is the bevel, and the whole difference between a plate and a blob.
  band: 0.45,
  // Ramp across the ring. 1 is linear, which is what their
  // (sdfDist - start) / (end - start) actually is.
  falloff: 1,
  // Magnitude baked into the map, before the filter's own scale
  strength: 1,
  // feDisplacementMap scale in px. Positive samples outward along the ring's
  // direction, matching their uv + dir * refractionStrength. Theirs runs about
  // twice the ring width, which is why the reference smears so hard.
  scale: 160,
  // Per-channel scale offset — the chromatic aberration
  chroma: 14,
  // Feather on the ring's inner boundary, as a fraction of the band
  feather: 0.14,
  // Frost. blur is the body; the ring uses blur * edgeBlurMultiplier, and
  // theirs is 0.7 — the ring is sharper than the middle, not blurrier.
  blur: 7,
  edgeBlurMultiplier: 0.7,
  saturate: 1.35,
  brightness: 1.02,
  // Their tintStrength is 0.05 of a violet. Glass reads as glass when the tint
  // is a suggestion.
  tintStrength: 0.06,
  tintHue: 265,
  // Bevel lighting
  bevel: 0.85,
  bevelWidth: 0.75,
  bevelFalloff: 2,
  lightAngle: 135,
  // Depth cues
  innerShadow: 0.3,
  innerShadowSize: 28,
  rimLight: 0.5,
  // Interaction
  elasticity: 0,
  highlight: true,
  radius: null,
}

export function liquidGlass3d(el, opts) {
  const o = { ...GLASS_3D_DEFAULTS, ...opts }

  if (!supported) {
    const frosted = `blur(${Math.max(o.blur, 12)}px) saturate(${o.saturate})`
    el.style.backdropFilter = frosted
    el.style.webkitBackdropFilter = frosted
    const destroyHL = o.highlight ? _createHighlight(el) : null
    const destroyEL = o.elasticity ? _createElasticity(el, o.elasticity) : null
    return {
      supported: false,
      refresh() {},
      destroy() {
        el.style.backdropFilter = el.style.webkitBackdropFilter = ''
        destroyHL?.(); destroyEL?.()
      },
    }
  }

  const id = 'lg3d-' + (++_uid)
  const parts = _buildFilter(id)
  const bevelSpan = _createBevel(el)

  const prevShadow = el.style.boxShadow

  function refresh() {
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (!w || !h) return

    const radius = _resolveRadius(el, w, h, o.radius)
    const maps = _buildMaps(w, h, radius, o)

    for (const fe of [parts.feMap, parts.feRing]) {
      fe.setAttribute('width', w)
      fe.setAttribute('height', h)
    }
    parts.feMap.setAttribute('href', maps.displacement)
    parts.feRing.setAttribute('href', maps.ringMask)

    parts.insideBlur.setAttribute('stdDeviation', o.blur)
    parts.ringBlur.setAttribute('stdDeviation', (o.blur * o.edgeBlurMultiplier).toFixed(2))

    // Red displaced furthest out, blue least — their samples[0].x / [2].z split
    const scales = [o.scale + o.chroma, o.scale, o.scale - o.chroma]
    parts.displacements.forEach((d, i) => d.setAttribute('scale', scales[i].toFixed(1)))

    const s = Math.max(0, Math.min(1, o.tintStrength))
    const [tr, tg, tb] = _hslToRgb(o.tintHue, 0.6, 0.66)
    parts.tint.setAttribute('values', [
      1 - s, 0, 0, 0, (tr * s).toFixed(4),
      0, 1 - s, 0, 0, (tg * s).toFixed(4),
      0, 0, 1 - s, 0, (tb * s).toFixed(4),
      0, 0, 0, 1, 0,
    ].join(' '))

    bevelSpan.style.backgroundImage = `url(${maps.bevel})`

    // Inner shadow along the unlit side plus a thin rim light on the lit side:
    // the two together are what say "this has thickness" rather than "this is a
    // rectangle with a blur behind it".
    const theta = (o.lightAngle * Math.PI) / 180
    const ox = -Math.cos(theta) * o.innerShadowSize * 0.35
    const oy = -Math.sin(theta) * o.innerShadowSize * 0.35
    el.style.boxShadow = [
      prevShadow,
      `inset ${ox.toFixed(1)}px ${oy.toFixed(1)}px ${o.innerShadowSize}px rgba(20,26,14,${o.innerShadow})`,
      `inset ${(-ox * 0.6).toFixed(1)}px ${(-oy * 0.6).toFixed(1)}px ${(o.innerShadowSize * 0.6).toFixed(1)}px rgba(255,255,255,${o.rimLight * 0.5})`,
    ].filter(Boolean).join(', ')
  }

  refresh()
  // No blur() here — the two blurs live inside the filter so the ring and the
  // body can differ, which is the whole point of edgeBlurMultiplier.
  el.style.backdropFilter = el.style.webkitBackdropFilter =
    `url(#${id}) saturate(${o.saturate}) brightness(${o.brightness})`

  let timer = null
  const ro = new ResizeObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(refresh, 120)
  })
  ro.observe(el)

  const destroyHL = o.highlight ? _createHighlight(el) : null
  const destroyEL = o.elasticity ? _createElasticity(el, o.elasticity) : null

  return {
    supported: true,
    refresh,
    destroy() {
      ro.disconnect()
      clearTimeout(timer)
      parts.filter.remove()
      bevelSpan.remove()
      el.style.backdropFilter = el.style.webkitBackdropFilter = ''
      el.style.boxShadow = prevShadow
      destroyHL?.(); destroyEL?.()
    },
  }
}

export default liquidGlass3d
