/**
 * Liquid glass preview — `?preview`.
 *
 * The app's own panels with their surface swapped: the CSS backdrop-filter glass
 * turned off, and TypeGPU's liquid glass rendered inside each one instead. Text,
 * layout and everything else is untouched — this is only about what the glass
 * looks like.
 *
 * A/B against the shipped glass with the toggle at the top of the panel.
 *
 * Not the app and not the workbench: `?tune` is production as it ships, `?ui`
 * is the widgets on their own, and this is a proposal for changing the app.
 */
import { useState, useRef, useEffect } from 'react'

import FluidCursor from '../components/FluidCursor'
import { liquidGlass } from '../lib/liquid-glass'
import LiquidGlassPanel from '../ui-elements/liquid-glass/LiquidGlassPanel'
import { overlayDefaults } from '../ui-elements/liquid-glass/overlay.ts'
import JellyWireframeButton from '../ui-elements/jelly-wireframe-button/JellyWireframeButton'
import { mono, AccordionSection, Toggle, Note, btnStyle, ControlPanel } from './controls/primitives.jsx'
import LiquidGlassControls from './controls/LiquidGlassControls.jsx'

// The tuned values, with the lens sized to each panel at runtime — rectW/rectH
// and radius are derived from the element, so what is set here is the edge
// character rather than the shape.
const PANEL_GLASS_DEF = {
  ...overlayDefaults,
  start: 0.037,
  end: 0.078,
  chromaticStrength: 0.097,
  refractionStrength: 0.14,
  blur: 1.2,
  edgeFeather: 2,
  edgeBlurMultiplier: 0.7,
  tintStrength: 0.05,
  tintR: 0.58,
  tintG: 0.44,
  tintB: 0.96,
  chromaticFalloff: 0.35,
}

// What the app ships today, for the A/B
const CSS_GLASS = {
  compose: { scale: -80, chroma: 5, blur: 2.5, saturate: 1.3, aberrationIntensity: 6, elasticity: 0, mode: 'standard' },
  board: { scale: -60, chroma: 4, blur: 2.5, saturate: 1.3, aberrationIntensity: 8, elasticity: 0, mode: 'prominent' },
  colophon: { scale: -80, chroma: 5, blur: 2.5, saturate: 1.3, aberrationIntensity: 5, elasticity: 0, mode: 'polar' },
}

const TILE_COLORS = [
  '#6e9e7e', '#5a8a62', '#7aac72', '#4a8e7e', '#8aba88',
  '#6a9e6a', '#5a7e8a', '#7aaa98', '#8ab08a', '#6e8a5a',
]

/**
 * Who owns the panel's surface.
 *
 * 'css' is the shipped look. 'liquid' hands it to the shader and, when `bare`,
 * also strips the panel's own chrome — index.css gives each one a white 1px
 * border and a `-4px -4px 10px rgba(255,255,255,0.62)` outer glow, and both of
 * those paint outside the canvas (which only covers the padding box). That is
 * the second edge sitting next to the glass edge.
 *
 * The inset highlights need no handling: they paint under the element's
 * children, so the canvas already covers them.
 */
function usePanelSurface(ref, opts, useLiquid, bare) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (!useLiquid) {
      const glass = liquidGlass(el, opts)
      return () => glass.destroy()
    }

    const prev = {
      backdropFilter: el.style.backdropFilter,
      webkitBackdropFilter: el.style.webkitBackdropFilter,
      background: el.style.background,
      border: el.style.border,
      boxShadow: el.style.boxShadow,
    }

    // Nothing stacked under the shader
    el.style.backdropFilter = el.style.webkitBackdropFilter = 'none'

    if (bare) {
      el.style.background = 'transparent'
      el.style.border = 'none'
      el.style.boxShadow = 'none'
    }

    return () => Object.assign(el.style, prev)
  }, [ref, useLiquid, bare, JSON.stringify(opts)]) // eslint-disable-line
}

