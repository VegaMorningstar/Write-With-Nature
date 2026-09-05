/**
 * The alphabet as a grid of frosted glass keys.
 *
 * Twenty-six real <button> elements: click handlers, keyboard focus, screen
 * reader labels, disabled state, and the letter as DOM text. The glass is CSS —
 * a backdrop-filter frost, a white fill, a bright rim and a coloured halo —
 * because that is exactly what the look is made of, and it renders the same
 * everywhere rather than depending on WebGPU.
 *
 * Each tile takes its colour from a field centred on the grid, so the bloom runs
 * through the middle instead of 26 identical squares.
 *
 * Springs give the wobble. They drive a CSS transform on the button itself, so
 * the tile and its letter are the same element and cannot drift apart.
 */
import { useRef, useEffect, useState } from 'react'
import { LETTERS, MATERIAL_DEFAULTS, POINTER_DEFAULTS, squashProperties, liftProperties } from './constants.ts'
import { Spring } from './spring.ts'

const rgb = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
const mix = (a, b, t) => a + (b - a) * t

export default function GlassAlphabet({
  material = MATERIAL_DEFAULTS,
  pointer = POINTER_DEFAULTS,
  available,
  onSelect,
  columns = 9,
}) {
  const hostRef = useRef(null)
  const buttonRefs = useRef([])
  const springsRef = useRef(null)
  const [focused, setFocused] = useState(-1)

  const m = { ...MATERIAL_DEFAULTS, ...material }
  const p = { ...POINTER_DEFAULTS, ...pointer }
  const pointerCfg = useRef(p)
  useEffect(() => { pointerCfg.current = p })

  const rows = Math.ceil(LETTERS.length / columns)

  // Grid position of each tile, and the colour the field gives it there
  const tiles = LETTERS.map((letter, i) => {
    const col = i % columns
    const row = Math.floor(i / columns)
    const dx = col - (columns - 1) / 2
    const dy = row - (rows - 1) / 2
    const field = Math.exp(-(dx * dx + dy * dy) / Math.max(m.glowSpread * m.glowSpread, 0.01))
    return {
      letter,
      col,
      row,
      field,
      colour: [
        mix(m.farR, m.nearR, field),
        mix(m.farG, m.nearG, field),
        mix(m.farB, m.nearB, field),
      ],
    }
  })

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

      for (let i = 0; i < LETTERS.length; i++) {
        const btn = buttonRefs.current[i]
        if (!btn) continue
        const sq = squash[i].value
        const ly = lift[i].value
        btn.style.transform =
          `translateY(${(-ly * 40).toFixed(2)}px) scale(${(1 + sq).toFixed(4)}, ${(1 - sq * 0.7).toFixed(4)})`
      }
    }
    raf = requestAnimationFrame(tick)

    const onMove = e => {
      const host = hostRef.current
      if (!host) return
      const cfg = pointerCfg.current
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

  const press = index => {
    const springs = springsRef.current
    if (!springs) return
    const origin = buttonRefs.current[index]?.getBoundingClientRect()
    if (!origin) return
    // Kicks its own tile and its neighbours, so the press lands on the grid
    for (let i = 0; i < LETTERS.length; i++) {
      const r = buttonRefs.current[i]?.getBoundingClientRect()
      if (!r) continue
      const dist = Math.hypot(
        origin.left - r.left,
        origin.top - r.top,
      ) / Math.max(r.width, 1)
      const falloff = Math.max(0, 1 - dist / 2.5)
      if (falloff <= 0) continue
      springs.squash[i].velocity -= pointerCfg.current.clickImpulse * falloff * falloff * 8
      springs.lift[i].velocity += pointerCfg.current.clickImpulse * falloff * falloff * 4
    }
  }

  const frost = `blur(${m.blur}px) saturate(${m.saturate}%) brightness(${m.brightness})`

  return (
    <div
      ref={hostRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, ${m.size}px)`,
        gap: m.gap,
        justifyContent: 'center',
        padding: m.glowBlur / 2,
      }}
    >
      {tiles.map((tile, i) => {
        const has = !available || available.has(tile.letter)
        const [r, g, b] = tile.colour
        const glowAlpha = m.glowStrength * (0.35 + tile.field * 0.65)

        return (
          <button
            key={tile.letter}
            ref={el => { buttonRefs.current[i] = el }}
            type="button"
            disabled={!has}
            aria-label={`Show Landsat scenes for ${tile.letter}`}
            onClick={() => { press(i); onSelect?.(tile.letter) }}
            onFocus={() => setFocused(i)}
            onBlur={() => setFocused(-1)}
            style={{
              width: m.size,
              height: m.size,
              borderRadius: m.radius,
              cursor: has ? 'pointer' : 'default',
              opacity: has ? 1 : 0.35,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // The frost, over whatever the page puts behind it
              backdropFilter: frost,
              WebkitBackdropFilter: frost,
              // Face: the tile's own colour rising from one corner, over a white
              // wash. The wash is what reads as frosted.
              backgroundImage: [
                `radial-gradient(120% 120% at 25% 115%, ${rgb(r, g, b, m.tintStrength * 0.9)} 0%, transparent 62%)`,
                `linear-gradient(${m.faceAngle}deg, rgba(255,255,255,${m.faceGradient}) 0%, rgba(255,255,255,0) 65%)`,
                `linear-gradient(0deg, rgba(255,255,255,${m.fill}), rgba(255,255,255,${m.fill}))`,
              ].join(', '),
              border: `${m.borderWidth}px solid rgba(255,255,255,${m.border})`,
              boxShadow: [
                // Outer halo in the tile's own colour
                `0 0 ${m.glowBlur}px ${rgb(r, g, b, glowAlpha)}`,
                // Rim: bright along the top, shaded along the bottom
                `inset 0 ${m.borderWidth}px 1px rgba(255,255,255,${m.innerTop})`,
                `inset 0 -${m.borderWidth}px 2px ${rgb(90, 80, 170, m.innerBottom)}`,
              ].join(', '),
              color: rgb(m.letterR, m.letterG, m.letterB, m.letterOpacity),
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: m.letterWeight,
              fontSize: m.letterSize,
              lineHeight: 1,
              outline: focused === i ? '2px solid rgba(74,124,63,0.8)' : 'none',
              outlineOffset: 3,
              willChange: 'transform',
              // transform is written directly each frame by the spring loop
              transition: 'opacity 0.2s, box-shadow 0.2s',
            }}
          >
            {tile.letter}
          </button>
        )
      })}
    </div>
  )
}
