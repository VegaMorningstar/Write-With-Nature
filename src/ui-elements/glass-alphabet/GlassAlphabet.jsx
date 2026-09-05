/**
 * The alphabet as a grid of frosted glass keys.
 *
 * Twenty-six real <button> elements: click handlers, keyboard focus, screen
 * reader labels, disabled state, and the letter as DOM text.
 *
 * The glass is a backdrop-filter running the component's own SVG filter. That
 * filter refracts the backdrop three times at three displacement scales and
 * takes one colour channel from each, which is the same construction as the
 * WebGPU liquid glass sampling three refractive indices — so the tiles show
 * real chromatic aberration on whatever is behind them, not a coloured outline
 * painted on. A second, much finer displacement roughens the result, and a
 * speckle over the fill supplies the dust: together, frost.
 *
 * Each tile takes its colour from a field centred on the grid, so the bloom
 * runs through the middle instead of 26 identical squares.
 *
 * Springs give the wobble. They drive a CSS transform on the button itself, so
 * the tile and its letter are the same element and cannot drift apart.
 */
import { useRef, useEffect, useState, useId } from 'react'
import { LETTERS, MATERIAL_DEFAULTS, POINTER_DEFAULTS, squashProperties, liftProperties } from './constants.ts'
import { Spring } from './spring.ts'

const rgb = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
const mix = (a, b, t) => a + (b - a) * t

// A channel isolator. Red-only and blue-only layers are recombined with `screen`
// rather than added: for inputs whose channels are disjoint, screen is exact,
// and it leaves alpha at 1 instead of tripling it the way an arithmetic add on
// premultiplied colour would.
const CHANNEL = {
  R: '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0',
  G: '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0',
  B: '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0',
}

const speckle = opacity =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='${opacity.toFixed(3)}'/%3E%3C/svg%3E")`

export default function GlassAlphabet({
  material = MATERIAL_DEFAULTS,
  pointer = POINTER_DEFAULTS,
  available,
  onSelect,
  columns = 8,
}) {
  const hostRef = useRef(null)
  const buttonRefs = useRef([])
  const springsRef = useRef(null)
  const [focused, setFocused] = useState(-1)

  const m = { ...MATERIAL_DEFAULTS, ...material }
  const p = { ...POINTER_DEFAULTS, ...pointer }
  const pointerCfg = useRef(p)
  useEffect(() => { pointerCfg.current = p })

  // Filters live in this component, so an instance carries its own glass and
  // does not depend on the host page having declared one.
  const uid = useId().replace(/:/g, '')
  const filterId = `${uid}-glass`

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

  // Spreads an impulse from one tile across its neighbours, in tile widths.
  const kick = (index, squashAmount, liftAmount, reach) => {
    const springs = springsRef.current
    const origin = buttonRefs.current[index]?.getBoundingClientRect()
    if (!springs || !origin) return
    for (let i = 0; i < LETTERS.length; i++) {
      const r = buttonRefs.current[i]?.getBoundingClientRect()
      if (!r) continue
      const dist = Math.hypot(origin.left - r.left, origin.top - r.top) / Math.max(r.width, 1)
      const falloff = Math.max(0, 1 - dist / reach)
      if (falloff <= 0) continue
      const f = falloff * falloff
      springs.squash[i].velocity += squashAmount * f
      springs.lift[i].velocity += liftAmount * f
    }
  }

  // Crossing into a tile wobbles it, whether or not the cursor was moving fast
  // enough for the travel-based nudge above to fire — so a slow approach still
  // gets a response.
  const enter = index => {
    const cfg = pointerCfg.current
    kick(index, cfg.hoverImpulse * 6, cfg.hoverImpulse * 3, 2)
    const springs = springsRef.current
    if (springs) springs.lift[index].target = cfg.hoverLift / 40
  }

  const leave = index => {
    const springs = springsRef.current
    if (springs) springs.lift[index].target = 0
  }

  const press = index => {
    const cfg = pointerCfg.current
    kick(index, -cfg.clickImpulse * 8, cfg.clickImpulse * 4, 2.5)
  }

  const frost = `url(#${filterId}) blur(${m.blur}px) saturate(${m.saturate}%) brightness(${m.brightness})`
  // Red bends least, blue most — spread the three passes around `refraction`.
  const rScale = m.refraction * (1 + m.chromatic)
  const bScale = m.refraction * (1 - m.chromatic)

  return (
    <>
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          {/* The lens: broad fractal noise, softened, used as a displacement map */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency={`${m.refractionScale} ${m.refractionScale}`}
            numOctaves="2"
            seed="47"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="2" result="map" />

          {/* Three refractive indices, one channel kept from each */}
          <feDisplacementMap in="SourceGraphic" in2="map" scale={rScale} xChannelSelector="R" yChannelSelector="G" result="rPass" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={m.refraction} xChannelSelector="R" yChannelSelector="G" result="gPass" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale={bScale} xChannelSelector="R" yChannelSelector="G" result="bPass" />
          <feColorMatrix in="rPass" type="matrix" values={CHANNEL.R} result="rOnly" />
          <feColorMatrix in="gPass" type="matrix" values={CHANNEL.G} result="gOnly" />
          <feColorMatrix in="bPass" type="matrix" values={CHANNEL.B} result="bOnly" />
          <feBlend in="rOnly" in2="gOnly" mode="screen" result="rg" />
          <feBlend in="rg" in2="bOnly" mode="screen" result="lens" />

          {/* Grain: fine roughness on the refracted result. Distinct from the
              lens above, which warps the whole surface rather than pitting it. */}
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="9" result="rough" />
          <feDisplacementMap in="lens" in2="rough" scale={m.roughness} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

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
              onPointerEnter={() => enter(i)}
              onPointerLeave={() => leave(i)}
              onFocus={() => { setFocused(i); enter(i) }}
              onBlur={() => { setFocused(-1); leave(i) }}
              style={{
                width: m.size,
                height: m.size,
                borderRadius: m.radius,
                cursor: has ? 'pointer' : 'default',
                opacity: has ? 1 : 0.35,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                // Refraction, then frost, over whatever the page puts behind it
                backdropFilter: frost,
                WebkitBackdropFilter: frost,
                // Face: speckle for the dust, the tile's own colour rising from
                // one corner, a corner sheen, then the white fill. Every one of
                // these adds opacity, so each stops well short of covering the
                // tile — a sheen across a corner reads as glass, the same wash
                // over the whole face reads as a painted chip.
                backgroundImage: [
                  speckle(m.grain * 0.12),
                  `radial-gradient(110% 110% at 22% 118%, ${rgb(r, g, b, m.tintStrength * 0.9)} 0%, transparent 55%)`,
                  `linear-gradient(${m.faceAngle}deg, rgba(255,255,255,${m.faceGradient}) 0%, rgba(255,255,255,0) 48%)`,
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
                transition: 'opacity 0.2s',
              }}
            >
              {tile.letter}
            </button>
          )
        })}
      </div>
    </>
  )
}
