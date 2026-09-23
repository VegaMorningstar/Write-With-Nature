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
 * Falls back to real CSS buttons whenever the glass is not actually running —
 * not merely when WebGPU is missing, but whenever init fails for any reason.
 * A toolbar that fails to draw is Save and Clear gone missing, so the buttons
 * stay visible and keep working and the refraction is the only thing lost.
 *
 * This was the only component that got that right to begin with, which is why
 * the toolbar survived failures that took the masthead, the alphabet and the
 * ornament out entirely. Those three now do the same. Do not reduce any of
 * them back to checking navigator.gpu: that asks whether the browser claims
 * WebGPU, not whether the glass drew, and the two part company more often
 * than you would think.
 */
import { useRef, useEffect, useState } from 'react'
import { BUTTON_MATERIAL } from './constants.ts'
import { tokens } from '../../theme.js'
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
          // Read per frame, so a theme switch lands on the next one.
          const glyph = tokens().buttonGlyph

          // A button can ask to be pressed. The ask is a steady glow in the
          // glass itself — the same halo the celestial jellies carry, not a
          // shadow cast behind a picture of one — breathing slowly so it reads
          // as lit rather than as a border. Its colour comes from the theme,
          // so it is sunlight on paper and moonlight at night.
          const urging = itemsRef.current.some(b => (b.glow ?? 0) > 0)
          const glowTint = urging ? tokens().buttonGlow : null
          // A narrow swing: the glow should look like it is breathing, not
          // blinking, and at full strength it fills the lens instead of
          // haloing it.
          const breath = 0.78 + 0.22 * Math.sin((performance.now() / 1000) * 1.4)
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

            // Press energy, plus whatever steady glow this button is asking
            // with. Kept well under the press glow's ceiling: the ask should
            // be noticeable and never look like the button is already down.
            const pressed = springs
              ? Math.min(
                (Math.abs(springs.squash[i].velocity) * 0.05 +
                  Math.abs(springs.squash[i].value) * 1.4) * ptrRef.current.glowGain,
                1.2,
              )
              : 0
            const glow = Math.min(pressed + (list[i].glow ?? 0) * 0.5 * breath, 1.4)

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
            // Both ends of the adaptive ramp get the same colour when the theme
            // pins one, which switches adaptation off without a second code
            // path in the shader: the mix has nothing left to mix between.
            letterR: glyph?.r ?? mm.letterR,
            letterG: glyph?.g ?? mm.letterG,
            letterB: glyph?.b ?? mm.letterB,
            letterLightR: glyph?.r ?? mm.letterLightR,
            letterLightG: glyph?.g ?? mm.letterLightG,
            letterLightB: glyph?.b ?? mm.letterLightB,
            inkLumLo: mm.inkLumLo,
            inkLumHi: mm.inkLumHi,
            inkSampleLevel: mm.inkSampleLevel,
            glowStrength: mm.glowStrength,
            // Barely wider than the material's own while a button is asking.
            // The glow falls off as exp(-distance / halo), and the canvas only
            // leaves `pad` — edge + 6, so 17px here — around the button. A
            // halo anywhere near that is still at a quarter strength when it
            // reaches the canvas edge, and what you see is the square border
            // cutting it off rather than a glow around the button. At this
            // width it is down to a couple of per cent by then, so the shape
            // it takes is the button's.
            glowHalo: (urging ? mm.glowHalo * 1.3 : mm.glowHalo) / H,
            glowR: glowTint?.r ?? mm.glowR,
            glowG: glowTint?.g ?? mm.glowG,
            glowB: glowTint?.b ?? mm.glowB,
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
