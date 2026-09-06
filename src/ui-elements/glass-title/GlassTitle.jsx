/**
 * The masthead, glazed.
 *
 * WRITE WITH NATURE as Landsat tiles under a sheet of liquid glass, running the
 * same shader as the glass alphabet and the same springs as the jelly. What
 * differs is what goes into the backdrop: the alphabet refracts the page and a
 * letter, this refracts the satellite imagery itself.
 *
 * The <img> elements stay in the DOM at zero opacity. They are not decoration
 * there — the browser loads and decodes them, `alt` still describes the scene,
 * and backdrop.js draws from those very elements each frame. Without WebGPU they
 * are simply made visible again and the masthead looks as it always did.
 *
 * Hover kicks a tile and its neighbours, clicking cycles the scene and kicks
 * harder, and the springs deform the boxes in the shader uniform rather than
 * transforming a picture of glass.
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { LETTERS, TITLE_LINES } from '../../data/letters'
import { Spring } from '../glass-alphabet/spring.ts'
import { MATERIAL_DEFAULTS, POINTER_DEFAULTS, squashProperties, liftProperties } from './constants.ts'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

const FOCUS_CSS = `
.gt-key { outline: none; -webkit-tap-highlight-color: transparent; background: none; border: none; padding: 0; }
.gt-key:focus-visible { outline: 2px solid rgba(200,150,42,0.9); outline-offset: 3px; }
`

/** Every letter in the masthead that has imagery, flattened with its position. */
function buildSlots(lines) {
  const slots = []
  lines.forEach((line, row) => {
    ;[...line].forEach((ch, col) => {
      if (ch !== ' ' && LETTERS[ch]) slots.push({ ch, row, col, key: `t-${row}-${col}-${ch}` })
    })
  })
  return slots
}

