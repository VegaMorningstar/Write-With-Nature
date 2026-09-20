/**
 * A row of toolbar buttons rendered as the alphabet's liquid glass.
 *
 * Same shader, same backdrop, same springs — the only thing this adds over
 * GlassAlphabet is that the boxes are not all the same width, so a word can
 * sit in one and a glyph in another. The shader already held half-extents per
 * tile; nothing there had to change to allow it.
 *
 * The labels are painted into the backdrop the lens refracts, so they sit
 * under the glass and are displaced and split by it, rather than being laid
 * over a picture of glass.
 *
 * Unlike the alphabet, this falls back to real CSS buttons whenever the glass
 * is not actually running — not merely when WebGPU is missing, but whenever
 * init fails for any reason. An alphabet that fails to draw is a browsing aid
 * gone missing; a toolbar that fails to draw is Save and Clear gone missing,
 * so the buttons stay visible and keep working and the refraction is the only
 * thing lost.
 */
import { useRef, useEffect, useState } from 'react'
import { BUTTON_MATERIAL } from './constants.ts'
import { POINTER_DEFAULTS } from '../glass-alphabet/constants.ts'
import { Spring } from '../glass-alphabet/spring.ts'
import { squashProperties, liftProperties } from '../glass-alphabet/constants.ts'

const FOCUS_CSS = `
.gb-key { outline: none; -webkit-tap-highlight-color: transparent; }
.gb-key:focus-visible { outline: 2px solid rgba(74,124,63,0.8); outline-offset: 3px; }
`

