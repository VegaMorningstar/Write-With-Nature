/**
 * The alphabet as twenty-six lenses of liquid glass.
 *
 * One canvas runs TypeGPU's liquid-glass shader over a union of 26 rounded
 * boxes (scene.ts), and twenty-six transparent <button> elements sit on top of
 * it carrying the behaviour — click handlers, keyboard focus, disabled state,
 * aria labels. The glass is drawn, the buttons are real; neither has to
 * compromise for the other.
 *
 * The letters are painted into the backdrop the shader refracts, not laid over
 * the canvas, so they sit *under* the glass and are displaced and split by it —
 * the same way the word RENDER sits under the jelly button.
 *
 * Wobble comes from the jelly's springs. They resize and shift each tile's box
 * in the uniform every frame, which is why the deformation is in the glass
 * itself rather than a CSS transform of a picture of glass.
 *
 * Without WebGPU this renders the buttons with a plain frosted CSS fallback:
 * the behaviour survives, the refraction does not.
 */
import { useRef, useEffect, useState } from 'react'
import { LETTERS, MATERIAL_DEFAULTS, POINTER_DEFAULTS, squashProperties, liftProperties } from './constants.ts'
import { Spring } from './spring.ts'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

export default function GlassAlphabet({
  material = MATERIAL_DEFAULTS,
  pointer = POINTER_DEFAULTS,
  available,
  onSelect,
  columns = 8,
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const buttonRefs = useRef([])
  const springsRef = useRef(null)
  const sceneRef = useRef(null)
  const [focused, setFocused] = useState(-1)

  const m = { ...MATERIAL_DEFAULTS, ...material }
  const p = { ...POINTER_DEFAULTS, ...pointer }

  // The render loop reads these rather than closing over them, so tuning a
  // slider does not tear down and rebuild the WebGPU pipeline.
  const matRef = useRef(m)
  const ptrRef = useRef(p)
  const availRef = useRef(available)
  useEffect(() => { matRef.current = m; ptrRef.current = p; availRef.current = available })

  const rows = Math.ceil(LETTERS.length / columns)
  // Room for the lens: the visible tile is the box inflated by `edge`, so the
  // grid needs that much clearance before the canvas would clip its own rim.
  const pad = Math.ceil(m.edge) + 6
  const stride = m.size + m.gap
  const width = pad * 2 + columns * m.size + (columns - 1) * m.gap
  const height = pad * 2 + rows * m.size + (rows - 1) * m.gap

  const cellAt = i => ({
    x: pad + (i % columns) * stride,
    y: pad + Math.floor(i / columns) * stride,
  })

  // ── Springs, and the frame loop that feeds them to the shader ──────────────
  useEffect(() => {
    const squash = LETTERS.map(() => new Spring(squashProperties))
    const lift = LETTERS.map(() => new Spring(liftProperties))
    springsRef.current = { squash, lift }

    let raf = 0
    let last = 0
    let lastPointer = null
    let lastNudge = 0

    const tick = now => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(last ? (now - last) / 1000 : 0, 0.1)
      last = now
      if (dt <= 0) return

      // Fixed substeps — explicit Euler on springs this stiff diverges past
      // roughly 60ms, and one stalled frame would otherwise blow them up.
      const steps = Math.min(Math.ceil(dt / (1 / 240)), 32)
      const step = dt / steps
      for (let s = 0; s < steps; s++) {
        for (let i = 0; i < LETTERS.length; i++) {
          squash[i].step(step)
          lift[i].step(step)
        }
      }

      // The buttons follow the glass so the hit target stays under what is drawn
      for (let i = 0; i < LETTERS.length; i++) {
        const btn = buttonRefs.current[i]
        if (!btn) continue
        const sq = squash[i].value
        btn.style.transform =
          `translateY(${(-lift[i].value * 40).toFixed(2)}px) scale(${(1 + sq).toFixed(4)}, ${(1 - sq * 0.7).toFixed(4)})`
      }
    }
    raf = requestAnimationFrame(tick)

    const onMove = e => {
      const cfg = ptrRef.current
      const now = performance.now()

      const travelled = lastPointer
        ? Math.hypot(e.clientX - lastPointer[0], e.clientY - lastPointer[1])
        : 0
      lastPointer = [e.clientX, e.clientY]
      if (now - lastNudge < cfg.throttleMs) return
      lastNudge = now

      const speed = Math.min(travelled / Math.max(cfg.sensitivity, 1), 1) * cfg.strength
      if (speed <= 0.001) return

      // Proximity in tile widths, so the disturbance follows the cursor across
      // the grid rather than hitting everything equally
      for (let i = 0; i < LETTERS.length; i++) {
        const btn = buttonRefs.current[i]
        if (!btn) continue
        const r = btn.getBoundingClientRect()
        const dist = Math.hypot(
          e.clientX - (r.left + r.width / 2),
          e.clientY - (r.top + r.height / 2),
        ) / Math.max(r.width, 1)
        const falloff = Math.max(0, 1 - dist / Math.max(cfg.radius, 0.01))
        if (falloff <= 0) continue
        const amount = speed * falloff * falloff * cfg.gain
        squash[i].velocity += amount
        lift[i].velocity += amount * 0.6
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
      springsRef.current = null
    }
  }, [])

  // ── The glass ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gpuSupported) return
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    let cancelled = false
    let cleanup = null

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupAlphabet } = await import('./scene.ts')
        const { createTileBackdrop } = await import('./backdrop.js')
        if (cancelled) return

        const backdrop = createTileBackdrop()
        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupAlphabet(root, context, backdrop.canvas)
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        scene.beforeFrame = () => {
          const mm = matRef.current
          const springs = springsRef.current
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
          backdrop.resize(rect, dpr)

          // Layout, in this canvas's own CSS pixels
          const localPad = Math.ceil(mm.edge) + 6
          const localStride = mm.size + mm.gap
          const H = rect.height

          const letters = []
          const tiles = []
          for (let i = 0; i < LETTERS.length; i++) {
            const sq = springs ? springs.squash[i].value : 0
            const ly = springs ? springs.lift[i].value : 0

            const cx = localPad + (i % columns) * localStride + mm.size / 2
            const cy = localPad + Math.floor(i / columns) * localStride + mm.size / 2 - ly * 40

            // Squash the box itself, so the deformation happens in the glass
            const halfPx = mm.size / 2
            const hx = halfPx * (1 + sq) - mm.edge
            const hy = halfPx * (1 - sq * 0.7) - mm.edge

            // Into box space: canvas heights on both axes, which is what makes
            // the shader's isotropic space line up with square pixels.
            tiles.push({ cx: cx / H, cy: cy / H, hx: hx / H, hy: hy / H })

            const has = !availRef.current || availRef.current.has(LETTERS[i])
            letters.push({ letter: LETTERS[i], x: cx, y: cy, alpha: has ? 1 : 0.3 })
          }
          scene.setTiles(tiles)

          // Radius is measured on the box, which is inset by `edge`; the visible
          // corner is that plus the inflation, so subtract to land on the value
          // the user asked for. Never larger than the box it rounds.
          const boxRadius = Math.max(0, mm.radius - mm.edge) / H
          scene.setParams({
            radius: Math.min(boxRadius, Math.max(mm.size / 2 - mm.edge, 0.5) / H),
            start: mm.ringStart / H,
            end: Math.max(mm.edge / H, 0.0005),
            chromaticStrength: mm.chromaticStrength,
            refractionStrength: mm.refractionStrength,
            blur: mm.blur,
            edgeFeather: mm.edgeFeather,
            edgeBlurMultiplier: mm.edgeBlurMultiplier,
            tintStrength: mm.tintStrength,
            tintR: mm.tintR, tintG: mm.tintG, tintB: mm.tintB,
            chromaticFalloff: mm.chromaticFalloff,
          })

          backdrop.update(letters, {
            size: mm.letterSize,
            weight: mm.letterWeight,
            r: mm.letterR, g: mm.letterG, b: mm.letterB,
            opacity: mm.letterOpacity,
          })
        }

        sceneRef.current = scene
        cleanup = () => { scene.onCleanup(); root.destroy() }
      } catch (e) {
        console.warn('[GlassAlphabet] init failed:', e)
      }
    }

    init()
    return () => {
      cancelled = true
      cleanup?.()
      sceneRef.current = null
    }
  }, [columns])

  // ── Impulses ───────────────────────────────────────────────────────────────
  const kick = (index, squashAmount, liftAmount, reach) => {
    const springs = springsRef.current
    if (!springs) return
    const oc = cellAt(index)
    for (let i = 0; i < LETTERS.length; i++) {
      const c = cellAt(i)
      const dist = Math.hypot(oc.x - c.x, oc.y - c.y) / Math.max(stride, 1)
      const falloff = Math.max(0, 1 - dist / reach)
      if (falloff <= 0) continue
      const f = falloff * falloff
      springs.squash[i].velocity += squashAmount * f
      springs.lift[i].velocity += liftAmount * f
    }
  }

  // Crossing into a tile wobbles it whether or not the cursor was moving fast
  // enough for the travel-based nudge to fire, so a slow approach still lands.
  const enter = index => {
    const cfg = ptrRef.current
    kick(index, cfg.hoverImpulse * 6, cfg.hoverImpulse * 3, 2)
    const springs = springsRef.current
    if (springs) springs.lift[index].target = cfg.hoverLift / 40
  }
  const leave = index => {
    const springs = springsRef.current
    if (springs) springs.lift[index].target = 0
  }
  const press = index => {
    const cfg = ptrRef.current
    kick(index, -cfg.clickImpulse * 8, cfg.clickImpulse * 4, 2.5)
  }

  // Only when there is no WebGPU. With the shader running, the buttons are
  // invisible hit targets and every pixel comes from the canvas.
  const fallbackStyle = has => (gpuSupported ? null : {
    background: 'rgba(255,255,255,0.14)',
    backdropFilter: 'blur(8px) saturate(150%)',
    WebkitBackdropFilter: 'blur(8px) saturate(150%)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: `rgba(28,26,16,${has ? 0.6 : 0.25})`,
    fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: m.letterWeight,
    fontSize: m.letterSize,
  })

  return (
    <div
      ref={hostRef}
      style={{
        position: 'relative',
        width,
        height,
        margin: '0 auto',
        // The canvas sits at the bottom of this element's own stacking context,
        // so it cannot fall behind the page the way a negative z-index would.
        isolation: 'isolate',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      />
      {LETTERS.map((letter, i) => {
        const has = !available || available.has(letter)
        const cell = cellAt(i)
        return (
          <button
            key={letter}
            ref={el => { buttonRefs.current[i] = el }}
            type="button"
            disabled={!has}
            aria-label={`Show Landsat scenes for ${letter}`}
            onClick={() => { press(i); onSelect?.(letter) }}
            onPointerEnter={() => enter(i)}
            onPointerLeave={() => leave(i)}
            onFocus={() => { setFocused(i); enter(i) }}
            onBlur={() => { setFocused(-1); leave(i) }}
            style={{
              position: 'absolute',
              left: cell.x,
              top: cell.y,
              width: m.size,
              height: m.size,
              padding: 0,
              borderRadius: m.radius,
              // The glass is the canvas underneath; this is behaviour only
              background: 'transparent',
              border: 'none',
              color: 'transparent',
              cursor: has ? 'pointer' : 'default',
              outline: focused === i ? '2px solid rgba(74,124,63,0.75)' : 'none',
              outlineOffset: 2,
              willChange: 'transform',
              ...fallbackStyle(has),
            }}
          >
            {gpuSupported ? '' : letter}
          </button>
        )
      })}
    </div>
  )
}
