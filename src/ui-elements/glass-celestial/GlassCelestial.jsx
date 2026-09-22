/**
 * The masthead ornament as a jelly of liquid glass: a sun that becomes a
 * crescent moon when pressed, and back.
 *
 * A real <button> over a canvas, the arrangement every glass element here uses —
 * the shader draws, the button behaves. It reports its state through onChange,
 * so a caller can hang the page theme off it: sun is the solarpunk ground, moon
 * the lunarpunk one.
 *
 * The change of state is a spring, not a transition. `morph` mixes the two
 * distance fields, so the rays retract into the crescent through shapes that are
 * still fields — the lens never stops being a lens — and because it is a spring
 * it overshoots, which is what makes it read as a flip rather than a fade.
 *
 * Without WebGPU it falls back to an SVG sun and moon. The behaviour and the
 * colour survive; the glass does not.
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { Spring } from '../glass-alphabet/spring.ts'
import {
  MATERIAL_DEFAULTS, POINTER_DEFAULTS, SUN, MOON,
  squashProperties, wobbleProperties, morphProperties,
} from './constants.ts'

/**
 * Whether the browser advertises WebGPU. Worth asking before going to the
 * trouble of an init — but NOT the question to hide a fallback on. A browser
 * can advertise it and still fail to hand over an adapter, and gating the
 * plain sun and moon on this once left an empty canvas where the ornament
 * should be. Use `glassReady`, set after the scene resolves. See GlassTitle
 * for the longer version.
 */
const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

/**
 * How much bigger the canvas is than the ornament, so the hover glow has room
 * to fade out inside it instead of being clipped by its edge. The shape is
 * scaled down by the same factor, so the ornament's size on screen does not
 * change — only the transparent margin around it.
 */
const SPREAD = 2

const FOCUS_CSS = `
.gc-btn { outline: none; -webkit-tap-highlight-color: transparent; background: none; border: none; padding: 0; }
.gc-btn:focus-visible { outline: 2px solid rgba(200,150,42,0.85); outline-offset: 4px; }
`

const mix = (a, b, t) => a + (b - a) * t

