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
  squashProperties, morphProperties,
} from './constants.ts'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

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
      s.wobble.velocity -= ptrRef.current.clickImpulse * 0.6
    }
  }, [isMoon, value, onChange])

  useEffect(() => {
    if (!gpuSupported) return
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const squash = new Spring(squashProperties)
    const wobble = new Spring(squashProperties)
    const morph = new Spring(morphProperties)
    morph.value = targetRef.current
    morph.target = targetRef.current
    springs.current = { squash, wobble, morph }

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

          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          const cw = Math.max(2, Math.round(rect.width * dpr))
          const ch = Math.max(2, Math.round(rect.height * dpr))
          if (canvas.width !== cw || canvas.height !== ch) {
            canvas.width = cw
            canvas.height = ch
          }
          scene.setShapeScale(rect.width, rect.height)
          backdrop.resize(rect)
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
          }

          // The morph runs past 0 and 1 on the overshoot, which is the point —
          // but a distance field mixed beyond its endpoints stops being either
          // shape, so the spring is allowed to ring and the value it feeds the
          // shader is clamped.
          const t = Math.max(0, Math.min(1, morph.value))
          const energy = Math.min(
            Math.abs(squash.velocity) * 0.04 + Math.abs(squash.value) * 1.2, 1.4,
          )
          const glow =
            (hoverRef.current ? pp.hoverGlow : 0) + energy * pp.glowGain

          // Colour follows the morph, so the halo warms and cools with the shape
          // rather than switching under it.
          const tintStrength = mix(SUN.tintStrength, MOON.tintStrength, t)

          scene.setParams({
            ...mm,
            morph: t,
            squashX: 1 + squash.value * pp.squashGain,
            squashY: 1 - squash.value * pp.squashGain * 0.7 + wobble.value * pp.squashGain * 0.3,
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

        cleanup = () => { scene.onCleanup(); root.destroy() }
      } catch (e) {
        console.warn('[GlassCelestial] init failed:', e)
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
    }
  }

  const label = isMoon ? 'Moon — switch to sun' : 'Sun — switch to moon'

  return (
    <div ref={hostRef} style={{ position: 'relative', width: size, height: size, isolation: 'isolate' }}>
      <style>{FOCUS_CSS}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
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
        {!gpuSupported && (
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