export default function GlassButtons({
  items,
  material = BUTTON_MATERIAL,
  pointer = POINTER_DEFAULTS,
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const buttonRefs = useRef([])
  const springsRef = useRef(null)

  const m = { ...BUTTON_MATERIAL, ...material }
  const p = { ...POINTER_DEFAULTS, ...pointer }

  // Only once the shader is genuinely drawing do the buttons hand their own
  // appearance over to it.
  const [glassReady, setGlassReady] = useState(false)

  const matRef = useRef(m)
  const ptrRef = useRef(p)
  const itemsRef = useRef(items)
  useEffect(() => { matRef.current = m; ptrRef.current = p; itemsRef.current = items })

  const widths = items.map(it => it.width ?? m.size)
  const pad = Math.ceil(m.edge) + 6
  const xs = []
  let run = pad
  for (const w of widths) { xs.push(run); run += w + m.gap }
  const width = run - m.gap + pad
  const height = pad * 2 + m.size

  // ── Springs, and the frame loop that feeds them to the shader ─────────────
  useEffect(() => {
    const squash = items.map(() => new Spring(squashProperties))
    const lift = items.map(() => new Spring(liftProperties))
    springsRef.current = { squash, lift }

    let raf = 0
    let last = 0

    const tick = now => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(last ? (now - last) / 1000 : 0, 0.1)
      last = now
      if (dt <= 0) return

      // Fixed substeps, as on the alphabet: explicit Euler on springs this
      // stiff diverges past roughly 60ms, and one stalled frame blows them up.
      const steps = Math.min(Math.ceil(dt / (1 / 240)), 32)
      const step = dt / steps
      for (let s = 0; s < steps; s++) {
        for (let i = 0; i < squash.length; i++) { squash[i].step(step); lift[i].step(step) }
      }

      // The hit target follows the glass, so what you press is what you see.
      for (let i = 0; i < squash.length; i++) {
        const btn = buttonRefs.current[i]
        if (!btn) continue
        const sq = squash[i].value
        btn.style.transform =
          `translateY(${(-lift[i].value * 40).toFixed(2)}px) scale(${(1 + sq).toFixed(4)}, ${(1 - sq * 0.7).toFixed(4)})`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); springsRef.current = null }
  }, [items.length])

  // ── The glass ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.gpu) return
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    let cancelled = false
    let cleanup = null

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupTileGlass } = await import('../glass-alphabet/scene.ts')
        const { createTileBackdrop } = await import('../glass-alphabet/backdrop.js')
        if (cancelled) return

        const backdrop = createTileBackdrop()
        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupTileGlass(root, context, backdrop.paper, backdrop.letters, {
          tileCount: itemsRef.current.length,
        })
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

          const localPad = Math.ceil(mm.edge) + 6
          const H = rect.height
          const list = itemsRef.current

          const glyphs = []
          const tiles = []
          // The shortest half-extent in the row, which is the height's — the
          // wide button is wide, not tall. What the corner radius and the
          // body's dispersion depth are both measured against.
          const halfBox = Math.max(mm.size / 2 - mm.edge, 0.5)
          let cursor = localPad

          for (let i = 0; i < list.length; i++) {
            const w = list[i].width ?? mm.size
            const sq = springs ? springs.squash[i].value : 0
            const ly = springs ? springs.lift[i].value : 0

            const cx = cursor + w / 2
            const cy = localPad + mm.size / 2 - ly * 40
            cursor += w + mm.gap

            // Squash the box itself, so the deformation is in the glass rather
            // than in a CSS transform of a picture of it.
            const hx = (w / 2) * (1 + sq) - mm.edge
            const hy = (mm.size / 2) * (1 - sq * 0.7) - mm.edge

            const glow = springs
              ? Math.min(
                (Math.abs(springs.squash[i].velocity) * 0.05 +
                  Math.abs(springs.squash[i].value) * 1.4) * ptrRef.current.glowGain,
                1.2,
              )
              : 0

            tiles.push({ cx: cx / H, cy: cy / H, hx: hx / H, hy: hy / H, glow, tint: list[i].tint })
            glyphs.push({ letter: list[i].label, x: cx, y: cy, alpha: 1 })
          }
          scene.setTiles(tiles)

          scene.setParams({
            // Never larger than the box it rounds — the shortest half-extent
            // here is the height's, since the wide button is wide, not tall.
            radius: Math.min(Math.max(0, mm.radius - mm.edge) / H, halfBox / H),
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
            edgeCurve: mm.edgeCurve,
            bodyChromatic: mm.bodyChromatic,
            bodyDepth: halfBox / H,
            letterBlur: mm.letterBlur,
            letterR: mm.letterR, letterG: mm.letterG, letterB: mm.letterB,
            glowStrength: mm.glowStrength,
            glowHalo: mm.glowHalo / H,
            glowR: mm.glowR, glowG: mm.glowG, glowB: mm.glowB,
            lightAzimuth: mm.lightAzimuth,
            lightElevation: mm.lightElevation,
            specularStrength: mm.specularStrength,
            specularPower: mm.specularPower,
            specR: mm.specR, specG: mm.specG, specB: mm.specB,
          })

          backdrop.update(glyphs, {
            size: mm.letterSize,
            weight: mm.letterWeight,
            opacity: mm.letterOpacity,
          })
        }

        if (!cancelled) setGlassReady(true)
        cleanup = () => { scene.onCleanup(); root.destroy() }
      } catch (e) {
        // The CSS buttons stay exactly as they are. Nothing is unreachable.
        console.warn('[GlassButtons] init failed, keeping plain buttons:', e)
      }
    }

    init()
    return () => {
      cancelled = true
      cleanup?.()
      setGlassReady(false)
    }
  }, [items.length])

  // ── Impulses ──────────────────────────────────────────────────────────────
  const kick = (index, squashAmount, liftAmount) => {
    const springs = springsRef.current
    if (!springs) return
    springs.squash[index].velocity += squashAmount
    springs.lift[index].velocity += liftAmount
  }
  const enter = index => {
    const cfg = ptrRef.current
    kick(index, cfg.hoverImpulse * 6, cfg.hoverImpulse * 3)
    const springs = springsRef.current
    if (springs) springs.lift[index].target = cfg.hoverLift / 40
  }
  const leave = index => {
    const springs = springsRef.current
    if (springs) springs.lift[index].target = 0
  }
  const press = index => {
    const cfg = ptrRef.current
    kick(index, -cfg.clickImpulse * 8, cfg.clickImpulse * 4)
  }

  return (
    <div
      ref={hostRef}
      style={{
        position: 'relative',
        width,
        height,
        // The canvas sits at the bottom of this element's own stacking context,
        // so it cannot fall behind the page the way a negative z-index would.
        isolation: 'isolate',
      }}
    >
      <style>{FOCUS_CSS}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none',
          opacity: glassReady ? 1 : 0,
        }}
      />
      {items.map((item, i) => (
        <button
          key={item.key}
          className={glassReady ? 'gb-key' : item.fallbackClass}
          ref={el => { buttonRefs.current[i] = el }}
          type="button"
          title={item.title}
          aria-label={item.title}
          onClick={() => { press(i); item.onClick?.() }}
          onPointerEnter={() => enter(i)}
          onPointerLeave={() => leave(i)}
          onFocus={() => enter(i)}
          onBlur={() => leave(i)}
          style={{
            position: 'absolute',
            left: xs[i],
            top: pad,
            width: widths[i],
            height: m.size,
            padding: 0,
            borderRadius: m.radius,
            cursor: 'pointer',
            willChange: 'transform',
            // The fallback classes carry their own padding, meant for a button
            // that sized itself to its text. These are given their width, so
            // centre what is in them.
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // With the shader running this is a hit target and nothing else;
            // every pixel you see comes from the canvas underneath.
            ...(glassReady
              ? { background: 'transparent', border: 'none', color: 'transparent' }
              : null),
          }}
        >
          {glassReady ? '' : item.label}
        </button>
      ))}
    </div>
  )
}
