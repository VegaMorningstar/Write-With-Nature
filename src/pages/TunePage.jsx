import { useState, useRef, useEffect } from 'react'
import { liquidGlass } from '../lib/liquid-glass'

// Rebuilds the glass effect whenever opts change (slider-reactive)
function useLiveGlass(ref, opts) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current
    if (!el) return
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
    const _origAdd = document.addEventListener.bind(document)
    document.addEventListener = (type, fn, opts) => {
      if (type === 'touchstart' || type === 'touchmove') {
        opts = typeof opts === 'object' ? { ...opts, passive: true } : { passive: true }
      }
      _origAdd(type, fn, opts)
    }
    import('smokey-fluid-cursor').then(({ initFluid }) => {
      document.addEventListener = _origAdd
      initFluid({ transparent: true, id: 'tune-fluid-canvas', ...opts })
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

function Slider({ label, value, min, max, step = 0.01, fmt, onChange }) {
  const display = fmt ? fmt(value) : value.toFixed(step >= 1 ? 0 : 2)
  return (
    <label style={{ display: 'block', marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ ...mono, fontSize: 10, color: '#4a7c3f', minWidth: 40, textAlign: 'right' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#4a7c3f', cursor: 'pointer', display: 'block' }}
      />
    </label>
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
  densityDissipation: 1.2, velocityDissipation: 1.6,
  curl: 24, splatRadius: 0.30, splatForce: 5500, colorUpdateSpeed: 6,
}
const BLEND_DEF = 'multiply'
const GLASS_DEF = {
  compose:  { scale: -80, chroma: 5, blur: 24, saturate: 1.3, aberrationIntensity: 6,  elasticity: 0.35, mode: 'standard'  },
  board:    { scale: -60, chroma: 4, blur: 22, saturate: 1.3, aberrationIntensity: 8,  elasticity: 0.30, mode: 'prominent' },
  colophon: { scale: -80, chroma: 5, blur: 24, saturate: 1.3, aberrationIntensity: 5,  elasticity: 0.30, mode: 'polar'     },
}

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

  useLiveGlass(composeRef,  composeG)
  useLiveGlass(boardRef,    boardG)
  useLiveGlass(colophonRef, colophonG)

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
    }
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => {
    setPendingFluid({ ...FLUID_DEF }); setAppliedFluid({ ...FLUID_DEF })
    setBlendMode(BLEND_DEF)
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
              <div className="textarea-row">
                <textarea
                  rows={4}
                  defaultValue={'Rivers, glaciers & coastlines — shaped into letters from orbit.\nEach line becomes its own row of satellite tiles.'}
                />
                <button className="render-btn">Render<small>⌘ ↵</small></button>
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
          <Slider label="Density Dissipation"  value={pendingFluid.densityDissipation}  min={0.1} max={6}     step={0.05} onChange={v => setFluid('densityDissipation', v)} />
          <Slider label="Velocity Dissipation" value={pendingFluid.velocityDissipation} min={0.1} max={4}     step={0.05} onChange={v => setFluid('velocityDissipation', v)} />
          <Slider label="Curl"                 value={pendingFluid.curl}                min={0}   max={60}    step={1}    fmt={v => v.toFixed(0)} onChange={v => setFluid('curl', v)} />
          <Slider label="Splat Radius"         value={pendingFluid.splatRadius}         min={0.05} max={0.7}  step={0.01} onChange={v => setFluid('splatRadius', v)} />
          <Slider label="Splat Force"          value={pendingFluid.splatForce}          min={500} max={12000} step={100}  fmt={v => v.toFixed(0)} onChange={v => setFluid('splatForce', v)} />
          <Slider label="Color Speed"          value={pendingFluid.colorUpdateSpeed}    min={1}   max={20}    step={0.5}  onChange={v => setFluid('colorUpdateSpeed', v)} />
          <Chips label="Blend Mode" value={blendMode}
            options={['multiply', 'screen', 'overlay', 'normal', 'color-burn', 'soft-light']}
            onChange={setBlendMode}
          />
          <div style={{ marginTop: 2, padding: '4px 0', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.35)', marginBottom: 5 }}>
              Blend mode applies immediately · other params require Apply
            </div>
            <button onClick={applyFluid} style={{
              ...mono, width: '100%', padding: '7px', cursor: 'pointer',
              background: 'rgba(74,124,63,0.14)', border: '1px solid rgba(74,124,63,0.28)',
              borderRadius: 6, fontSize: 10, letterSpacing: '0.1em', color: '#1a3a0a',
            }}>APPLY & RESTART FLUID</button>
          </div>
        </AccordionSection>

        <div style={{ borderTop: '1px solid rgba(74,124,63,0.08)', margin: '4px 0 6px' }} />

        {/* ── Glass sections ── */}
        <GlassSection title="GLASS — COMPOSE"  opts={composeG}  onChange={setComposeG}  open={openSection === 'compose'}  onToggle={() => toggle('compose')}  />
        <GlassSection title="GLASS — BOARD"    opts={boardG}    onChange={setBoardG}    open={openSection === 'board'}    onToggle={() => toggle('board')}    />
        <GlassSection title="GLASS — COLOPHON" opts={colophonG} onChange={setColophonG} open={openSection === 'colophon'} onToggle={() => toggle('colophon')} />

        {/* Footer note */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(74,124,63,0.08)' }}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.35)', lineHeight: 1.8 }}>
            Glass: live · Fluid WebGL: Apply needed<br/>
            Copy Config → paste into source
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
