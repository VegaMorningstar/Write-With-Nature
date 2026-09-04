import { useState, useRef, useEffect } from 'react'
import { liquidGlass } from '../lib/liquid-glass'
import JellyRenderButton, { HOVER_DEFAULTS } from '../ui-elements/jelly-render-button/JellyRenderButton'
import {
  MATERIAL_DEFAULTS,
  squashXProperties,
  squashZProperties,
  wiggleXProperties,
} from '../ui-elements/jelly-render-button/constants.ts'
import JellyWireframeButton, { HOVER_DEFAULTS as WIRE_HOVER_DEFAULTS } from '../ui-elements/jelly-wireframe-button/JellyWireframeButton'
import {
  CAMERA_DEFAULTS as WIRE_CAMERA_DEFAULTS,
  JIGGLE_SQUASH_X as WIRE_JIGGLE_X,
  JIGGLE_SQUASH_Z as WIRE_JIGGLE_Z,
  JIGGLE_WIGGLE_X as WIRE_JIGGLE_W,
  LIGHT_DEFAULTS as WIRE_LIGHT_DEFAULTS,
  MATERIAL_DEFAULTS as WIRE_MATERIAL_DEFAULTS,
  squashXProperties as wireSquashX,
  squashZProperties as wireSquashZ,
  wiggleXProperties as wireWiggleX,
} from '../ui-elements/jelly-wireframe-button/constants.ts'

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

const JELLY_HOVER_DEF = { ...HOVER_DEFAULTS }
const JELLY_MATERIAL_DEF = { ...MATERIAL_DEFAULTS }
// The wireframe carries its own complete material now — its glass has diverged
// from the render button's far enough (no Fresnel rim, much less transparent)
// that inheriting would misrepresent it.
const WIRE_MATERIAL_DEF = { ...WIRE_MATERIAL_DEFAULTS }
const WIRE_HOVER_DEF = { ...WIRE_HOVER_DEFAULTS }
const WIRE_SPRING_DEF = {
  squashX: { ...wireSquashX },
  squashZ: { ...wireSquashZ },
  wiggleX: { ...wireWiggleX },
}
const WIRE_STAGE_DEF = {
  camera: { ...WIRE_CAMERA_DEFAULTS },
  light: { ...WIRE_LIGHT_DEFAULTS },
  quality: 2.0,
}
const WIRE_CLICK_DEF = {
  squashX: WIRE_JIGGLE_X,
  squashZ: WIRE_JIGGLE_Z,
  wiggleX: WIRE_JIGGLE_W,
  delayMs: 1100,
}
const JELLY_SPRING_DEF = {
  squashX: { ...squashXProperties },
  squashZ: { ...squashZProperties },
  wiggleX: { ...wiggleXProperties },
}

// Stiffness sets the wobble frequency, damping sets how fast it dies. The pair
// that matters is the damping ratio, damping / (2 * sqrt(stiffness * mass)):
// below 1 it oscillates, and the lower it goes the longer the wobble carries.
function SpringRow({ label, value, onChange, description }) {
  const omega = Math.sqrt(value.stiffness / value.mass)
  const ratio = value.damping / (2 * omega)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
        <span style={{ color: 'rgba(0,0,0,0.34)', letterSpacing: 0 }}>
          {` · ${(omega / (2 * Math.PI)).toFixed(1)} Hz · ζ ${ratio.toFixed(2)}${ratio >= 1 ? ' (no wobble)' : ''}`}
        </span>
      </div>
      <Slider label="Stiffness" value={value.stiffness} min={100} max={2500} step={10}
        fmt={v => v.toFixed(0)} onChange={v => onChange({ ...value, stiffness: v })} />
      <Slider label="Damping" value={value.damping} min={0.5} max={40} step={0.1}
        fmt={v => v.toFixed(1)} onChange={v => onChange({ ...value, damping: v })}
        description={description} />
    </div>
  )
}