export default function GlassTitle({
  material = MATERIAL_DEFAULTS,
  pointer = POINTER_DEFAULTS,
  lines = TITLE_LINES,
}) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const buttonRefs = useRef([])
  const imgRefs = useRef([])
  const springsRef = useRef(null)

  const m = { ...MATERIAL_DEFAULTS, ...material }
  const p = { ...POINTER_DEFAULTS, ...pointer }

  const slots = buildSlots(lines)
  const count = slots.length

  // Which variant of each letter's imagery is showing. Clicking cycles it, the
  // way the masthead already does.
  const [variants, setVariants] = useState(() =>
    Object.fromEntries(slots.map(s => [s.key, Math.floor(Math.random() * LETTERS[s.ch].length)])),
  )

  // Tile size is derived from the host's width the same way the masthead derives
  // it, so a glazed row breaks exactly where the CSS one does.
  const [size, setSize] = useState(m.maxSize)
  const measure = useCallback(() => {
    const host = hostRef.current
    if (!host) return
    const avail = host.clientWidth - 2 * (Math.ceil(m.edge) + 6)
    if (avail <= 0) return
    let fit = m.maxSize
    lines.forEach(line => {
      const letters = [...line].filter(c => c !== ' ' && LETTERS[c]).length
      const spaces = [...line].filter(c => c === ' ').length
      const n = letters + spaces
      if (n < 1) return
      const each = (avail - (n - 1) * m.gap) / (letters + spaces * m.spaceRatio)
      if (each > 0) fit = Math.min(fit, each)
    })
    setSize(Math.max(m.minSize, Math.min(m.maxSize, Math.floor(fit))))
  }, [lines, m.edge, m.gap, m.maxSize, m.minSize, m.spaceRatio])

  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (hostRef.current) ro.observe(hostRef.current)
    return () => ro.disconnect()
  }, [measure])

  // ── Layout, in the canvas's own CSS pixels ─────────────────────────────────
  const pad = Math.ceil(m.edge) + 6
  const rowWidth = line => {
    const items = [...line].filter(c => c === ' ' || LETTERS[c])
    const w = items.reduce((a, c) => a + (c === ' ' ? size * m.spaceRatio : size), 0)
    return w + Math.max(items.length - 1, 0) * m.gap
  }
  const widest = Math.max(...lines.map(rowWidth), 1)
  const width = widest + pad * 2
  const height = lines.length * size + (lines.length - 1) * m.rowGap + pad * 2

  // Rows are centred, as .title-row is
  const cellFor = slot => {
    const line = lines[slot.row]
    let x = pad + (widest - rowWidth(line)) / 2
    for (let i = 0; i < slot.col; i++) {
      const c = line[i]
      if (c !== ' ' && !LETTERS[c]) continue
      x += (c === ' ' ? size * m.spaceRatio : size) + m.gap
    }
    return { x, y: pad + slot.row * (size + m.rowGap) }
  }
  const cells = slots.map(cellFor)

  // Layout the frame loop reads without re-running the WebGPU effect
  const layoutRef = useRef({ cells, size, pad, m, slots })
  layoutRef.current = { cells, size, pad, m, slots }
  const ptrRef = useRef(p)
  ptrRef.current = p

  // ── Springs ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const squash = Array.from({ length: count }, () => new Spring(squashProperties))
    const lift = Array.from({ length: count }, () => new Spring(liftProperties))
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
        for (let i = 0; i < count; i++) {
          squash[i].step(step)
          lift[i].step(step)
        }
      }

      // The buttons follow the glass, so the hit target stays under what is drawn
      for (let i = 0; i < count; i++) {
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

      for (let i = 0; i < count; i++) {
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
  }, [count])

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
        const { setupTileGlass } = await import('../glass-alphabet/scene.ts')
        const { createTitleBackdrop, MASK_W, MASK_H } = await import('./backdrop.js')
        if (cancelled) return

        const backdrop = createTitleBackdrop()
        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupTileGlass(root, context, backdrop.paper, backdrop.mask, {
          tileCount: count,
          maskW: MASK_W,
          maskH: MASK_H,
        })
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        scene.beforeFrame = () => {
          const L = layoutRef.current
          const mm = L.m
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

          const H = rect.height
          const halfBox = Math.max(L.size / 2 - mm.edge, 0.5)
          const tiles = []
          const drawList = []

          for (let i = 0; i < L.cells.length; i++) {
            const sq = springs ? springs.squash[i].value : 0
            const ly = springs ? springs.lift[i].value : 0
            const cx = L.cells[i].x + L.size / 2
            const cy = L.cells[i].y + L.size / 2 - ly * 40

            const halfPx = L.size / 2
            const hx = halfPx * (1 + sq) - mm.edge
            const hy = halfPx * (1 - sq * 0.7) - mm.edge

            const glow = springs
              ? Math.min(
                (Math.abs(springs.squash[i].velocity) * 0.05 +
                  Math.abs(springs.squash[i].value) * 1.4) * ptrRef.current.glowGain,
                1.2,
              )
              : 0

            tiles.push({ cx: cx / H, cy: cy / H, hx: hx / H, hy: hy / H, glow })

            // The imagery is drawn at the tile's full visible size — the box is
            // inset by `edge` because the shader inflates it back, but the
            // picture has to fill what you actually see.
            drawList.push({
              img: imgRefs.current[i],
              ch: L.slots[i].ch,
              cx,
              cy,
              w: L.size * (1 + sq),
              h: L.size * (1 - sq * 0.7),
            })
          }

          scene.setTiles(tiles)
          scene.setParams({
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
            bodyChromatic: mm.bodyChromatic,
            bodyDepth: halfBox / H,
            letterBlur: mm.letterBlur,
            letterR: mm.letterR, letterG: mm.letterG, letterB: mm.letterB,
            glowStrength: mm.glowStrength,
            glowHalo: mm.glowHalo / H,
            glowR: mm.glowR, glowG: mm.glowG, glowB: mm.glowB,
          })

          backdrop.update(drawList, {
            size: mm.letterSize,
            weight: mm.letterWeight,
            opacity: mm.letterOpacity,
          })
        }

        cleanup = () => { scene.onCleanup(); root.destroy() }
      } catch (e) {
        console.warn('[GlassTitle] init failed:', e)
      }
    }

    init()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [count])

  // ── Impulses ───────────────────────────────────────────────────────────────
  const kick = (index, squashAmount, liftAmount, reach) => {
    const springs = springsRef.current
    if (!springs) return
    const origin = cells[index]
    for (let i = 0; i < count; i++) {
      const c = cells[i]
      const dist = Math.hypot(origin.x - c.x, origin.y - c.y) / Math.max(size + m.gap, 1)
      const falloff = Math.max(0, 1 - dist / reach)
      if (falloff <= 0) continue
      const f = falloff * falloff
      springs.squash[i].velocity += squashAmount * f
      springs.lift[i].velocity += liftAmount * f
    }
  }

  const enter = i => {
    const cfg = ptrRef.current
    kick(i, cfg.hoverImpulse * 6, cfg.hoverImpulse * 3, 2)
    const springs = springsRef.current
    if (springs) springs.lift[i].target = cfg.hoverLift / 40
  }
  const leave = i => {
    const springs = springsRef.current
    if (springs) springs.lift[i].target = 0
  }
  const press = (i, slot) => {
    kick(i, -ptrRef.current.clickImpulse * 8, ptrRef.current.clickImpulse * 4, 2.5)
    setVariants(prev => ({
      ...prev,
      [slot.key]: ((prev[slot.key] || 0) + 1) % LETTERS[slot.ch].length,
    }))
  }

  return (
    <div ref={hostRef} style={{ position: 'relative', width: '100%', height, isolation: 'isolate' }}>
      <style>{FOCUS_CSS}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      />
      {slots.map((slot, i) => {
        const list = LETTERS[slot.ch]
        const { url, label } = list[(variants[slot.key] || 0) % list.length]
        const cell = cells[i]
        return (
          <button
            key={slot.key}
            className="gt-key"
            ref={el => { buttonRefs.current[i] = el }}
            type="button"
            title={label}
            aria-label={`${slot.ch} — ${label}. Click for another scene.`}
            onClick={() => press(i, slot)}
            onPointerEnter={() => enter(i)}
            onPointerLeave={() => leave(i)}
            onFocus={() => enter(i)}
            onBlur={() => leave(i)}
            style={{
              position: 'absolute',
              left: cell.x,
              top: cell.y,
              width: size,
              height: size,
              borderRadius: m.radius,
              overflow: 'hidden',
              cursor: 'pointer',
              willChange: 'transform',
            }}
          >
            {/* Loaded and decoded by the browser, drawn into the backdrop by
                us. Invisible where the shader runs, since the canvas above is
                already showing a refracted copy — visible when it does not. */}
            <img
              ref={el => { imgRefs.current[i] = el }}
              src={url}
              alt={`${slot.ch} — ${label}`}
              style={{
                width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                opacity: gpuSupported ? 0 : 1,
              }}
            />
          </button>
        )
      })}
    </div>
  )
}