export default function GlassCelestial({
  size = 40,
  material = MATERIAL_DEFAULTS,
  pointer = POINTER_DEFAULTS,
  value,                 // 'sun' | 'moon', when the caller owns the state
  defaultValue = 'sun',
  onChange,
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const btnRef = useRef(null)

  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const state = value ?? uncontrolled
  const isMoon = state === 'moon'

  const m = { ...MATERIAL_DEFAULTS, ...material }
  const p = { ...POINTER_DEFAULTS, ...pointer }

  // Read by the frame loop rather than closed over, so changing state or tuning
  // a slider does not tear down the pipeline.
  // False until the shader is genuinely running, which is not the same as the
  // browser advertising WebGPU. The plain SVG stays up until it is.
  const [glassReady, setGlassReady] = useState(false)

  const matRef = useRef(m)
  const ptrRef = useRef(p)
  const targetRef = useRef(isMoon ? 1 : 0)
  const hoverRef = useRef(false)
  useEffect(() => {
    matRef.current = m
    ptrRef.current = p
    targetRef.current = isMoon ? 1 : 0
  })

  const springs = useRef(null)

  const toggle = useCallback(() => {
    const next = isMoon ? 'sun' : 'moon'
    if (value === undefined) setUncontrolled(next)
    onChange?.(next)
    // Kicked here rather than in the frame loop: the press is the impulse, and
    // deriving it from the state change would fire it again on any re-render
    // that happened to arrive with a different value.
    const s = springs.current
    if (s) {
      s.squash.velocity += ptrRef.current.clickImpulse
      s.wobble.velocity -= ptrRef.current.clickImpulse * 0.7
      s.flash()
    }
  }, [isMoon, value, onChange])

  useEffect(() => {
    if (!gpuSupported) return
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const squash = new Spring(squashProperties)
    const wobble = new Spring(wobbleProperties)
    const morph = new Spring(morphProperties)
    // Not a spring: a press should flare and fall back, not ring. A spring here
    // would dip the glow below its resting level on the overshoot, which reads
    // as the light guttering rather than flaring.
    let flash = 0
    morph.value = targetRef.current
    morph.target = targetRef.current
    springs.current = { squash, wobble, morph, flash: () => { flash = 1 } }

    let cancelled = false
    let cleanup = null
    let last = 0

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupCelestial } = await import('./scene.ts')
        const { createCelestialBackdrop, TEX_SIZE } = await import('./backdrop.js')
        if (cancelled) return

        const backdrop = createCelestialBackdrop()
        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupCelestial(root, context, backdrop.canvas, TEX_SIZE)
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        scene.beforeFrame = () => {
          const mm = matRef.current
          const pp = ptrRef.current
          const rect = host.getBoundingClientRect()
          if (!rect.width || !rect.height) return

          // Capped at 3 rather than the 2 used everywhere else, because this
          // is the smallest lens on the page and the only one asked to hold a
          // crescent. At 40px and a cap of 2 the whole ornament was 80x80
          // physical pixels, and the terminator — a curve subtracted from a
          // curve — was landing on a handful of them, which is what made it
          // read as stepped rather than as a moon. The backdrop texture is 256
          // square, so there is detail available to resolve; this is the thing
          // that was throwing it away.
          const dpr = Math.min(window.devicePixelRatio || 1, 3)

          // The canvas is drawn larger than the ornament, and the shape is
          // scaled down by the same factor, so what lands on screen is exactly
          // the size it was — with empty margin around it.
          //
          // That margin is the whole point. The hover glow is an exponential
          // falling off from the shape's edge, and the moon's outer arc sits
          // 0.245 from centre (0.17 x 1.44) shifted 0.05 left, leaving only
          // about 0.2 to the border — where the glow still had six per cent of
          // its strength, and the canvas cut it off square. With this margin
          // the border is more than three times further out in SDF units and
          // the glow is worth millionths by the time it gets there, so it ends
          // because it has faded rather than because it ran out of canvas.
          const padW = rect.width * SPREAD
          const padH = rect.height * SPREAD
          const cw = Math.max(2, Math.round(padW * dpr))
          const ch = Math.max(2, Math.round(padH * dpr))
          if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw
            canvas.height = ch
          }
          scene.setShapeScale(padW, padH, SPREAD)

          // The backdrop has to cover what the canvas covers, not what the
          // button covers, or the refraction samples the wrong slice of page.
          const grow = (SPREAD - 1) / 2
          backdrop.resize({
            left: rect.left - rect.width * grow,
            top: rect.top - rect.height * grow,
            width: padW,
            height: padH,
          })
          backdrop.update()

          const now = performance.now()
          const dt = Math.min(last ? (now - last) / 1000 : 0, 0.1)
          last = now
          if (dt > 0) {
            // Fixed substeps — explicit Euler on springs this stiff diverges
            // past roughly 60ms, and one stalled frame would blow them up.
            const steps = Math.min(Math.ceil(dt / (1 / 240)), 32)
            morph.target = targetRef.current
            for (let s = 0; s < steps; s++) {
              squash.step(dt / steps)
              wobble.step(dt / steps)
              morph.step(dt / steps)
            }
            flash *= Math.exp(-dt / pp.clickDecay)
          }

          // The morph runs past 0 and 1 on the overshoot, which is the point —
          // but a distance field mixed beyond its endpoints stops being either
          // shape, so the spring is allowed to ring and the value it feeds the
          // shader is clamped.
          const t = Math.max(0, Math.min(1, morph.value))
          const energy = Math.min(
            Math.abs(squash.velocity) * 0.04 + Math.abs(squash.value) * 1.2, 1.4,
          )
          // The brightest reason to be lit wins, rather than the three adding
          // up: summed, a press while hovering would run to twice the level a
          // press alone reaches, and the flash would read differently depending
          // on whether the cursor happened to be resting on it.
          // Resting brightness comes from the state, not the shared pointer
          // defaults: the moon needs far more of it than the sun, because it
          // has a night sky behind it to refract rather than paper. Mixed
          // through the morph so the change rides the shape rather than
          // stepping as it passes the halfway point.
          const idle = mix(SUN.idleGlow, MOON.idleGlow, t)
          const glow = Math.max(
            idle,
            hoverRef.current ? pp.hoverGlow : 0,
            flash * pp.clickGlow,
          ) + energy * pp.glowGain

          // Colour follows the morph, so the halo warms and cools with the shape
          // rather than switching under it.
          const tintStrength = mix(SUN.tintStrength, MOON.tintStrength, t)

          scene.setParams({
            ...mm,
            morph: t,
            // Anti-correlated, so the shape keeps roughly its area while it
            // deforms — a jelly that grows on both axes reads as a zoom.
            squashX: 1 + squash.value * pp.squashGain,
            squashY: 1 - squash.value * pp.squashGain * 0.75 + wobble.value * pp.wobbleGain,
            rayLength: mm.rayLength * (1 + squash.value * pp.rayStretch),
            tintStrength,
            tintR: mix(SUN.tintR, MOON.tintR, t),
            tintG: mix(SUN.tintG, MOON.tintG, t),
            tintB: mix(SUN.tintB, MOON.tintB, t),
            glowStrength: glow,
            glowHalo: pp.glowHalo,
            glowR: mix(SUN.glowR, MOON.glowR, t),
            glowG: mix(SUN.glowG, MOON.glowG, t),
            glowB: mix(SUN.glowB, MOON.glowB, t),
          })
        }

        if (!cancelled) setGlassReady(true)
        cleanup = () => { scene.onCleanup(); root.destroy() }
      } catch (e) {
        // The plain sun or moon stays up rather than an empty canvas.
        console.warn('[GlassCelestial] init failed, keeping the plain mark:', e)
      }
    }

    init()
    return () => {
      cancelled = true
      cleanup?.()
      springs.current = null
    }
  }, [])

  const hover = on => {
    hoverRef.current = on
    if (on && springs.current) {
      springs.current.squash.velocity += ptrRef.current.hoverImpulse
      springs.current.wobble.velocity += ptrRef.current.hoverImpulse * 0.5
    }
  }

  const label = isMoon ? 'Moon — switch to sun' : 'Sun — switch to moon'

  return (
    <div
      ref={hostRef}
      style={{
        position: 'relative', width: size, height: size, isolation: 'isolate',
        // The ornament sits in a flex row between two rules that both grow. A
        // flex item shrinks by default, and a squeezed box would compress what
        // the canvas draws into it rather than the layout around it.
        flexShrink: 0,
      }}
    >
      <style>{FOCUS_CSS}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        // Overhangs the host by (SPREAD-1)/2 on every side, centred on it. The
        // overhang is transparent and takes no pointer events, so it changes
        // nothing about the layout or the hit target — the button below is
        // still exactly the ornament's own box.
        style={{
          position: 'absolute',
          top: `${-(SPREAD - 1) * 50}%`,
          left: `${-(SPREAD - 1) * 50}%`,
          width: `${SPREAD * 100}%`,
          height: `${SPREAD * 100}%`,
          pointerEvents: 'none',
        }}
      />
      <button
        ref={btnRef}
        className="gc-btn"
        type="button"
        aria-label={label}
        aria-pressed={isMoon}
        title={label}
        onClick={toggle}
        onPointerEnter={() => hover(true)}
        onPointerLeave={() => hover(false)}
        onFocus={() => hover(true)}
        onBlur={() => hover(false)}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          cursor: 'pointer',
          borderRadius: '50%',
          color: isMoon ? 'rgba(198,164,255,0.95)' : 'rgba(226,150,40,0.95)',
        }}
      >
        {/* Only when there is no shader to draw it */}
        {!glassReady && (
          <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden="true">
            {isMoon ? (
              <path d="M15.5 3.2a9 9 0 1 0 5.3 11.4A7.2 7.2 0 0 1 15.5 3.2Z"
                fill="currentColor" opacity="0.75" />
            ) : (
              <>
                <circle cx="12" cy="12" r="5.5" fill="currentColor" opacity="0.75" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                  <line key={a}
                    x1="12" y1="1.6" x2="12" y2="4.8"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    transform={`rotate(${a} 12 12)`} opacity="0.75" />
                ))}
              </>
            )}
          </svg>
        )}
      </button>
    </div>
  )
}