export default function GlassPreviewPage() {
  const [useLiquid, setUseLiquid] = useState(true)
  const [bare, setBare] = useState(true)
  const [glass, setGlass] = useState(PANEL_GLASS_DEF)
  const [openSection, setOpenSection] = useState('glass')
  const setParam = (k, v) => setGlass(p => ({ ...p, [k]: v }))
  const toggle = name => setOpenSection(s => (s === name ? null : name))

  const composeRef = useRef(null)
  const boardRef = useRef(null)
  const colophonRef = useRef(null)

  usePanelSurface(composeRef, CSS_GLASS.compose, useLiquid, bare)
  usePanelSurface(boardRef, CSS_GLASS.board, useLiquid, bare)
  usePanelSurface(colophonRef, CSS_GLASS.colophon, useLiquid, bare)

  const [copied, setCopied] = useState(false)
  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify({ panelLiquidGlass: glass }, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <FluidCursor />

      <div style={{ paddingRight: 288 }}>
        <div className="page">
          <div className="masthead">
            <span className="over">Liquid glass preview · Write With Nature</span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, flexWrap: 'wrap', marginTop: '1.25rem' }}>
              {'WRITE WITH NATURE'.split('').map((ch, i) =>
                ch === ' ' ? <div key={i} style={{ width: 18 }} /> : (
                  <div key={i} style={{
                    width: 54, height: 54, borderRadius: 7, background: 'var(--paper3)',
                    border: '1px solid rgba(255,255,255,0.38)',
                    boxShadow: '0 5px 15px rgba(28,26,16,0.24), inset 0 1.5px 0 rgba(255,255,255,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20,
                    color: 'rgba(28,26,16,0.52)',
                  }}>{ch}</div>
                ))}
            </div>
            <p className="sub">
              {useLiquid
                ? `Panels running TypeGPU liquid glass${bare ? ', chrome stripped' : ', CSS chrome still on'}`
                : 'Panels running the shipped CSS glass'}
              {' · '}flip between them in the panel
            </p>
          </div>

          <svg className="vine" viewBox="0 0 960 24" fill="none">
            <path d="M0 12 Q80 3 160 12 Q240 21 320 12 Q400 3 480 12 Q560 21 640 12 Q720 3 800 12 Q880 21 960 12" stroke="rgba(74,124,63,0.18)" strokeWidth="1.2" fill="none" />
          </svg>

          <section className="section">
            <div className="section-label">Compose</div>
            <div className="compose-card" ref={composeRef} style={{ position: 'relative' }}>
              {useLiquid && <LiquidGlassPanel params={glass} />}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <textarea
                  rows={4}
                  style={{ width: '100%' }}
                  defaultValue={'Rivers, glaciers & coastlines — shaped into letters from orbit.\nEach line becomes its own row of satellite tiles.'}
                />
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                  <JellyWireframeButton onClick={() => {}} />
                </div>
                <p className="compose-note">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                    <circle cx="7" cy="7" r="6" stroke="rgba(28,26,16,0.25)" strokeWidth="1" />
                    <path d="M7 6v4M7 4.5v.5" stroke="rgba(28,26,16,0.25)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  The text and layout are untouched — only the surface under them changed.
                </p>
              </div>
            </div>
          </section>

          <section className="section" style={{ marginTop: '2rem' }}>
            <div className="collage-bar">
              <div className="section-label" style={{ marginBottom: 0 }}>Board</div>
            </div>
            <div className="board" ref={boardRef} style={{ position: 'relative' }}>
              {useLiquid && <LiquidGlassPanel params={glass} />}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, position: 'relative', zIndex: 1, padding: '0.25rem 0' }}>
                {TILE_COLORS.map((c, i) => (
                  <div key={i} className="tile" style={{ width: 88, height: 88, background: c }}>
                    <div className="tile-wash" />
                    <span className="tile-char">{String.fromCharCode(65 + i)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <svg className="vine" viewBox="0 0 960 20" fill="none" style={{ marginTop: '3rem' }}>
            <path d="M0 10 Q60 2 120 10 Q180 18 240 10 Q300 2 360 10 Q420 18 480 10 Q540 2 600 10 Q660 18 720 10 Q780 2 840 10 Q900 18 960 10" stroke="rgba(74,124,63,0.14)" strokeWidth="1" fill="none" />
          </svg>

          <footer className="colophon" ref={colophonRef} style={{ position: 'relative' }}>
            {useLiquid && <LiquidGlassPanel params={glass} />}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="colophon-text">
                <h3>About this tool</h3>
                <p>All imagery from NASA&apos;s public domain Your Name in Landsat project — real Landsat 8 &amp; 9 satellite scenes where Earth&apos;s surface naturally forms letter shapes from orbit.</p>
              </div>
              <div className="alpha-grid">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch => (
                  <div key={ch} className="alpha-cell has">{ch}</div>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </div>

      <ControlPanel
        title="GLASS PREVIEW"
        subtitle="panels on liquid glass"
        actions={
          <>
            <button onClick={copyConfig} style={btnStyle(copied)}>
              {copied ? '✓ Copied!' : 'Copy Config'}
            </button>
            <button onClick={() => setGlass({ ...PANEL_GLASS_DEF })} style={btnStyle(false, true)}>Reset</button>
          </>
        }
        footer={
          <>
            <a href="?tune" style={{ color: '#4a7c3f', textDecoration: 'none' }}>→ App tuning (?tune)</a><br />
            <a href="?ui" style={{ color: '#4a7c3f', textDecoration: 'none' }}>→ UI workbench (?ui)</a><br />
            <a href="?" style={{ color: '#4a7c3f', textDecoration: 'none' }}>→ Back to app</a>
          </>
        }
      >
        <AccordionSection title="PANEL GLASS" open={openSection === 'glass'} onToggle={() => toggle('glass')}>
          <Toggle label="Liquid glass" value={useLiquid} onChange={setUseLiquid}
            description="OFF puts all three panels back on the shipped CSS glass, so you can flip between them on the same page." />

          <Toggle label="Strip panel chrome" value={bare} onChange={setBare}
            description="Removes each panel's own background, 1px white border and outer white glow, leaving the shader as the only surface. Those paint outside the canvas, so with this off you see the CSS edge and the glass edge side by side — which is the doubled outline. Text and layout are untouched either way." />

          <Note>
            One set of values drives all three panels. The lens size is not among
            them: rectW, rectH and the corner radius are measured off each panel
            so the glass fills it, which is why the placement sliders below have
            no effect here.
          </Note>

          <LiquidGlassControls
            params={glass}
            set={setParam}
            mode="page"
            setMode={() => {}}
            follow={false}
            setFollow={() => {}}
          />
        </AccordionSection>
      </ControlPanel>
    </>
  )
}
