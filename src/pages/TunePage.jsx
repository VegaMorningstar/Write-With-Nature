/**
 * Write With Nature tuning — `?tune`.
 *
 * A stand-in for the real page, carrying the same elements the app ships, with
 * dials for the parts that belong to the app rather than to any one widget: the
 * fluid cursor and the three glass panels.
 *
 * Reusable widgets are not tuned here. They appear because the app has them, at
 * their shipped settings and with no props, so this page reflects production.
 * Their dials are on the UI workbench at `?ui`.
 */
import { useState, useRef, useEffect } from 'react'
import { liquidGlass } from '../lib/liquid-glass'
import { glassSupported } from '../hooks/usePanelGlass'
import JellyWireframeButton from '../ui-elements/jelly-wireframe-button/JellyWireframeButton'
import LiquidGlassPanel from '../ui-elements/liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from '../ui-elements/liquid-glass/panelPreset'
import LiquidGlassControls from './controls/LiquidGlassControls.jsx'
import GlassAlphabetControls from './controls/GlassAlphabetControls.jsx'
import GlassTitleControls from './controls/GlassTitleControls.jsx'
import GlassAlphabet from '../ui-elements/glass-alphabet/GlassAlphabet'
import {
  MATERIAL_DEFAULTS as ALPHA_MATERIAL,
  POINTER_DEFAULTS as ALPHA_POINTER,
} from '../ui-elements/glass-alphabet/constants.ts'
import GlassTitle from '../ui-elements/glass-title/GlassTitle'
import {
  MATERIAL_DEFAULTS as TITLE_MATERIAL,
  POINTER_DEFAULTS as TITLE_POINTER,
} from '../ui-elements/glass-title/constants.ts'

// Rebuilds the glass effect whenever opts change (slider-reactive)
function useLiveGlass(ref, opts) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current
    if (!el || !opts) return
    const glass = liquidGlass(el, opts)
    return () => glass.destroy()
  }, [ref, JSON.stringify(opts)]) // eslint-disable-line
}

// Fluid canvas — full remount when key prop changes (Apply button)
function TuneFluid({ opts, blendMode }) {
  const bootedRef = useRef(false)
  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    import('smokey-fluid-cursor').then(({ initFluid }) => {
      // See FluidCursor.jsx — the library registers a non-passive touchmove
      // listener on window and preventDefaults every one, which kills scrolling
      // on touch devices. Force those listeners passive around the init call.
      const originalAdd = window.addEventListener
      window.addEventListener = function (type, listener, options) {
        if (type === 'touchstart' || type === 'touchmove') {
          options = typeof options === 'object' && options !== null
            ? { ...options, passive: true }
            : { passive: true }
        }
        return originalAdd.call(this, type, listener, options)
      }
      // See FluidCursor.jsx for why preserveDrawingBuffer must be left alone —
      // forcing it true makes the colour accumulate instead of dissipating.
      try {
        initFluid({ transparent: true, id: 'tune-fluid-canvas', ...opts })
      } finally {
        window.addEventListener = originalAdd
      }
    })
  }, []) // eslint-disable-line
  return (
    <canvas id="tune-fluid-canvas" style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 5, mixBlendMode: blendMode,
    }} />
  )
}

// ── UI primitives ─────────────────────────────────────────────────────────────
const mono = { fontFamily: 'DM Mono, monospace' }

function Slider({ label, value, min, max, step = 0.01, fmt, onChange, description }) {
  const display = fmt ? fmt(value) : value.toFixed(step >= 1 ? 0 : 2)
  return (
    <label style={{ display: 'block', marginBottom: description ? 13 : 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ ...mono, fontSize: 10, color: '#4a7c3f', minWidth: 40, textAlign: 'right' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#4a7c3f', cursor: 'pointer', display: 'block' }}
      />
      {description && (
        <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.36)', marginTop: 3, lineHeight: 1.55 }}>
          {description}
        </div>
      )}
    </label>
  )
}

function Toggle({ label, value, onChange, description }) {
  return (
    <div style={{ marginBottom: description ? 13 : 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: description ? 3 : 0 }}>
        <span style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em' }}>{label}</span>
        <button onClick={() => onChange(!value)} style={{
          ...mono, fontSize: 9, padding: '2px 10px', cursor: 'pointer', borderRadius: 4,
          border: `1px solid ${value ? '#4a7c3f' : 'rgba(0,0,0,0.15)'}`,
          background: value ? 'rgba(74,124,63,0.16)' : 'rgba(255,255,255,0.4)',
          color: value ? '#1a3a0a' : '#999', minWidth: 38, textAlign: 'center',
        }}>{value ? 'ON' : 'OFF'}</button>
      </div>
      {description && (
        <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.36)', lineHeight: 1.55 }}>
          {description}
        </div>
      )}
    </div>
  )
}

