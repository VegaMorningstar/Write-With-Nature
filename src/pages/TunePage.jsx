import { useState, useRef, useEffect } from 'react'
import { liquidGlass } from '../lib/liquid-glass'
import { liquidGlass3d, GLASS_3D_DEFAULTS } from '../lib/liquid-glass-3d'

// Rebuilds the glass effect whenever opts change (slider-reactive)
// The new SDF-driven glass. Applied here only — App.jsx still runs the old
// liquid-glass until this is signed off.
function useLive3dGlass(ref, opts) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current
    if (!el || !opts) return          // null = the other implementation has the panel
    const glass = liquidGlass3d(el, opts)
    return () => glass.destroy()
  }, [ref, JSON.stringify(opts)]) // eslint-disable-line
}

function useLiveGlass(ref, opts) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current
    if (!el || !opts) return          // null = the 3D implementation has the panel
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
      // See FluidCursor.jsx — without preserveDrawingBuffer the canvas reads
      // back empty, so the glass has no fluid to refract.
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          attrs = { ...(attrs || {}), preserveDrawingBuffer: true }
        }
        return originalGetContext.call(this, type, attrs)
      }
      try {
        initFluid({ transparent: true, id: 'tune-fluid-canvas', ...opts })
      } finally {
        window.addEventListener = originalAdd
        HTMLCanvasElement.prototype.getContext = originalGetContext
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

const GLASS_3D_DEF = { ...GLASS_3D_DEFAULTS }

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
  const [glass3d, setGlass3d] = useState(GLASS_3D_DEF)
  const [use3d,   setUse3d]   = useState(true)
  const setG3 = (k, v) => setGlass3d(g => ({ ...g, [k]: v }))

  // Their shader, their parameters

  // The same shader laid over the real page

  const legacyCompose  = use3d ? null : composeG
  const legacyBoard    = use3d ? null : boardG
  const legacyColophon = use3d ? null : colophonG

  useLiveGlass(composeRef,  legacyCompose)
  useLiveGlass(boardRef,    legacyBoard)
  useLiveGlass(colophonRef, legacyColophon)

  useLive3dGlass(composeRef,  use3d ? glass3d : null)
  useLive3dGlass(boardRef,    use3d ? glass3d : null)
  useLive3dGlass(colophonRef, use3d ? glass3d : null)

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
      glass3d: { enabled: use3d, ...glass3d },
    }
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => {
    setPendingFluid({ ...FLUID_DEF }); setAppliedFluid({ ...FLUID_DEF })
    setBlendMode(BLEND_DEF)
    setComposeG({ ...GLASS_DEF.compose }); setBoardG({ ...GLASS_DEF.board }); setColophonG({ ...GLASS_DEF.colophon })
    setGlass3d({ ...GLASS_3D_DEF })
    setUse3d(true)
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
      </svg>

      {/* ── Page content (offset right for control panel) ── */}
      <div style={{ paddingRight: 288 }}>
        <div className="page">

          {/* Header */}
          <div className="masthead">
            <span className="over">UI Tuning Mode · Write With Nature</span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap', marginTop: '1.25rem' }}>
              {'WRITE WITH NATURE'.split('').map((ch, i) =>
                ch === ' ' ? <div key={i} style={{ width: 18 }} /> :
                <div key={i} style={{
                  width: 54, height: 54, borderRadius: 7, background: 'var(--paper3)',
                  border: '1px solid rgba(255,255,255,0.38)',
                  boxShadow: '0 5px 15px rgba(28,26,16,0.24), inset 0 1.5px 0 rgba(255,255,255,0.65)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20,
                  color: 'rgba(28,26,16,0.52)',
                }}>{ch}</div>
              )}
            </div>
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
            <div className="compose-card" ref={composeRef}>
              <textarea
                rows={4}
                style={{ width: '100%' }}
                defaultValue={'Rivers, glaciers & coastlines — shaped into letters from orbit.\nEach line becomes its own row of satellite tiles.'}
              />
              <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', textAlign: 'center', margin: '1rem 0', lineHeight: 1.7 }}>
                The render button and the other reusable widgets live on the{' '}
                <a href="?ui" style={{ color: '#4a7c3f' }}>UI workbench</a>.
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
            <div className="board" ref={boardRef}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, position: 'relative', zIndex: 1, padding: '0.25rem 0' }}>
                {TILE_COLORS.map((c, i) => (
                  <div key={i} className="tile" style={{ width: 88, height: 88, background: c }}>
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
          <footer className="colophon" ref={colophonRef}>
            <div className="colophon-text">
              <h3>About this tool</h3>
              <p>All imagery from NASA's public domain <a href="https://science.nasa.gov/mission/landsat/outreach/your-name-in-landsat/" target="_blank" rel="noreferrer">Your Name in Landsat</a> project — real Landsat 8 &amp; 9 satellite scenes where Earth's surface naturally forms letter shapes from orbit. Click any tile to cycle its satellite scene.</p>
            </div>
            <div className="alpha-grid">
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => (
                <div key={ch} className="alpha-cell has">{ch}</div>
              ))}
            </div>
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
        <AccordionSection title="LIQUID GLASS 3D (CSS)" open={openSection === 'glass3d'} onToggle={() => toggle('glass3d')}>
          <Toggle label="Use 3D glass" value={use3d} onChange={setUse3d}
            description="OFF falls back to the old flat implementation on all three panels, so you can flip between them. The three GLASS sections below only do anything while this is off." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            BEVEL — the shape of the edge
          </div>

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            The old version displaced the backdrop by a pair of flat X/Y
            gradients, so every pixel shifted the same way by the same amount —
            a pane. These two describe a rim that turns over, which is what
            TypeGPU&apos;s shader does and what reads as thickness.
          </div>

          <Slider label="Bevel Width" value={glass3d.band} min={0.05} max={1} step={0.01}
            onChange={v => setG3('band', v)}
            description="How far in from the edge the glass keeps bending, as a fraction of the panel's smaller half-dimension. Narrow is a sharp-edged sheet; wide rounds the whole panel over into a blob. This is the single strongest control here." />

          <Slider label="Bevel Falloff" value={glass3d.falloff} min={0.4} max={6} step={0.1}
            onChange={v => setG3('falloff', v)}
            description="How the bend ramps across that width. 1 is linear, which is exactly what their (sdfDist - start) / (end - start) computes. Higher presses it against the rim and leaves the middle readable; lower spreads it across the panel." />

          <Slider label="Ring Feather" value={glass3d.feather} min={0} max={1} step={0.01}
            onChange={v => setG3('feather', v)}
            description="Softness of the boundary between the frosted middle and the refracting ring. Their edgeFeather. Near 0 the two regions meet in a visible line." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            REFRACTION
          </div>

          <Slider label="Refraction" value={glass3d.scale} min={-260} max={340} step={2}
            fmt={v => v.toFixed(0)} onChange={v => setG3('scale', v)}
            description="Displacement in pixels. Positive samples outward along the ring, matching their uv + dir * refractionStrength — that is the direction that smears the background hard at the rim. Theirs runs about twice the ring width, so push it high before deciding it is wrong." />

          <Slider label="Map Strength" value={glass3d.strength} min={0} max={2} step={0.02}
            onChange={v => setG3('strength', v)}
            description="Multiplier baked into the map before Refraction scales it. Mostly redundant with Refraction — useful for pushing past the slider's range or backing the whole effect off without losing the tuning." />

          <Slider label="Chromatic Aberration" value={glass3d.chroma} min={0} max={40} step={0.5}
            onChange={v => setG3('chroma', v)}
            description="Splits the three channels onto slightly different displacements, the same reassembly their shader does per channel. Visible as colour fringing at the rim, strongest where the bend is hardest." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            LIGHTING — the other half of looking solid
          </div>

          <Slider label="Bevel Light" value={glass3d.bevel} min={0} max={2} step={0.02}
            onChange={v => setG3('bevel', v)}
            description="Brightness of the lit edge and darkness of the opposite one, from the same SDF as the refraction. Refraction alone bends the backdrop but gives the glass no form of its own; this is what makes the rim read as a surface." />

          <Slider label="Light Angle" value={glass3d.lightAngle} min={0} max={360} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setG3('lightAngle', v)}
            description="Degrees. Drives the bevel, the inner shadow and the rim light together, so they stay consistent with one another." />

          <Slider label="Light Spread" value={glass3d.bevelWidth} min={0.1} max={2} step={0.02}
            onChange={v => setG3('bevelWidth', v)}
            description="Width of the lit band relative to the bevel. Below 1 keeps the highlight tighter than the refraction, which reads as harder glass." />

          <Slider label="Light Falloff" value={glass3d.bevelFalloff} min={0.4} max={6} step={0.1}
            onChange={v => setG3('bevelFalloff', v)}
            description="Ramp of the lit band. High gives a thin bright line along the edge; low gives a broad soft sheen." />

          <Slider label="Inner Shadow" value={glass3d.innerShadow} min={0} max={1} step={0.01}
            onChange={v => setG3('innerShadow', v)}
            description="Darkening inside the unlit edge. Cheap but effective — it is most of what separates a floating slab from something with a wall." />

          <Slider label="Shadow Size" value={glass3d.innerShadowSize} min={0} max={90} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setG3('innerShadowSize', v)}
            description="How far that shadow reaches inward, in pixels." />

          <Slider label="Rim Light" value={glass3d.rimLight} min={0} max={1.5} step={0.02}
            onChange={v => setG3('rimLight', v)}
            description="A thin bright inset opposite the shadow. Together they make the panel look like it has a near edge and a far one." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            FROST &amp; BODY
          </div>

          <Slider label="Body Blur" value={glass3d.blur} min={0} max={30} step={0.25}
            onChange={v => setG3('blur', v)}
            description="Blur of the frosted middle. Lives inside the filter rather than in backdrop-filter, so the ring can differ from it." />

          <Slider label="Ring Blur ×" value={glass3d.edgeBlurMultiplier} min={0} max={2} step={0.05}
            onChange={v => setG3('edgeBlurMultiplier', v)}
            description="Ring blur as a multiple of the body's. Their default is 0.7 — the ring is SHARPER than the middle, not softer, because the refraction detail is the point of the ring and blurring it away defeats it." />

          <Slider label="Tint" value={glass3d.tintStrength} min={0} max={0.6} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setG3('tintStrength', v)}
            description="Mixes the glass toward a colour, across both the body and the ring. Theirs is 0.05 — glass reads as glass when the tint is a suggestion rather than a filter." />

          <Slider label="Tint Hue" value={glass3d.tintHue} min={0} max={360} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setG3('tintHue', v)}
            description="Degrees. 265 is roughly their violet; swing toward 90 for something that sits with the page's greens." />

          <Slider label="Saturate" value={glass3d.saturate} min={0.5} max={3} step={0.05}
            onChange={v => setG3('saturate', v)}
            description="Backdrop saturation. Slightly above 1 makes the fluid behind it read through the glass rather than washing out." />

          <Slider label="Brightness" value={glass3d.brightness} min={0.7} max={1.4} step={0.01}
            onChange={v => setG3('brightness', v)}
            description="Backdrop brightness. Small lifts here make the panel feel lit from within." />

          <Slider label="Elasticity" value={glass3d.elasticity} min={0} max={1} step={0.02}
            onChange={v => setG3('elasticity', v)}
            description="Squash toward the cursor as it approaches. 0 is static — worth leaving off while judging the edge, since motion hides shape." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.30)', lineHeight: 1.6 }}>
            The maps are regenerated on every change, so dragging is a touch
            steppy. It settles the moment you let go.
          </div>
        </AccordionSection>

        <GlassSection title="GLASS — COMPOSE"  opts={composeG}  onChange={setComposeG}  open={openSection === 'compose'}  onToggle={() => toggle('compose')}  />
        <GlassSection title="GLASS — BOARD"    opts={boardG}    onChange={setBoardG}    open={openSection === 'board'}    onToggle={() => toggle('board')}    />
        <GlassSection title="GLASS — COLOPHON" opts={colophonG} onChange={setColophonG} open={openSection === 'colophon'} onToggle={() => toggle('colophon')} />

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