function HoverControls({ hover, setHover }) {
  const set = (k, v) => setHover(h => ({ ...h, [k]: v }))
  return (
    <>
      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
        padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
        REACH
      </div>

      <Slider label="Hover Radius (px)" value={hover.radius} min={0} max={700} step={10}
        fmt={v => v.toFixed(0)} onChange={v => set('radius', v)}
        description="How far from the button the jelly still notices the cursor. 0 = only reacts once you are on it. Large = stirs from across the card." />

      <Slider label="Strength" value={hover.strength} min={0} max={2} step={0.05}
        onChange={v => set('strength', v)}
        description="Ceiling on the hover impulse, reached when the cursor is directly over the blob. Falls off with the square of distance from there." />

      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
        padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
        SENSITIVITY
      </div>

      <Slider label="Travel per Impulse (px)" value={hover.sensitivity} min={4} max={140} step={1}
        fmt={v => v.toFixed(0)} onChange={v => set('sensitivity', v)}
        description="Pointer travel needed for a full-scale kick. This is the sensitivity dial and it is inverted — LOW = twitchy, responds to the smallest drift. High = only a fast sweep moves it." />

      <Slider label="Rock Gain" value={hover.rockGain} min={0} max={6} step={0.1}
        onChange={v => set('rockGain', v)}
        description="Sideways lean, driven by horizontal travel only, so it tips the way you swept. This is the one you feel most." />

      <Slider label="Squash Gain" value={hover.squashGain} min={0} max={4} step={0.05}
        onChange={v => set('squashGain', v)}
        description="Wobble driven by total travel in both axes, so vertical movement registers here and nowhere else. Raise it if moving up and down the jelly feels dead." />

      <Slider label="Throttle (ms)" value={hover.throttleMs} min={16} max={220} step={2}
        fmt={v => v.toFixed(0)} onChange={v => set('throttleMs', v)}
        description="Gap between impulses. Low = smoother and more alive, more work per second. High = a stuttery pulse. Also caps how often the button's position is measured." />

      <Slider label="Enter Kick" value={hover.enterImpulse} min={0} max={1} step={0.02}
        onChange={v => set('enterImpulse', v)}
        description="One-off jolt the moment the cursor crosses onto the button, on top of the continuous stir. 0 = no distinct arrival." />
    </>
  )
}

function SpringControls({ springs, setSprings }) {
  const set = (k, v) => setSprings(s => ({ ...s, [k]: v }))
  return (
    <>
      <SpringRow label="Rock (wiggle X)" value={springs.wiggleX}
        onChange={v => set('wiggleX', v)}
        description="The side-to-side tip. Damping sets the decay and stiffness sets the pitch, so a stiff, lightly damped rock is a fast sway that carries — which is where most of the motion goes once the squash pair is damped down." />

      <SpringRow label="Squash X" value={springs.squashX}
        onChange={v => set('squashX', v)}
        description="Widen and flatten. This is the one that carries the click; below about 4 damping the wobble lasts several seconds, above about 25 the body barely deforms at all." />

      <SpringRow label="Squash Z" value={springs.squashZ}
        onChange={v => set('squashZ', v)}
        description="Depth-wise pinch, the quieter partner to squash X." />

      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.30)', lineHeight: 1.6 }}>
        Retunes live · no scene rebuild. Values above ~200,000 stiffness will
        outrun the integrator.
      </div>
    </>
  )
}