function Chips({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)} style={{
            ...mono, fontSize: 9, padding: '3px 8px', cursor: 'pointer', borderRadius: 4,
            border: `1px solid ${value === opt ? '#4a7c3f' : 'rgba(0,0,0,0.12)'}`,
            background: value === opt ? 'rgba(74,124,63,0.14)' : 'rgba(255,255,255,0.45)',
            color: value === opt ? '#2a4a1a' : '#777',
          }}>{opt}</button>
        ))}
      </div>
    </div>
  )
}

function AccordionSection({ title, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={onToggle} style={{
        ...mono, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 8px', marginBottom: open ? 10 : 0,
        background: 'rgba(74,124,63,0.07)', border: 'none', borderRadius: 5,
        cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a1a', textAlign: 'left',
      }}>
        <span>{title}</span>
        <span style={{ opacity: 0.45, fontSize: 8 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ paddingBottom: 4 }}>{children}</div>}
    </div>
  )
}

function GlassSection({ title, opts, onChange, open, onToggle }) {
  const set = (k, v) => onChange({ ...opts, [k]: v })
  return (
    <AccordionSection title={title} open={open} onToggle={onToggle}>
      <Slider label="Scale"            value={opts.scale}               min={-200} max={-20}  step={1}    fmt={v => v.toFixed(0)} onChange={v => set('scale', v)} />
      <Slider label="Chroma"           value={opts.chroma}              min={0}    max={15}   step={0.1}  onChange={v => set('chroma', v)} />
      <Slider label="Blur (px)"        value={opts.blur}                min={0}    max={60}   step={0.5}  onChange={v => set('blur', v)} />
      <Slider label="Saturate"         value={opts.saturate}            min={1}    max={3}    step={0.05} onChange={v => set('saturate', v)} />
      <Slider label="Aberration Rim"   value={opts.aberrationIntensity} min={0}    max={20}   step={0.5}  onChange={v => set('aberrationIntensity', v)} />
      <Slider label="Elasticity"       value={opts.elasticity}          min={0}    max={1}    step={0.01} onChange={v => set('elasticity', v)} />
      <Chips  label="Map Mode" value={opts.mode} options={['standard', 'polar', 'prominent']} onChange={v => set('mode', v)} />
    </AccordionSection>
  )
}

// ── Defaults (match current app values) ──────────────────────────────────────
const FLUID_DEF = {
  densityDissipation:  1.2,
  velocityDissipation: 1.6,
  pressure:            0.8,
  pressureIterations:  20,
  curl:                24,
  splatRadius:         0.30,
  splatForce:          5500,
  colorUpdateSpeed:    6,
  shading:             true,
}
const BLEND_DEF = 'multiply'
const GLASS_DEF = {
  compose:  { scale: -80, chroma: 5, blur: 2.5, saturate: 1.3, aberrationIntensity: 6, elasticity: 0, mode: 'standard'  },
  board:    { scale: -60, chroma: 4, blur: 2.5, saturate: 1.3, aberrationIntensity: 8, elasticity: 0, mode: 'prominent' },
  colophon: { scale: -80, chroma: 5, blur: 2.5, saturate: 1.3, aberrationIntensity: 5, elasticity: 0, mode: 'polar'     },
}


// TypeGPU's own defaults for their liquid-glass example, unchanged. Kept as
// plain numbers here; the component turns them back into the vectors the
// uniform wants.

// Same shader, laid over the page instead of a photo. Starts bigger and rounder
// than their lozenge, since it has a whole viewport to sit in.
// The wireframe carries its own complete material now — its glass has diverged
// from the render button's far enough (no Fresnel rim, much less transparent)
// that inheriting would misrepresent it.

// Stiffness sets the wobble frequency, damping sets how fast it dies. The pair
// that matters is the damping ratio, damping / (2 * sqrt(stiffness * mass)):
const PANEL_GLASS_DEF = { ...PANEL_GLASS }

// index.css values, except the input radius — 45 to sit inside the panel's own
// curve rather than fighting it.
const RADII_DEF = {
  panel: 20,      // .compose-card, .board, .colophon
  input: 45,      // textarea
  tile: 7,        // .tile
}

