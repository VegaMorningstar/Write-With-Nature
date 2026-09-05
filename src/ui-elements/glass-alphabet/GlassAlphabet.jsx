/**
 * The alphabet as a grid of frosted glass buttons.
 *
 * Twenty-six real <button> elements — click handlers, keyboard focus, screen
 * reader semantics, and the letter as DOM text so it stays crisp and
 * selectable — with a single canvas behind them drawing all the glass. One
 * WebGPU device for the grid, not one per tile.
 *
 * The buttons' measured rects position the tiles in the shader, and the same
 * spring values drive both the shader and a CSS transform on the button, so a
 * tile and its letter wobble together rather than drifting apart.
 *
 * Without WebGPU it degrades to plain buttons, which still work.
 */
import { useRef, useEffect, useState } from 'react'
import { LETTERS, MATERIAL_DEFAULTS, POINTER_DEFAULTS, squashProperties, liftProperties } from './constants.ts'
import { Spring } from './spring.ts'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

export default function GlassAlphabet({
  material = MATERIAL_DEFAULTS,
  pointer = POINTER_DEFAULTS,
  available,          // Set of letters that have content; others render dimmed
  onSelect,
  columns = 9,
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const buttonRefs = useRef([])
  const sceneRef = useRef(null)
  const cleanupRef = useRef(null)

  const materialRef = useRef(material)
  const pointerCfgRef = useRef(pointer)
  useEffect(() => {
    materialRef.current = material
    sceneRef.current?.setParams(material)
  }, [material])
  useEffect(() => { pointerCfgRef.current = pointer }, [pointer])

  const [focused, setFocused] = useState(-1)
  // Set once the springs exist, so a click can reach them from outside the effect
  const pressRef = useRef(null)

  useEffect(() => {
    if (!gpuSupported) return
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return

    let cancelled = false
    let backdrop = null
    let ro = null
    let raf = 0

    // Per-tile springs. squash drives the shape, lift drives the glow.
    const squash = LETTERS.map(() => new Spring(squashProperties))
    const lift = LETTERS.map(() => new Spring(liftProperties))
    // Base geometry in shape space, remeasured only on resize — a transform
    // does not change layout, so the rects stay valid while tiles wobble.
    let rects = LETTERS.map(() => [0, 0, 0.05, 0.05])
    let pointerShape = [-99, -99]
    let lastPointer = null
    let lastNudge = 0
    let lastFrame = 0

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupGlassAlphabet } = await import('./scene.ts')
        const { getSharedBackdrop } = await import('../liquid-glass/backdrop.js')
        if (cancelled) return

        backdrop = getSharedBackdrop({ scale: 0.5 })

        const measure = scene => {
          const hostRect = host.getBoundingClientRect()
          if (!hostRect.width || !hostRect.height) return
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          canvas.width = Math.max(2, Math.round(hostRect.width * dpr))
          canvas.height = Math.max(2, Math.round(hostRect.height * dpr))

          const aspect = hostRect.width / hostRect.height
          scene?.setShapeScale(hostRect.width, hostRect.height)

          rects = buttonRefs.current.map(btn => {
            if (!btn) return [0, 0, 0.001, 0.001]
            const r = btn.getBoundingClientRect()
            // Shape space: y in 0..1 across the host, x in 0..aspect
            return [
              ((r.left + r.width / 2 - hostRect.left) / hostRect.width) * aspect,
              (r.top + r.height / 2 - hostRect.top) / hostRect.height,
              (r.width / 2) / hostRect.height,
              (r.height / 2) / hostRect.height,
            ]
          })
          scene?.setTileRects(rects)

          const vw = window.innerWidth
          const vh = window.innerHeight
          backdrop.resize(vw, vh)
          scene?.setViewportRect(
            { x: hostRect.left, y: hostRect.top, w: hostRect.width, h: hostRect.height }, vw, vh,
          )
        }

        measure(null)
        backdrop.update()

        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupGlassAlphabet(root, context, backdrop.canvas)
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        scene.beforeFrame = () => {
          backdrop.update()
          const hostRect = host.getBoundingClientRect()
          const vw = window.innerWidth
          const vh = window.innerHeight
          // The grid scrolls, so its slice of the backdrop moves every frame
          scene.setViewportRect(
            { x: hostRect.left, y: hostRect.top, w: hostRect.width, h: hostRect.height }, vw, vh,
          )
        }

        scene.setParams(materialRef.current)
        measure(scene)

        sceneRef.current = scene
        cleanupRef.current = () => { scene.onCleanup(); root.destroy() }

        ro = new ResizeObserver(() => measure(sceneRef.current))
        ro.observe(host)

        // ── Springs ───────────────────────────────────────────────────────
        const tick = now => {
          raf = requestAnimationFrame(tick)
          const dt = Math.min(lastFrame ? (now - lastFrame) / 1000 : 0, 0.1)
          lastFrame = now
          if (dt <= 0) return

          // Fixed substeps: explicit Euler on springs this stiff diverges past
          // roughly 60ms, and a stalled frame would otherwise blow them up.
          const steps = Math.min(Math.ceil(dt / (1 / 240)), 32)
          const step = dt / steps
          for (let s = 0; s < steps; s++) {
            for (let i = 0; i < LETTERS.length; i++) {
              squash[i].step(step)
              lift[i].step(step)
            }
          }

          scene.setTileStates(LETTERS.map((_, i) => [
            squash[i].value,
            -squash[i].value * 0.6,   // volume-ish: wider means shorter
            Math.abs(lift[i].value),
            0,
          ]))

          // Same numbers on the button, so the letter tracks its tile
          for (let i = 0; i < LETTERS.length; i++) {
            const btn = buttonRefs.current[i]
            if (!btn) continue
            const sx = 1 + squash[i].value
            const sy = 1 - squash[i].value * 0.6
            btn.style.transform = `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`
          }
        }
        raf = requestAnimationFrame(tick)

        // A click kicks its own tile hard and its neighbours a little, so the
        // press reads as landing on the grid rather than on one square.
        pressRef.current = (index, impulse) => {
          for (let i = 0; i < rects.length; i++) {
            const dx = rects[index][0] - rects[i][0]
            const dy = rects[index][1] - rects[i][1]
            const tileW = Math.max(rects[i][2] * 2, 0.001)
            const dist = Math.hypot(dx, dy) / tileW
            const falloff = Math.max(0, 1 - dist / 2.5)
            if (falloff <= 0) continue
            squash[i].velocity -= impulse * falloff * falloff
            lift[i].velocity += impulse * falloff * falloff * 0.6
          }
        }

        // ── Pointer ───────────────────────────────────────────────────────
        const onMove = e => {
          const cfg = pointerCfgRef.current
          const now = performance.now()
          const hostRect = host.getBoundingClientRect()
          if (!hostRect.width) return

          const aspect = hostRect.width / hostRect.height
          pointerShape = [
            ((e.clientX - hostRect.left) / hostRect.width) * aspect,
            (e.clientY - hostRect.top) / hostRect.height,
          ]
          sceneRef.current?.setPointer(pointerShape[0], pointerShape[1])

          const travelled = lastPointer
            ? Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1])
            : 0
          lastPointer = [e.clientX, e.clientY]
          if (now - lastNudge < cfg.throttleMs) return
          lastNudge = now

          const speed = Math.min(travelled / Math.max(cfg.sensitivity, 1), 1) * cfg.strength
          if (speed <= 0.001) return

          // Nudge by proximity, so the wave follows the cursor across the grid
          for (let i = 0; i < rects.length; i++) {
            const dx = pointerShape[0] - rects[i][0]
            const dy = pointerShape[1] - rects[i][1]
            const tileW = Math.max(rects[i][2] * 2, 0.001)
            const dist = Math.hypot(dx, dy) / tileW
            const falloff = Math.max(0, 1 - dist / Math.max(cfg.radius, 0.01))
            if (falloff <= 0) continue
            const amount = speed * falloff * falloff * cfg.gain
            squash[i].velocity += amount
            lift[i].velocity += amount * 0.8
          }
        }

        window.addEventListener('pointermove', onMove, { passive: true })
        cleanupRef.current = () => {
          window.removeEventListener('pointermove', onMove)
          cancelAnimationFrame(raf)
          scene.onCleanup()
          root.destroy()
        }
      } catch (e) {
        console.warn('[GlassAlphabet] init failed:', e)
      }
    }

    init()

    return () => {
      cancelled = true
      ro?.disconnect()
      cancelAnimationFrame(raf)
      cleanupRef.current?.()
      cleanupRef.current = null
      sceneRef.current = null
    }
  }, [])

  const press = i => pressRef.current?.(i, pointerCfgRef.current.clickImpulse)

  return (
    <div
      ref={hostRef}
      className="glass-alphabet"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 8,
        padding: 10,
      }}
    >
      {gpuSupported && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            pointerEvents: 'none',
            // Negative so the buttons paint above without a wrapper
            zIndex: -1,
          }}
        />
      )}

      {LETTERS.map((letter, i) => {
        const has = !available || available.has(letter)
        return (
          <button
            key={letter}
            ref={el => { buttonRefs.current[i] = el }}
            type="button"
            disabled={!has}
            aria-label={`Show Landsat scenes for ${letter}`}
            onClick={() => { press(i); onSelect?.(letter) }}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(-1)}
            style={{
              // Transparent: the canvas behind is the surface
              background: 'none',
              border: 'none',
              padding: '0.7rem 0',
              cursor: has ? 'pointer' : 'default',
              opacity: has ? 1 : 0.32,
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: 'rgba(28,26,16,0.72)',
              textShadow: '0 1px 2px rgba(255,255,255,0.5)',
              outline: focused === i ? '2px solid rgba(74,124,63,0.7)' : 'none',
              outlineOffset: 2,
              borderRadius: 10,
              willChange: 'transform',
              // The wobble is written straight to style.transform each frame
              transition: 'opacity 0.2s',
            }}
          >
            {letter}
          </button>
        )
      })}
    </div>
  )
}