// Shared by both jelly widgets — they carry the same material struct, they just
// no longer agree on the values.
function GlassMaterialControls({ mat, set }) {
  return (
    <>
      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
        padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
        TRANSPARENCY
      </div>

      <Slider label="Base Transparency" value={1 - mat.baseAlpha} min={0} max={1} step={0.01}
        onChange={v => set('baseAlpha', 1 - v)}
        description="How much of the page and the word show through the middle of the blob. High = clear glass, but the interior shading washes out. Low = solid gummy." />

      <Slider label="Edge Opacity" value={mat.fresnelAlpha} min={0} max={10} step={0.1}
        onChange={v => set('fresnelAlpha', v)}
        description="How hard Fresnel drives the rim opaque at grazing angles. This is what gives glass its dense bright edge against a clear centre. 0 = uniform transparency, looks like tinted film." />

      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
        padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
        REFRACTION
      </div>

      <Slider label="Refractive Index" value={mat.ior} min={1.01} max={2.4} step={0.01}
        onChange={v => set('ior', v)}
        description="How hard light bends entering the jelly. 1.0 = no bend, invisible. 1.33 water, 1.42 stock, 1.5 glass, 2.4 diamond. Raising it throws the word further back and needs Label Depth moved with it." />

      <Slider label="Chromatic Aberration" value={mat.dispersion} min={0} max={0.35} step={0.005}
        fmt={v => v.toFixed(3)} onChange={v => set('dispersion', v)}
        description="Splits red, green and blue onto their own refractive indices. Widens the colour fringe at the rim and along the letter edges. 0 = achromatic." />

      <Slider label="Frost / Blur" value={mat.blur} min={0} max={0.6} step={0.01}
        onChange={v => set('blur', v)}
        description="Scatters the refracted ray. The TAA averages it across frames into a real blur, so it settles about a third of a second after you stop dragging. Past ~0.35 the noise outruns what the TAA can resolve and it starts to sparkle." />

      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
        padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
        COLOUR &amp; ABSORPTION
      </div>

      <Slider label="Tint Strength" value={mat.tint} min={0} max={1.5} step={0.01}
        onChange={v => set('tint', v)}
        description="Overall colour saturation. TypeGPU's liquid-glass example runs 0.05 — glass reads as glass when the tint is a suggestion rather than a filter." />

      <Slider label="Absorption Density" value={mat.absorbDensity} min={0} max={60} step={0.5}
        fmt={v => v.toFixed(1)} onChange={v => set('absorbDensity', v)}
        description="Beer-Lambert density. Sets how fast colour deepens with depth through the body, so it darkens the bottom far more than the top. High values swallow the word." />

      <Slider label="Subsurface Scatter" value={mat.scatter} min={0} max={10} step={0.1}
        onChange={v => set('scatter', v)}
        description="Forward scattering toward the light — the glow you get holding a gummy up to a lamp. Only shows where the refracted ray points at the light." />

      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
        padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
        LIGHT &amp; SHADOW
      </div>

      <Slider label="Specular" value={mat.specular} min={0} max={1.5} step={0.01}
        onChange={v => set('specular', v)}
        description="Hard highlight on the top face. Refraction alone gives a wide shape almost no gradient, which is most of what makes it read flat — this is the cue that says the surface has form." />

      <Slider label="Exposure" value={mat.exposure} min={0.5} max={5} step={0.05}
        onChange={v => set('exposure', v)}
        description="Tonemap gain before the tanh curve. Raises overall brightness and rolls off into the highlights rather than clipping." />

      <Slider label="Contact Shadow" value={mat.shadowStrength} min={0} max={1} step={0.01}
        onChange={v => set('shadowStrength', v)}
        description="Darkness of the pool under the blob. This is what seats it on the page rather than floating over it." />

      <Slider label="Wobble Glow" value={mat.glowGain} min={0} max={2} step={0.02}
        onChange={v => set('glowGain', v)}
        description="Emission driven by leftover wobble energy, so the jelly lights from inside as it lands and fades as it settles. Click it to see this one." />

      <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.30)', lineHeight: 1.6 }}>
        All live — these are a uniform, not baked shader constants.
      </div>
    </>
  )
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

  // Jelly render button state
  const [jellyHover,   setJellyHover]   = useState(JELLY_HOVER_DEF)
  const [jellySprings, setJellySprings] = useState(JELLY_SPRING_DEF)
  const [jellyMat,     setJellyMat]     = useState(JELLY_MATERIAL_DEF)
  const setMat = (k, v) => setJellyMat(m => ({ ...m, [k]: v }))

  // Wireframe variant — separate widget, and now separate everything
  const [wireMat, setWireMat] = useState(WIRE_MATERIAL_DEF)
  const setWire = (k, v) => setWireMat(m => ({ ...m, [k]: v }))
  const [wireHover,   setWireHover]   = useState(WIRE_HOVER_DEF)
  const [wireSprings, setWireSprings] = useState(WIRE_SPRING_DEF)
  const [wireStage,   setWireStage]   = useState(WIRE_STAGE_DEF)
  const [wireClick,   setWireClick]   = useState(WIRE_CLICK_DEF)
  const setStageCam   = (k, v) => setWireStage(s => ({ ...s, camera: { ...s.camera, [k]: v } }))
  const setStageLight = (k, v) => setWireStage(s => ({ ...s, light:  { ...s.light,  [k]: v } }))
  const setClick      = (k, v) => setWireClick(c => ({ ...c, [k]: v }))

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
      jelly:   { hover: jellyHover, springs: jellySprings, material: jellyMat },
      jellyWireframe: {
        hover: wireHover,
        springs: wireSprings,
        material: wireMat,
        stage: wireStage,
        click: wireClick,
      },
    }
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => {
    setPendingFluid({ ...FLUID_DEF }); setAppliedFluid({ ...FLUID_DEF })
    setBlendMode(BLEND_DEF)
    setComposeG({ ...GLASS_DEF.compose }); setBoardG({ ...GLASS_DEF.board }); setColophonG({ ...GLASS_DEF.colophon })
    setJellyHover({ ...JELLY_HOVER_DEF })
    setJellyMat({ ...JELLY_MATERIAL_DEF })
    setWireMat({ ...WIRE_MATERIAL_DEF })
    setWireHover({ ...WIRE_HOVER_DEF })
    setWireSprings({
      squashX: { ...WIRE_SPRING_DEF.squashX },
      squashZ: { ...WIRE_SPRING_DEF.squashZ },
      wiggleX: { ...WIRE_SPRING_DEF.wiggleX },
    })
    setWireStage({
      camera: { ...WIRE_STAGE_DEF.camera },
      light: { ...WIRE_STAGE_DEF.light },
      quality: WIRE_STAGE_DEF.quality,
    })
    setWireClick({ ...WIRE_CLICK_DEF })
    setJellySprings({
      squashX: { ...JELLY_SPRING_DEF.squashX },
      squashZ: { ...JELLY_SPRING_DEF.squashZ },
      wiggleX: { ...JELLY_SPRING_DEF.wiggleX },
    })
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
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 340px', maxWidth: 480 }}>
                  <div style={{ ...mono, fontSize: 9, letterSpacing: '0.12em', opacity: 0.4, textAlign: 'center', marginBottom: 4 }}>
                    CURRENT
                  </div>
                  <JellyRenderButton hover={jellyHover} springs={jellySprings} material={jellyMat} onClick={() => {}} />
                </div>
                <div style={{ flex: '1 1 340px', maxWidth: 480 }}>
                  <div style={{ ...mono, fontSize: 9, letterSpacing: '0.12em', opacity: 0.4, textAlign: 'center', marginBottom: 4 }}>
                    WIREFRAME
                  </div>
                  <JellyWireframeButton
                    hover={wireHover}
                    springs={wireSprings}
                    material={wireMat}
                    camera={wireStage.camera}
                    light={wireStage.light}
                    quality={wireStage.quality}
                    impulses={wireClick}
                    jiggleMs={wireClick.delayMs}
                    onClick={() => {}}
                  />
                </div>
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
        <GlassSection title="GLASS — COMPOSE"  opts={composeG}  onChange={setComposeG}  open={openSection === 'compose'}  onToggle={() => toggle('compose')}  />
        <GlassSection title="GLASS — BOARD"    opts={boardG}    onChange={setBoardG}    open={openSection === 'board'}    onToggle={() => toggle('board')}    />
        <GlassSection title="GLASS — COLOPHON" opts={colophonG} onChange={setColophonG} open={openSection === 'colophon'} onToggle={() => toggle('colophon')} />

        <div style={{ borderTop: '1px solid rgba(74,124,63,0.08)', margin: '4px 0 6px' }} />

        {/* ── Wireframe variant ── */}
        <AccordionSection title="WIREFRAME — EDGES" open={openSection === 'wire'} onToggle={() => toggle('wire')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            Second widget · own files · drives the right-hand blob only
          </div>

          <Slider label="Line Width" value={wireMat.frameWidth} min={0} max={0.08} step={0.001}
            fmt={v => v.toFixed(3)} onChange={v => setWire('frameWidth', v)}
            description="Half-thickness of the bars in world units, against a blob 1.6 wide. 0 removes the wireframe entirely and leaves the plain jelly." />

          <Slider label="Line Opacity" value={wireMat.frameGain} min={0} max={3} step={0.05}
            onChange={v => setWire('frameGain', v)}
            description="How solid the lines read. Goes into the alpha channel as well as the colour, so above 1 the edges stay opaque even where the body is see-through." />

          <Slider label="Line Softness" value={wireMat.frameSoftness} min={0} max={2} step={0.02}
            onChange={v => setWire('frameSoftness', v)}
            description="Edge falloff as a fraction of the bar width. Near 0 aliases badly; around 0.5 is a clean drawn line; high smears it into a glow." />

          <Slider label="Line Brightness" value={wireMat.frameBrightness} min={0} max={1} step={0.01}
            onChange={v => setWire('frameBrightness', v)}
            description="0 = near-black ink, like the sketch. 1 = white, which reads as light caught in the edges rather than a drawn line." />

          <Slider label="Line Falloff" value={wireMat.frameFalloff} min={0.15} max={4} step={0.05}
            onChange={v => setWire('frameFalloff', v)}
            description="Curve of the gradient out from the line's core — Softness sets how wide the falloff reaches, this sets its shape. Below 1 spreads it into a broad halo with no hard core; above 1 pulls it into a bright thread with a long faint tail. 1 is the plain S-curve." />

          <Slider label="Ink → Light" value={wireMat.frameGlow} min={0} max={1} step={0.01}
            onChange={v => setWire('frameGlow', v)}
            description="How the line blends. 0 paints it over the body, so it sits on the glass like ink. 1 adds it as light, so it comes through the glass and brightens whatever it crosses — and stops forcing the body opaque underneath it. This is the one that makes the edges feel organic rather than drawn." />

          <Slider label="Line Dispersion" value={wireMat.frameDispersion} min={0} max={3} step={0.05}
            onChange={v => setWire('frameDispersion', v)}
            description="Chromatic aberration on the edges themselves. The body splits the environment across three refractive indices, but the frame was traced once and monochrome, so the lines stayed achromatic however much dispersion the glass had — this is why you could not see it on them. Multiplies the glass's own Chromatic Aberration, so 1 matches the body. Costs two extra marches above 0, the most expensive thing in this shader." />

          <Slider label="Depth Fade" value={wireMat.frameDepthFade} min={0} max={4} step={0.05}
            onChange={v => setWire('frameDepthFade', v)}
            description="Dims edges by how deep into the body they sit. At 0 all twelve draw at identical weight however far back they are, which is most of what makes the shape read as a diagram — you are looking through more jelly to see the far ones, so they should be fainter. Raising this separates near from far and is what gives the box its depth." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            SHAPE FIT
          </div>

          <Slider label="Corner Radius" value={wireMat.round} min={0.01} max={0.2} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWire('round', v)}
            description="The render button runs 0.13, but a fillet that large leaves no corner for a frame to sit on and the lines float clear of the silhouette. Low keeps them aligned at the cost of some softness." />

          <Slider label="Bend" value={wireMat.bend} min={0} max={0.4} step={0.01}
            onChange={v => setWire('bend', v)}
            description="Droop along the long axis. The bend is not an affine transform, so the wireframe cannot follow it — past about 0.15 the lines visibly peel away from the body's edges. 0 keeps them locked." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            SOFT INNER EDGE
          </div>

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            Not drawn — the floor darkens in a band where the blob meets it, and
            refraction shows that band as an inset edge. Turn the line sliders to
            0 and work with these alone to compare against TypeGPU&apos;s look.
          </div>

          <Slider label="Edge Width" value={wireMat.edgeWidth} min={0.005} max={0.35} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWire('edgeWidth', v)}
            description="Width of the band, measured horizontally out from the blob's silhouette. Narrow reads as a crisp seated edge; wide spreads into a soft vignette around the floor." />

          <Slider label="Edge Darkness" value={wireMat.edgeDark} min={0} max={1} step={0.01}
            onChange={v => setWire('edgeDark', v)}
            description="How far the band darkens. 0 removes the soft edge entirely and leaves only the drawn lines." />

          <Slider label="Base Brightness" value={wireMat.baseBright} min={0} max={1.4} step={0.01}
            onChange={v => setWire('baseBright', v)}
            description="Overall light on the floor under the blob. This was the murk in the base: occlusion marched up from the floor sees the blob overhead across the entire footprint, so it dimmed everything uniformly rather than banding at the contact. 1 keeps the base reading as translucent." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            WORD PLACEMENT
          </div>

          <Slider label="Label Depth (z)" value={wireMat.labelCenterZ} min={-0.9} max={0.4} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWire('labelCenterZ', v)}
            description="Slides the plane the word sits on. Larger moves its refracted image toward the camera and so DOWN the screen; smaller pushes it up and back. 0 sits the word physically centred on the floor, but refraction still throws the image you see about a quarter unit backwards from there." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.30)', lineHeight: 1.6 }}>
            The second, upside-down RENDER is the front face refracting the same
            word — a real double image through a thick faceted body, not a bug.
            Lowering IOR or thickness weakens it. Everything else about this blob
            is on the JELLY sliders below.
          </div>
        </AccordionSection>

        {/* ── Jelly render button ── */}
        <AccordionSection title="JELLY — GLASS" open={openSection === 'jellyMat'} onToggle={() => toggle('jellyMat')}>
          <GlassMaterialControls mat={jellyMat} set={setMat} />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — GLASS" open={openSection === 'wireMat'} onToggle={() => toggle('wireMat')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            Same controls, own values · drives the right-hand blob
          </div>
          <GlassMaterialControls mat={wireMat} set={setWire} />
        </AccordionSection>

        <AccordionSection title="JELLY — POINTER" open={openSection === 'jellyHover'} onToggle={() => toggle('jellyHover')}>
          <HoverControls hover={jellyHover} setHover={setJellyHover} />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — POINTER" open={openSection === 'wireHover'} onToggle={() => toggle('wireHover')}>
          <HoverControls hover={wireHover} setHover={setWireHover} />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — SPRINGS" open={openSection === 'wireSprings'} onToggle={() => toggle('wireSprings')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            Own values · drives the right-hand blob
          </div>
          <SpringControls springs={wireSprings} setSprings={setWireSprings} />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — SHAPE" open={openSection === 'wireShape'} onToggle={() => toggle('wireShape')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            Half-extents · the blob is twice these across
          </div>

          <Slider label="Width (X)" value={wireMat.halfX} min={0.1} max={1.8} step={0.01}
            onChange={v => setWire('halfX', v)}
            description="Half the blob's length. The word has to stay inside this or it pokes out from under the glass — Label Scale is the other half of that balance." />

          <Slider label="Height (Y)" value={wireMat.halfY} min={0.05} max={1} step={0.01}
            onChange={v => setWire('halfY', v)}
            description="Half the thickness. This is the strongest single control on the whole look: it sets how much material light travels through, so it drives the absorption gradient, and it decides how far refraction throws the word backwards — raise it and Label Depth needs to follow." />

          <Slider label="Depth (Z)" value={wireMat.halfZ} min={0.05} max={1.2} step={0.01}
            onChange={v => setWire('halfZ', v)}
            description="Half the front-to-back size. Wider gives the top face more screen area, which is where the upright word is seen." />

          <Slider label="Sink" value={wireMat.sink} min={-0.2} max={0.3} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWire('sink', v)}
            description="How far the blob settles into the plane. Negative lifts it clear, which breaks the contact edge and leaves it floating." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.30)', lineHeight: 1.6 }}>
            The wireframe tracks these automatically — it is built from the same
            half-extents, so the frame follows the box as you resize it.
          </div>
        </AccordionSection>

        <AccordionSection title="WIREFRAME — WORD" open={openSection === 'wireWord'} onToggle={() => toggle('wireWord')}>
          <Slider label="Label Depth (z)" value={wireMat.labelCenterZ} min={-0.9} max={0.4} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWire('labelCenterZ', v)}
            description="Slides the word along the floor. Larger moves its refracted image toward the camera and so DOWN the screen; smaller pushes it up and back. 0 sits it physically centred, but refraction still throws the image you see backwards from there." />

          <Slider label="Label Across (x)" value={wireMat.labelCenterX} min={-0.8} max={0.8} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWire('labelCenterX', v)}
            description="Slides it sideways. Refraction barely displaces this axis, since the camera looks straight down the centre line, so it moves close to one-for-one." />

          <Slider label="Label Scale" value={wireMat.labelScale} min={0.3} max={3} step={0.01}
            onChange={v => setWire('labelScale', v)}
            description="Size of the word. Scales the span of floor the texture is mapped across, so larger values grow the letters. Past the blob's width it runs out from under the glass." />

          <Slider label="Ink" value={wireMat.labelInk} min={0} max={1} step={0.01}
            onChange={v => setWire('labelInk', v)}
            description="Darkness of the letters against the lit floor. 0 fades the word out entirely, which is worth trying if you want the box read on its own." />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — STAGE" open={openSection === 'wireStage'} onToggle={() => toggle('wireStage')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            CAMERA
          </div>

          <Slider label="Height" value={wireStage.camera.height} min={0.3} max={3} step={0.02}
            onChange={v => setStageCam('height', v)}
            description="Camera height. With Distance, this sets the viewing angle — the single biggest lever on whether the shape reads as a cuboid. Higher looks down on it and flattens the sides; lower shows the front face but bends the word further back." />

          <Slider label="Distance" value={wireStage.camera.distance} min={0.1} max={3} step={0.02}
            onChange={v => setStageCam('distance', v)}
            description="How far in front the camera sits. Raise both this and Height together to keep the angle and just pull back." />

          <Slider label="Look At (y)" value={wireStage.camera.targetY} min={-0.3} max={1} step={0.01}
            onChange={v => setStageCam('targetY', v)}
            description="Height of the point the camera aims at. Shifts the blob up or down in frame without changing the angle." />

          <Slider label="Field of View" value={wireStage.camera.fov} min={12} max={90} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setStageCam('fov', v)}
            description="Vertical FOV in degrees. Narrow flattens perspective toward isometric, which suits a box; wide exaggerates it and needs Distance raised to compensate." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            LIGHT
          </div>

          <Slider label="Azimuth" value={wireStage.light.azimuth} min={-180} max={180} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setStageLight('azimuth', v)}
            description="Sweeps the light around the vertical, in degrees from straight ahead. Moves the specular highlight across the top face and swings which side the scatter glows through." />

          <Slider label="Elevation" value={wireStage.light.elevation} min={-10} max={85} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setStageLight('elevation', v)}
            description="Degrees above the horizon. Low grazes the body and pushes light through it, which is what the Subsurface Scatter slider needs to show; high lights the top face and kills the glow." />

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', margin: '6px 0 10px',
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            QUALITY
          </div>

          <Slider label="Supersample" value={wireStage.quality} min={0.5} max={3} step={0.25}
            onChange={v => setWireStage(s => ({ ...s, quality: v }))}
            description="Render scale. 2 renders at twice the canvas and downsamples, which is what keeps the silhouette clean against a transparent page — TAA alone cannot resolve a hard alpha edge. Below 1 it visibly aliases; above 2 costs a lot for little. Rebuilds the render targets on change." />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — CLICK" open={openSection === 'wireClick'} onToggle={() => toggle('wireClick')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
            Impulses fired into the springs on release. Amplitude is roughly the
            impulse over the spring&apos;s frequency, so these set how hard it is hit
            and the SPRINGS section decides what happens next.
          </div>

          <Slider label="Squash X Impulse" value={wireClick.squashX} min={-20} max={20} step={0.5}
            onChange={v => setClick('squashX', v)}
            description="Negative narrows the blob on impact before it springs back out. TypeGPU fires -5." />

          <Slider label="Squash Z Impulse" value={wireClick.squashZ} min={-20} max={20} step={0.5}
            onChange={v => setClick('squashZ', v)}
            description="The paired depth-wise kick, opposite in sign so the blob spreads as it flattens. TypeGPU fires 5." />

          <Slider label="Rock Impulse" value={wireClick.wiggleX} min={-30} max={30} step={0.5}
            onChange={v => setClick('wiggleX', v)}
            description="Sideways tip on landing. TypeGPU fires -10, and it is the most visible of the three." />

          <Slider label="Delay before scroll (ms)" value={wireClick.delayMs} min={0} max={3000} step={50}
            fmt={v => v.toFixed(0)} onChange={v => setClick('delayMs', v)}
            description="How long the wobble is left to play before the page moves to the collage. Match it to how long the springs actually ring — past that it is dead air." />
        </AccordionSection>

        <AccordionSection title="JELLY — SPRINGS" open={openSection === 'jellySprings'} onToggle={() => toggle('jellySprings')}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6,
            padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5 }}>
            TypeGPU&apos;s tuning by default · drives hover and click alike
          </div>
          <SpringControls springs={jellySprings} setSprings={setJellySprings} />
        </AccordionSection>

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