// The colophon's A-Z, now twenty-six lenses of liquid glass rather than CSS
// cells. Its corner radius lives in here and not in RADII_DEF, because the
// shader insets it by the edge width instead of applying it to a border box.
// The masthead, now the glazed element rather than a flex collage of divs.
const TITLE_DEF = {
  material: { ...TITLE_MATERIAL },
  pointer: { ...TITLE_POINTER },
}

const ALPHA_DEF = {
  material: { ...ALPHA_MATERIAL },
  pointer: { ...ALPHA_POINTER },
}

/**
 * Frost on the compose input.
 *
 * index.css already gives it blur(16px) saturate(160%), but that was tuned
 * against the old CSS panel. The liquid glass behind it is busier — it refracts
 * and disperses — so the input needs more separation from it to read as its own
 * surface rather than a hole in the panel.
 */
const FROST_DEF = {
  blur: 26,
  saturate: 170,
  brightness: 0.91,
  bgAlpha: 0.22,
  borderAlpha: 0.4,
  svgFilter: true,
  // Grain. Real frosted glass is a roughened surface, so it does two things at
  // once: it scatters what is behind it at a fine scale, and the roughness
  // itself catches light as speckle. Blur alone gives neither.
  grain: 0.3,        // speckle painted onto the surface
  grainScale: 0.85,  // turbulence frequency — high is fine dust, low is mottling
  scatter: 2,        // micro-displacement of the backdrop, the refractive half
}

/** Tileable turbulence, painted over the fill as the surface's own texture. */
const grainTexture = (frequency, opacity) =>
  'data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' ` +
    "numOctaves='4' stitchTiles='stitch'/></filter>" +
    `<rect width='140' height='140' filter='url(#n)' opacity='${opacity}'/></svg>`,
  )

const TILE_COLORS = [
  '#6e9e7e','#5a8a62','#7aac72','#4a8e7e','#8aba88',
  '#6a9e6a','#5a7e8a','#7aaa98','#8ab08a','#6e8a5a',
]

// ── Main component ────────────────────────────────────────────────────────────
export default function TunePage() {
  // Fluid state
  const [fluidKey,     setFluidKey]     = useState(0)
  const [appliedFluid, setAppliedFluid] = useState(FLUID_DEF)
  const [pendingFluid, setPendingFluid] = useState(FLUID_DEF)
  const [blendMode,    setBlendMode]    = useState(BLEND_DEF)

  // Glass state
  const [composeG,  setComposeG]  = useState(GLASS_DEF.compose)
  const [boardG,    setBoardG]    = useState(GLASS_DEF.board)
  const [colophonG, setColophonG] = useState(GLASS_DEF.colophon)

  // Accordion open state
  const [openSection, setOpenSection] = useState('fluid')
  const toggle = (name) => setOpenSection(s => s === name ? null : name)

  // Refs for glass panels
  const composeRef  = useRef(null)
  const boardRef    = useRef(null)
  const colophonRef = useRef(null)

  // One shared parameter set across all three panels while the look is being
  // judged. Splitting it per panel later is a state change, nothing more.

  // Their shader, their parameters

  // The same shader laid over the real page


  // Liquid glass — the shipped panel surface
  const [panelGlass, setPanelGlass] = useState(PANEL_GLASS_DEF)
  const setPanel = (k, v) => setPanelGlass(p => ({ ...p, [k]: v }))

  // Edge curvature. The glass reads the element's computed border-radius, so
  // moving the panel value reshapes the lens with it.
  const [radii, setRadii] = useState(RADII_DEF)
  const setRadius = (k, v) => setRadii(r => ({ ...r, [k]: v }))
  const panelStyle = { borderRadius: radii.panel }

  const [frost, setFrost] = useState(FROST_DEF)
  const setFrostParam = (k, v) => setFrost(f => ({ ...f, [k]: v }))

  const [alpha, setAlpha] = useState(ALPHA_DEF)
  const setAlphaMat = (k, v) => setAlpha(s => ({ ...s, material: { ...s.material, [k]: v } }))
  const setAlphaPtr = (k, v) => setAlpha(s => ({ ...s, pointer: { ...s.pointer, [k]: v } }))

  const [title, setTitle] = useState(TITLE_DEF)
  const setTitleMat = (k, v) => setTitle(s => ({ ...s, material: { ...s.material, [k]: v } }))
  const setTitlePtr = (k, v) => setTitle(s => ({ ...s, pointer: { ...s.pointer, [k]: v } }))

  // Scatter goes last so it roughens the blurred backdrop rather than being
  // smoothed away by the blur that follows it.
  const frostFilter =
    `${frost.svgFilter ? 'url(#glass-element) ' : ''}` +
    `blur(${frost.blur}px) saturate(${frost.saturate}%) brightness(${frost.brightness})` +
    `${frost.scatter > 0 ? ' url(#frost-scatter)' : ''}`

  const inputStyle = {
    width: '100%',
    borderRadius: radii.input,
    // Speckle over the wash: background-image paints above background-color
    backgroundColor: `rgba(255,255,255,${frost.bgAlpha})`,
    backgroundImage: frost.grain > 0
      ? `url("${grainTexture(frost.grainScale, frost.grain)}")`
      : 'none',
    borderColor: `rgba(255,255,255,${frost.borderAlpha})`,
    backdropFilter: frostFilter,
    WebkitBackdropFilter: frostFilter,
  }

  // Where the shader owns the surface, the panel's own background, border and
  // outer glow have to go — they paint outside the canvas and would show as a
  // second edge beside the glass one.
  useEffect(() => {
    if (!glassSupported) return
    const els = [composeRef.current, boardRef.current, colophonRef.current].filter(Boolean)
    const prev = els.map(el => ({
      el,
      background: el.style.background,
      border: el.style.border,
      boxShadow: el.style.boxShadow,
      backdropFilter: el.style.backdropFilter,
    }))
    for (const el of els) {
      el.style.background = 'transparent'
      el.style.border = 'none'
      el.style.boxShadow = 'none'
      el.style.backdropFilter = el.style.webkitBackdropFilter = 'none'
    }
    return () => {
      for (const p of prev) Object.assign(p.el.style, p)
    }
  }, [])

  // Only where WebGPU is absent — otherwise LiquidGlassPanel has the surface
  useLiveGlass(composeRef,  glassSupported ? null : composeG)
  useLiveGlass(boardRef,    glassSupported ? null : boardG)
  useLiveGlass(colophonRef, glassSupported ? null : colophonG)


  const setFluid = (k, v) => setPendingFluid(p => ({ ...p, [k]: v }))

  const applyFluid = () => {
    setAppliedFluid({ ...pendingFluid })
    setFluidKey(k => k + 1)
  }

  const [copied, setCopied] = useState(false)
  const copyConfig = () => {
    const cfg = {
      fluid:   { ...appliedFluid, blendMode },
      glass:   { compose: composeG, board: boardG, colophon: colophonG },
      panelGlass,
      radii,
      frost,
      glassAlphabet: alpha,
      glassTitle: title,
    }
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => {
    setPendingFluid({ ...FLUID_DEF }); setAppliedFluid({ ...FLUID_DEF })
    setBlendMode(BLEND_DEF)
    setPanelGlass({ ...PANEL_GLASS_DEF })
    setRadii({ ...RADII_DEF })
    setFrost({ ...FROST_DEF })
    setAlpha(structuredClone(ALPHA_DEF))
    setTitle(structuredClone(TITLE_DEF))
    setComposeG({ ...GLASS_DEF.compose }); setBoardG({ ...GLASS_DEF.board }); setColophonG({ ...GLASS_DEF.colophon })
    setFluidKey(k => k + 1)
  }

  return (
    <>
      <TuneFluid key={fluidKey} opts={appliedFluid} blendMode={blendMode} />

      {/* SVG glass filter for inline elements (textarea, buttons, alpha-cells) */}
      <svg style={{ display: 'none', position: 'absolute' }} xmlns="http://www.w3.org/2000/svg">
        <filter id="glass-element" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" seed="47" result="noise"/>
          <feGaussianBlur in="noise" stdDeviation="2" result="softMap"/>
          <feSpecularLighting in="softMap" surfaceScale="6" specularConstant="1" specularExponent="140" lightingColor="white" result="specLight">
            <fePointLight x="-200" y="-200" z="300"/>
          </feSpecularLighting>
          <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specClipped"/>
          <feComposite in="SourceGraphic" in2="specClipped" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0" result="litSrc"/>
          <feDisplacementMap in="litSrc" in2="softMap" scale="28" xChannelSelector="R" yChannelSelector="G"/>
        </filter>

        {/* Micro-roughness: fine turbulence displacing the backdrop by a couple
            of pixels. This is the refractive half of frost — the surface
            scattering what is behind it, as distinct from the speckle painted
            on top of it. Kept separate from #glass-element, whose scale of 28
            is a glassy warp rather than a roughness. */}
        <filter id="frost-scatter" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={frost.grainScale} numOctaves="3" seed="9" result="rough"/>
          <feDisplacementMap in="SourceGraphic" in2="rough" scale={frost.scatter} xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>

      {/* ── Page content (offset right for control panel) ── */}
      <div style={{ paddingRight: 288 }}>
        <div className="page">

          {/* Header */}
          <div className="masthead">
            <span className="over">UI Tuning Mode · Write With Nature</span>
            <GlassTitle material={title.material} pointer={title.pointer} />
            <p className="sub">Move sliders → glass updates live · move cursor over panels for elasticity</p>
          </div>

          <svg className="vine" viewBox="0 0 960 24" fill="none">
            <path d="M0 12 Q80 3 160 12 Q240 21 320 12 Q400 3 480 12 Q560 21 640 12 Q720 3 800 12 Q880 21 960 12" stroke="rgba(74,124,63,0.18)" strokeWidth="1.2" fill="none"/>
            {[160,320,480,640,800].map(x => <ellipse key={x} cx={x} cy={x % 320 === 0 ? 18 : 6} rx="6" ry="3" fill="rgba(74,124,63,0.16)" transform={`rotate(${x % 320 === 0 ? 25 : -25} ${x} ${x % 320 === 0 ? 18 : 6})`}/>)}
            {[80,240,400,560,720,880].map(x => <circle key={x} cx={x} cy="12" r="2" fill="rgba(74,124,63,0.2)"/>)}
          </svg>

          {/* Compose card */}
          <section className="section">
            <div className="section-label">Compose · standard mode</div>
            <div className="compose-card" ref={composeRef} style={panelStyle}>
              <LiquidGlassPanel params={panelGlass} />
              <textarea
                rows={4}
                style={inputStyle}
                defaultValue={'Rivers, glaciers & coastlines — shaped into letters from orbit.\nEach line becomes its own row of satellite tiles.'}
              />
              {/* The shipped button, with no props — exactly as App.jsx mounts
                  it. Its own dials live on the UI workbench; it is here so this
                  page looks like the real compose card. */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                <JellyWireframeButton onClick={() => {}} />
              </div>
              <p className="compose-note">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                  <circle cx="7" cy="7" r="6" stroke="rgba(28,26,16,0.25)" strokeWidth="1"/>
                  <path d="M7 6v4M7 4.5v.5" stroke="rgba(28,26,16,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Glass sliders update live · move cursor close to this panel to feel the elasticity pull
              </p>
            </div>
          </section>

          {/* Board */}
          <section className="section" style={{ marginTop: '2rem' }}>
            <div className="collage-bar">
              <div className="section-label" style={{ marginBottom: 0 }}>Board · prominent mode &nbsp;<span style={{ opacity: 0.4, fontWeight: 300 }}>10 sample tiles</span></div>
            </div>
            <div className="board" ref={boardRef} style={panelStyle}>
              <LiquidGlassPanel params={panelGlass} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, position: 'relative', zIndex: 1, padding: '0.25rem 0' }}>
                {TILE_COLORS.map((c, i) => (
                  <div key={i} className="tile" style={{ width: 88, height: 88, background: c, borderRadius: radii.tile }}>
                    <div className="tile-wash" />
                    <span className="tile-char">{String.fromCharCode(65 + i)}</span>
                    <div className="tile-swap">↺</div>
                    <div className="tile-tip">{String.fromCharCode(65 + i)} · scene {i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <svg className="vine" viewBox="0 0 960 20" fill="none" style={{ marginTop: '3rem' }}>
            <path d="M0 10 Q60 2 120 10 Q180 18 240 10 Q300 2 360 10 Q420 18 480 10 Q540 2 600 10 Q660 18 720 10 Q780 2 840 10 Q900 18 960 10" stroke="rgba(74,124,63,0.14)" strokeWidth="1" fill="none"/>
          </svg>

          {/* Colophon */}
          <footer className="colophon" ref={colophonRef} style={panelStyle}>
            <LiquidGlassPanel params={panelGlass} />
            <div className="colophon-text">
              <h3>About this tool</h3>
              <p>All imagery from NASA's public domain <a href="https://science.nasa.gov/mission/landsat/outreach/your-name-in-landsat/" target="_blank" rel="noreferrer">Your Name in Landsat</a> project — real Landsat 8 &amp; 9 satellite scenes where Earth's surface naturally forms letter shapes from orbit. Click any tile to cycle its satellite scene.</p>
            </div>
            {/* Twenty-six lenses of liquid glass, each a real button. Clicking
                one only wobbles it for now; onSelect is where the Landsat grid
                for that letter will open. */}
            <GlassAlphabet material={alpha.material} pointer={alpha.pointer} />
          </footer>

        </div>
      </div>

      {/* ── Floating control panel ── */}
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 278,
        background: 'rgba(232,226,208,0.95)',
        backdropFilter: 'blur(18px) saturate(150%)',
        borderLeft: '1px solid rgba(74,124,63,0.14)',
        overflowY: 'auto', padding: '12px 12px 32px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        {/* Panel header */}
        <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(74,124,63,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ ...mono, fontSize: 11, fontWeight: 'bold', letterSpacing: '0.14em', color: '#1a2e0a' }}>UI TUNING</div>
              <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.38)', marginTop: 1 }}>Write With Nature</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
              <button onClick={copyConfig} style={btnStyle(copied)}>
                {copied ? '✓ Copied!' : 'Copy Config'}
              </button>
              <button onClick={resetAll} style={btnStyle(false, true)}>Reset All</button>
            </div>
          </div>
          <a href="?" style={{ ...mono, display: 'block', marginTop: 8, fontSize: 9, color: '#4a7c3f', textDecoration: 'none', letterSpacing: '0.06em' }}>
            ← Back to app
          </a>
        </div>

        {/* ── Fluid Cursor ── */}
        <AccordionSection title="FLUID CURSOR" open={openSection === 'fluid'} onToggle={() => toggle('fluid')}>

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            FADE &amp; PERSISTENCE
          </div>

          <Slider label="Density Dissipation" value={pendingFluid.densityDissipation} min={0.1} max={6} step={0.05}
            onChange={v => setFluid('densityDissipation', v)}
            description="How fast the color fades. Low = trails linger like wet ink. High = color evaporates almost instantly." />

          <Slider label="Velocity Dissipation" value={pendingFluid.velocityDissipation} min={0.1} max={4} step={0.05}
            onChange={v => setFluid('velocityDissipation', v)}
            description="How quickly the fluid's momentum dies. Low = fluid keeps drifting and swirling long after cursor stops. High = motion snaps to a halt the moment you lift." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            PRESSURE &amp; PHYSICS
          </div>

          <Slider label="Pressure" value={pendingFluid.pressure} min={0} max={1} step={0.01}
            onChange={v => setFluid('pressure', v)}
            description="How strongly the fluid resists compression. Low = soft and blobby, pools in place. High = tight and incompressible, spreads more evenly." />

          <Slider label="Pressure Iterations" value={pendingFluid.pressureIterations} min={1} max={50} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setFluid('pressureIterations', v)}
            description="How many solver passes per frame. Low (1–5) = fast but pressure distributes loosely, blobby edges. High (30–50) = more physically accurate, costs GPU." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            TURBULENCE &amp; SPIN
          </div>

          <Slider label="Curl (Vorticity)" value={pendingFluid.curl} min={0} max={60} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setFluid('curl', v)}
            description="Controls spiral energy. Low = smooth laminar ribbons that follow your motion. High = chaotic coiling vortices that spin and take on a life of their own." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            CURSOR STAMP
          </div>

          <Slider label="Splat Radius" value={pendingFluid.splatRadius} min={0.05} max={0.7} step={0.01}
            onChange={v => setFluid('splatRadius', v)}
            description="Size of the paint blob deposited at the cursor tip each frame. Low = fine hairline strokes. High = wide painterly blobs that cover more area." />

          <Slider label="Splat Force" value={pendingFluid.splatForce} min={500} max={12000} step={100}
            fmt={v => v.toFixed(0)} onChange={v => setFluid('splatForce', v)}
            description="How hard the cursor shoves the fluid outward. Low = gentle nudges, slow drift. High = explosive bursts that fling paint across the entire canvas." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            COLOUR &amp; LOOK
          </div>

          <Slider label="Color Speed" value={pendingFluid.colorUpdateSpeed} min={1} max={20} step={0.5}
            onChange={v => setFluid('colorUpdateSpeed', v)}
            description="Rate at which the hue cycles through the spectrum. Low = long sustained streaks of one colour. High = rapid rainbow flickering with every movement." />

          <Toggle label="Shading" value={pendingFluid.shading}
            onChange={v => setFluid('shading', v)}
            description="Simulated light on the fluid surface. ON = subtle 3D relief and gloss. OFF = flat uniform colour only." />

          <Chips label="Blend Mode" value={blendMode}
            options={['multiply', 'screen', 'overlay', 'normal', 'color-burn', 'soft-light']}
            onChange={setBlendMode}
          />
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.30)', marginBottom: 6, lineHeight: 1.6 }}>
            multiply = stains paper · screen = glowing light · overlay = both · normal = opaque
          </div>

          <div style={{ padding: '6px 0 2px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 6 }}>
              Blend mode applies instantly · all other params need Apply &amp; Restart
            </div>
            <button onClick={applyFluid} style={{
              ...mono, width: '100%', padding: '7px', cursor: 'pointer',
              background: 'rgba(74,124,63,0.14)', border: '1px solid rgba(74,124,63,0.28)',
              borderRadius: 6, fontSize: 10, letterSpacing: '0.1em', color: '#1a3a0a',
            }}>APPLY &amp; RESTART FLUID</button>
          </div>
        </AccordionSection>

        <div style={{ borderTop: '1px solid rgba(74,124,63,0.08)', margin: '4px 0 6px' }} />

        {/* ── Glass sections ── */}

        <AccordionSection title="PANEL GLASS" open={openSection === 'panelGlass'} onToggle={() => toggle('panelGlass')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            The shipped surface on all three panels. One set of values drives
            them all; paste a result into panelPreset.js.
          </div>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            The lens size is not among these. LiquidGlassPanel measures each
            element and derives rectW, rectH and the corner radius from it, so
            the placement sliders below do nothing — use EDGE CURVATURE to
            change the shape.
          </div>
          <LiquidGlassControls
            params={panelGlass}
            set={setPanel}
            mode="page"
            setMode={() => {}}
            follow={false}
            setFollow={() => {}}
          />
        </AccordionSection>

        <AccordionSection title="GLAZED MASTHEAD" open={openSection === 'title'} onToggle={() => toggle('title')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            WRITE WITH NATURE. The same shader as the alphabet, refracting the
            Landsat imagery itself rather than the page behind it.
          </div>
          <GlassTitleControls
            material={title.material}
            setMat={setTitleMat}
            pointer={title.pointer}
            setPtr={setTitlePtr}
          />
        </AccordionSection>

        <AccordionSection title="GLASS ALPHABET" open={openSection === 'alphabet'} onToggle={() => toggle('alphabet')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            The colophon&apos;s A&ndash;Z. Twenty-six lenses running TypeGPU&apos;s
            liquid glass in one draw call, with the letters in a texture beneath
            them so the glass refracts them rather than sitting over them.
          </div>
          <GlassAlphabetControls
            material={alpha.material}
            setMat={setAlphaMat}
            pointer={alpha.pointer}
            setPtr={setAlphaPtr}
          />
        </AccordionSection>

        <AccordionSection title="EDGE CURVATURE" open={openSection === 'radii'} onToggle={() => toggle('radii')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            The glass reads each panel&apos;s computed border-radius, so moving the
            panel value reshapes the lens with it — the two cannot drift apart.
          </div>

          <Slider label="Panel Radius (px)" value={radii.panel} min={0} max={60} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setRadius('panel', v)}
            description="Compose card, board and colophon. Also the outer curve of the liquid glass, since the lens is fitted to the element." />

          <Slider label="Input Radius (px)" value={radii.input} min={0} max={120} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setRadius('input', v)}
            description="The compose textarea. Concentric corners share a centre, so a curve that nests inside the panel's wants the panel radius minus the gap between them — but the input is much shorter than the panel, so a large radius reads as a lozenge rather than a rounded box. 45 leans into that deliberately." />

          <Slider label="Tile Radius (px)" value={radii.tile} min={0} max={40} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setRadius('tile', v)}
            description="The letter tiles on the board." />

        </AccordionSection>

        <AccordionSection title="INPUT FROST" open={openSection === 'frost'} onToggle={() => toggle('frost')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            The compose textarea sits on top of the liquid glass, so its frost is
            filtering the shader&apos;s output rather than the page. That output is
            busy — refracted and dispersed — so the input needs more separation
            than index.css gives it to read as its own surface instead of a hole
            in the panel.
          </div>

          <Slider label="Blur (px)" value={frost.blur} min={0} max={60} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setFrostParam('blur', v)}
            description="index.css ships 16, which was tuned against the old CSS panel." />

          <Slider label="Saturate (%)" value={frost.saturate} min={50} max={300} step={5}
            fmt={v => v.toFixed(0)} onChange={v => setFrostParam('saturate', v)}
            description="Keeps the colour behind it alive through the blur rather than washing to grey." />

          <Slider label="Brightness" value={frost.brightness} min={0.7} max={1.5} step={0.01}
            onChange={v => setFrostParam('brightness', v)}
            description="Below 1 the input sits back from the panel instead of glowing off it." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            GRAIN
          </div>

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            Real frosted glass is a roughened surface, and roughness does two
            separate things: it scatters what is behind it, and it catches light
            as speckle. Blur gives neither, which is why smooth blur reads as
            plastic. The two sliders below are those two halves.
          </div>

          <Slider label="Speckle" value={frost.grain} min={0} max={1} step={0.01}
            onChange={v => setFrostParam('grain', v)}
            description="Turbulence painted over the fill as the surface's own texture. This is the half you see directly." />

          <Slider label="Scatter" value={frost.scatter} min={0} max={12} step={0.5}
            fmt={v => v.toFixed(1)} onChange={v => setFrostParam('scatter', v)}
            description="Micro-displacement of the backdrop, in pixels — the refractive half. Applied after the blur, so it roughens the blurred image rather than being smoothed away by it. Past about 6 it stops reading as frost and starts to look like a warp." />

          <Slider label="Grain Scale" value={frost.grainScale} min={0.1} max={2} step={0.01}
            onChange={v => setFrostParam('grainScale', v)}
            description="Turbulence frequency, shared by both. High is fine dust; low mottles into visible clouds. Drives the speckle and the scatter together so they read as one surface." />

          <Slider label="Fill Opacity" value={frost.bgAlpha} min={0} max={0.6} step={0.01}
            onChange={v => setFrostParam('bgAlpha', v)}
            description="White wash over the blur. This is what actually makes it read as frosted rather than merely blurred — blur alone keeps the backdrop's brightness." />

          <Slider label="Border Opacity" value={frost.borderAlpha} min={0} max={1} step={0.01}
            onChange={v => setFrostParam('borderAlpha', v)}
            description="The 1px rim. With the panel's own border gone, this is the only hard edge left in the compose card." />

          <Toggle label="SVG glass filter" value={frost.svgFilter} onChange={v => setFrostParam('svgFilter', v)}
            description="The displacement filter from index.html that gives the input its own small refraction. OFF leaves a plain frost, which reads cleaner against the liquid glass but flatter." />
        </AccordionSection>

        <div style={{ borderTop: '1px solid rgba(74,124,63,0.08)', margin: '4px 0 6px' }} />

        <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.3)', margin: '0 0 8px', lineHeight: 1.6 }}>
          Below: the CSS glass, which now only runs where WebGPU is missing —
          Safari, Firefox, iOS. Inert in this browser if the panels above are
          rendering.
        </div>

        <GlassSection title="FALLBACK GLASS — COMPOSE"  opts={composeG}  onChange={setComposeG}  open={openSection === 'compose'}  onToggle={() => toggle('compose')}  />
        <GlassSection title="FALLBACK GLASS — BOARD"    opts={boardG}    onChange={setBoardG}    open={openSection === 'board'}    onToggle={() => toggle('board')}    />
        <GlassSection title="FALLBACK GLASS — COLOPHON" opts={colophonG} onChange={setColophonG} open={openSection === 'colophon'} onToggle={() => toggle('colophon')} />

        {/* Footer note */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(74,124,63,0.08)' }}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.35)', lineHeight: 1.8 }}>
            Glass: live · Fluid WebGL: Apply needed<br/>
            Copy Config → paste into source<br/>
            <a href="?ui" style={{ color: '#4a7c3f', textDecoration: 'none' }}>→ UI element workbench (?ui)</a>
          </div>
        </div>
      </aside>
    </>
  )
}

function btnStyle(active, muted = false) {
  return {
    fontFamily: 'DM Mono, monospace', fontSize: 9, cursor: 'pointer', padding: '3px 8px',
    borderRadius: 4, letterSpacing: '0.06em',
    border: `1px solid ${active ? '#4a7c3f' : muted ? 'rgba(0,0,0,0.12)' : 'rgba(74,124,63,0.25)'}`,
    background: active ? 'rgba(74,124,63,0.18)' : muted ? 'rgba(0,0,0,0.04)' : 'rgba(74,124,63,0.08)',
    color: active ? '#1a3a0a' : muted ? '#555' : '#2a4a1a',
  }
}
