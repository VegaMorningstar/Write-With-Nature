/**
 * UI element workbench — `?ui`.
 *
 * The reusable widgets in src/ui-elements, each on its own, with the full set
 * of dials for it. Deliberately separate from `?tune`, which tunes Write With
 * Nature itself: an element is approved here first, and only then wired into
 * an app.
 *
 * Nothing on this page touches the app. Copy Config emits every element's
 * settings so an approved one can be pasted into its constants file.
 */
import { useState } from 'react'

import FluidCursor from '../components/FluidCursor'

import {
  mono, Slider, Toggle, AccordionSection, GroupLabel, Note, btnStyle, ControlPanel,
} from './controls/primitives.jsx'
import {
  GlassMaterialControls, HoverControls, SpringControls,
} from './controls/JellyControls.jsx'
import LiquidGlassControls from './controls/LiquidGlassControls.jsx'

import JellyRenderButton, { HOVER_DEFAULTS } from '../ui-elements/jelly-render-button/JellyRenderButton'
import {
  MATERIAL_DEFAULTS as RENDER_MATERIAL,
  squashXProperties as renderSquashX,
  squashZProperties as renderSquashZ,
  wiggleXProperties as renderWiggleX,
} from '../ui-elements/jelly-render-button/constants.ts'

import JellyWireframeButton, { HOVER_DEFAULTS as WIRE_HOVER } from '../ui-elements/jelly-wireframe-button/JellyWireframeButton'
import {
  CAMERA_DEFAULTS as WIRE_CAMERA,
  JIGGLE_SQUASH_X as WIRE_JIGGLE_X,
  JIGGLE_SQUASH_Z as WIRE_JIGGLE_Z,
  JIGGLE_WIGGLE_X as WIRE_JIGGLE_W,
  LIGHT_DEFAULTS as WIRE_LIGHT,
  MATERIAL_DEFAULTS as WIRE_MATERIAL,
  squashXProperties as wireSquashX,
  squashZProperties as wireSquashZ,
  wiggleXProperties as wireWiggleX,
} from '../ui-elements/jelly-wireframe-button/constants.ts'

import LiquidGlassDemo from '../ui-elements/liquid-glass/LiquidGlassDemo'
import { overlayDefaults } from '../ui-elements/liquid-glass/overlay.ts'
import GlassAlphabet from '../ui-elements/glass-alphabet/GlassAlphabet'
import {
  MATERIAL_DEFAULTS as ALPHA_MATERIAL,
  POINTER_DEFAULTS as ALPHA_POINTER,
} from '../ui-elements/glass-alphabet/constants.ts'

// ── Defaults ─────────────────────────────────────────────────────────────────
const RENDER_DEF = {
  material: { ...RENDER_MATERIAL },
  hover: { ...HOVER_DEFAULTS },
  springs: {
    squashX: { ...renderSquashX },
    squashZ: { ...renderSquashZ },
    wiggleX: { ...renderWiggleX },
  },
}

const WIRE_DEF = {
  material: { ...WIRE_MATERIAL },
  hover: { ...WIRE_HOVER },
  springs: {
    squashX: { ...wireSquashX },
    squashZ: { ...wireSquashZ },
    wiggleX: { ...wireWiggleX },
  },
  stage: { camera: { ...WIRE_CAMERA }, light: { ...WIRE_LIGHT }, quality: 2.0 },
  click: {
    squashX: WIRE_JIGGLE_X,
    squashZ: WIRE_JIGGLE_Z,
    wiggleX: WIRE_JIGGLE_W,
    delayMs: 1100,
  },
}

const ALPHA_DEF = {
  material: { ...ALPHA_MATERIAL },
  pointer: { ...ALPHA_POINTER },
}

const GLASS_DEF = {
  ...overlayDefaults,
  centerX: 0.5,
  centerY: 0.5,
  rectW: 0.16,
  rectH: 0.05,
  radius: 0.02,
  start: 0.04,
  end: 0.09,
}

// ── Stage each element sits on ───────────────────────────────────────────────
function Bench({ name, summary, children, wide = false }) {
  return (
    <section style={{ marginBottom: 46 }}>
      <div style={{
        ...mono, fontSize: 10, letterSpacing: '0.14em', color: '#2a4a1a',
        textTransform: 'uppercase', marginBottom: 4,
      }}>
        {name}
      </div>
      <div style={{
        ...mono, fontSize: 9.5, color: 'rgba(0,0,0,0.42)', lineHeight: 1.7,
        marginBottom: 14, maxWidth: 620,
      }}>
        {summary}
      </div>
      <div style={{
        padding: wide ? 0 : '28px 20px',
        borderRadius: 12,
        border: '1px solid rgba(74,124,63,0.12)',
        background: 'rgba(255,255,255,0.16)',
        display: 'flex', justifyContent: 'center',
      }}>
        {children}
      </div>
    </section>
  )
}

export default function UiTunePage() {
  const [openSection, setOpenSection] = useState('alphaGlass')
  const toggle = name => setOpenSection(s => (s === name ? null : name))

  // Jelly render button
  const [render, setRender] = useState(RENDER_DEF)
  const setRenderMat = (k, v) => setRender(s => ({ ...s, material: { ...s.material, [k]: v } }))

  // Jelly wireframe button
  const [wire, setWire] = useState(WIRE_DEF)
  const setWireMat = (k, v) => setWire(s => ({ ...s, material: { ...s.material, [k]: v } }))
  const setWireCam = (k, v) => setWire(s => ({ ...s, stage: { ...s.stage, camera: { ...s.stage.camera, [k]: v } } }))
  const setWireLight = (k, v) => setWire(s => ({ ...s, stage: { ...s.stage, light: { ...s.stage.light, [k]: v } } }))
  const setWireClick = (k, v) => setWire(s => ({ ...s, click: { ...s.click, [k]: v } }))

  // Glass alphabet
  const [alpha, setAlpha] = useState(ALPHA_DEF)
  const setAlphaMat = (k, v) => setAlpha(s => ({ ...s, material: { ...s.material, [k]: v } }))
  const setAlphaPtr = (k, v) => setAlpha(s => ({ ...s, pointer: { ...s.pointer, [k]: v } }))
  const [lastLetter, setLastLetter] = useState(null)

  // Liquid glass
  const [glass, setGlass] = useState(GLASS_DEF)
  const [glassMode, setGlassMode] = useState('page')
  const [glassFollow, setGlassFollow] = useState(false)
  const setGlassParam = (k, v) => setGlass(p => ({ ...p, [k]: v }))

  const [copied, setCopied] = useState(false)
  const copyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify({
      jellyRenderButton: render,
      jellyWireframeButton: wire,
      liquidGlass: { mode: glassMode, follow: glassFollow, params: glass },
      glassAlphabet: alpha,
    }, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => {
    setRender(structuredClone(RENDER_DEF))
    setWire(structuredClone(WIRE_DEF))
    setAlpha(structuredClone(ALPHA_DEF))
    setGlass({ ...GLASS_DEF })
    setGlassMode('page')
    setGlassFollow(false)
  }

  return (
    <>
      {/* The real component, not a copy of its settings. The liquid glass in
          'page' mode refracts this, so it has to behave exactly as it does in
          the app — a second set of numbers here would drift. */}
      <FluidCursor />

      {/* No stacking context here — .page sets z-index 20 and needs to resolve
          against the root, or it lands under the fluid canvas at 5. */}
      <div style={{ paddingRight: 288 }}>
        <div className="page">
          <div className="masthead" style={{ paddingBottom: '1.5rem' }}>
            <span className="over">UI Element Workbench</span>
            <p className="sub" style={{ marginTop: '0.75rem' }}>
              Reusable widgets on their own, away from the app. Approve one here,
              then wire it in.
            </p>
          </div>

          <Bench
            name="Glass Alphabet"
            summary="Twenty-six real buttons — click handlers, keyboard focus, the letter as DOM text — with one canvas behind them drawing all the glass. Each tile is a rounded box in a shared SDF, given the same ring refraction the liquid glass panels use, plus frost and a glow field that blooms through the middle of the grid. Moving the cursor across it nudges the tiles it passes; clicking kicks one and its neighbours."
            wide
          >
            <div style={{ width: '100%', maxWidth: 560 }}>
              <GlassAlphabet
                material={alpha.material}
                pointer={alpha.pointer}
                onSelect={setLastLetter}
              />
              <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.4)', textAlign: 'center', marginTop: 10 }}>
                {lastLetter ? `onSelect fired: ${lastLetter}` : 'click a letter — onSelect is where the Landsat grid would open'}
              </div>
            </div>
          </Bench>

          <Bench
            name="Liquid Glass"
            summary="TypeGPU's liquid-glass shader, unchanged. A rounded box measured by an SDF; the visible lens is that box inflated by Edge End, and the ring between Edge Start and Edge End displaces the backdrop outward while the middle just blurs it. It refracts a texture, so on a page it can only bend what has been rebuilt into one — the background gradients and the fluid cursor, not the DOM."
            wide
          >
            <div style={{ width: '100%' }}>
              <LiquidGlassDemo params={glass} mode={glassMode} follow={glassFollow} />
            </div>
          </Bench>

          <Bench
            name="Jelly Wireframe Button"
            summary="A ray-marched translucent cuboid resting on the word RENDER, with the box's twelve edges drawn through it. Hovering nearby stirs it, clicking makes it wobble. Currently the render button in Write With Nature."
          >
            <div style={{ width: '100%', maxWidth: 480 }}>
              <JellyWireframeButton
                material={wire.material}
                hover={wire.hover}
                springs={wire.springs}
                camera={wire.stage.camera}
                light={wire.stage.light}
                quality={wire.stage.quality}
                impulses={wire.click}
                jiggleMs={wire.click.delayMs}
                onClick={() => {}}
              />
            </div>
          </Bench>

          <Bench
            name="Jelly Render Button"
            summary="The same widget without the wireframe, and tuned softer — a Fresnel rim the wireframe version switches off, and more transparency through the body. Superseded in the app, kept as a known-good fallback."
          >
            <div style={{ width: '100%', maxWidth: 480 }}>
              <JellyRenderButton
                material={render.material}
                hover={render.hover}
                springs={render.springs}
                onClick={() => {}}
              />
            </div>
          </Bench>

          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.3)', lineHeight: 1.8, paddingBottom: '3rem' }}>
            All three need WebGPU — Chrome or Edge. Each falls back to something
            plain elsewhere.
          </div>
        </div>
      </div>

      <ControlPanel
        title="UI ELEMENTS"
        subtitle="workbench"
        actions={
          <>
            <button onClick={copyConfig} style={btnStyle(copied)}>
              {copied ? '✓ Copied!' : 'Copy Config'}
            </button>
            <button onClick={resetAll} style={btnStyle(false, true)}>Reset All</button>
          </>
        }
        footer={
          <>
            <a href="?tune" style={{ color: '#4a7c3f', textDecoration: 'none' }}>→ App tuning (?tune)</a><br />
            <a href="?" style={{ color: '#4a7c3f', textDecoration: 'none' }}>→ Back to app</a>
          </>
        }
      >
        {/* ── Glass alphabet ── */}
        <AccordionSection title="ALPHABET — GLASS" open={openSection === 'alphaGlass'} onToggle={() => toggle('alphaGlass')}>
          <GroupLabel first>SHAPE &amp; EDGE</GroupLabel>
          <Note>
            Distances are in tile heights, so a value means the same thing
            whatever size the tiles end up. The visible tile is the box inflated
            by Edge End, as with the panels.
          </Note>

          <Slider label="Corner Radius" value={alpha.material.radius} min={0} max={1} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setAlphaMat('radius', v)}
            description="Fraction of the tile's smaller half-extent. 1 is fully rounded; the reference squares sit around 0.35." />
          <Slider label="Edge Start" value={alpha.material.start} min={0} max={1} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setAlphaMat('start', v)}
            description="Where the frosted middle gives way to the refracting ring. A fraction of the tile's half-height, so it means the same at any tile size." />
          <Slider label="Edge End" value={alpha.material.end} min={0.02} max={1.2} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setAlphaMat('end', v)}
            description="The tile's outer boundary, and how far the box is inset before being inflated back — so the visible tile stays on its button however this moves." />
          <Slider label="Refraction" value={alpha.material.refractionStrength} min={0} max={0.5} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setAlphaMat('refractionStrength', v)} />
          <Slider label="Chromatic Aberration" value={alpha.material.chromaticStrength} min={0} max={0.2} step={0.002}
            fmt={v => v.toFixed(3)} onChange={v => setAlphaMat('chromaticStrength', v)} />
          <Slider label="Aberration Edge Bias" value={alpha.material.chromaticFalloff} min={0.2} max={4} step={0.05}
            onChange={v => setAlphaMat('chromaticFalloff', v)} />

          <Slider label="Gap" value={alpha.material.gap} min={0} max={0.8} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setAlphaMat('gap', v)}
            description="Extra inset on every tile, purely to open space between them. The CSS grid gap alone is not enough once the glass inflates each tile by Edge End — without this they grow into each other and the grid fuses into one sheet." />

          <GroupLabel>FORM — what makes a tile an object</GroupLabel>
          <Note>
            Twenty-six flat windows onto the same backdrop read as one sheet
            however far apart they sit. These give each tile its own internal
            gradient and its own lit rim.
          </Note>

          <Slider label="Face Gradient" value={alpha.material.faceGradient} min={0} max={1} step={0.01}
            onChange={v => setAlphaMat('faceGradient', v)}
            description="Brighter through the middle of each tile, deeper at its rim — the soft internal falloff that gives a cube volume. 0 is a flat face." />

          <Slider label="Bevel Light" value={alpha.material.bevel} min={0} max={0.8} step={0.01}
            onChange={v => setAlphaMat('bevel', v)}
            description="The rim turns over, so it catches light on one side and loses it on the other. This is what separates neighbouring tiles even where their colours match." />

          <Slider label="Edge Darken" value={alpha.material.edgeDarken} min={0} max={1} step={0.01}
            onChange={v => setAlphaMat('edgeDarken', v)}
            description="Shading into the rim, which stops a tile bleeding into the one beside it." />

          <Slider label="Light Angle" value={alpha.material.lightAngle} min={0} max={360} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setAlphaMat('lightAngle', v)}
            description="Degrees. Drives the bevel on every tile, so they are all lit from the same direction." />

          <GroupLabel>FROST</GroupLabel>
          <Slider label="Blur" value={alpha.material.blur} min={0} max={6} step={0.1}
            onChange={v => setAlphaMat('blur', v)} />
          <Slider label="Edge Blur ×" value={alpha.material.edgeBlurMultiplier} min={0} max={2} step={0.05}
            onChange={v => setAlphaMat('edgeBlurMultiplier', v)} />
          <Slider label="Frost Fill" value={alpha.material.frostFill} min={0} max={0.6} step={0.01}
            onChange={v => setAlphaMat('frostFill', v)}
            description="The white wash. This is what reads as frosted — blur alone keeps the backdrop's brightness and looks like plastic." />
          <Slider label="Frost Grain" value={alpha.material.frostGrain} min={0} max={1} step={0.01}
            onChange={v => setAlphaMat('frostGrain', v)}
            description="Speckle, the roughness of the surface catching light." />

          <GroupLabel>TINT</GroupLabel>
          <Note>
            Deliberately lighter than the panels&apos;. Twenty-six small tiles stack
            their tint into something much heavier than one sheet of the same
            glass would read as.
          </Note>
          <Slider label="Strength" value={alpha.material.tintStrength} min={0} max={0.4} step={0.002}
            fmt={v => v.toFixed(3)} onChange={v => setAlphaMat('tintStrength', v)} />
          <Slider label="R" value={alpha.material.tintR} min={0} max={1} step={0.01} onChange={v => setAlphaMat('tintR', v)} />
          <Slider label="G" value={alpha.material.tintG} min={0} max={1} step={0.01} onChange={v => setAlphaMat('tintG', v)} />
          <Slider label="B" value={alpha.material.tintB} min={0} max={1} step={0.01} onChange={v => setAlphaMat('tintB', v)} />
        </AccordionSection>

        <AccordionSection title="ALPHABET — GLOW" open={openSection === 'alphaGlow'} onToggle={() => toggle('alphaGlow')}>
          <Note>
            Sampled at each tile&apos;s CENTRE, not per pixel — so a tile gets one
            colour and reads as an object. Sampling per pixel gives a smooth
            wash flowing across the whole grid, which is what made 26 tiles look
            like a single sheet.
          </Note>

          <Slider label="Strength" value={alpha.material.glowStrength} min={0} max={3} step={0.02}
            onChange={v => setAlphaMat('glowStrength', v)} />
          <Slider label="Spread" value={alpha.material.glowSpread} min={0.05} max={3} step={0.01}
            onChange={v => setAlphaMat('glowSpread', v)}
            description="How far the field reaches from the grid's centre. Small keeps the bloom to a few tiles; large lights them all evenly and loses the effect." />
          <Slider label="Edge Concentration" value={alpha.material.glowEdge} min={0.2} max={6} step={0.05}
            onChange={v => setAlphaMat('glowEdge', v)}
            description="How hard the glow is pushed into the rim. Low spills it across the whole tile face." />
          <Slider label="Hover Glow" value={alpha.material.hoverGlow} min={0} max={3} step={0.02}
            onChange={v => setAlphaMat('hoverGlow', v)}
            description="Extra light on whatever the pointer is over." />

          <GroupLabel>NEAR COLOUR — the centre of the bloom</GroupLabel>
          <Slider label="R" value={alpha.material.glowR} min={0} max={1} step={0.01} onChange={v => setAlphaMat('glowR', v)} />
          <Slider label="G" value={alpha.material.glowG} min={0} max={1} step={0.01} onChange={v => setAlphaMat('glowG', v)} />
          <Slider label="B" value={alpha.material.glowB} min={0} max={1} step={0.01} onChange={v => setAlphaMat('glowB', v)} />

          <GroupLabel>FAR COLOUR — the edges of the grid</GroupLabel>
          <Slider label="R" value={alpha.material.glowFarR} min={0} max={1} step={0.01} onChange={v => setAlphaMat('glowFarR', v)} />
          <Slider label="G" value={alpha.material.glowFarG} min={0} max={1} step={0.01} onChange={v => setAlphaMat('glowFarG', v)} />
          <Slider label="B" value={alpha.material.glowFarB} min={0} max={1} step={0.01} onChange={v => setAlphaMat('glowFarB', v)} />
        </AccordionSection>

        <AccordionSection title="ALPHABET — WOBBLE" open={openSection === 'alphaWobble'} onToggle={() => toggle('alphaWobble')}>
          <Note>
            Per-tile springs, same model as the jelly. The values drive the
            shader and a CSS transform on the button together, so a tile and its
            letter never drift apart.
          </Note>

          <Slider label="Reach (tiles)" value={alpha.pointer.radius} min={0.5} max={8} step={0.1}
            onChange={v => setAlphaPtr('radius', v)}
            description="How far the disturbance spreads from the cursor, in tile widths. Large makes the whole grid breathe as one; small picks out individual tiles." />
          <Slider label="Strength" value={alpha.pointer.strength} min={0} max={3} step={0.05}
            onChange={v => setAlphaPtr('strength', v)} />
          <Slider label="Travel per Impulse (px)" value={alpha.pointer.sensitivity} min={4} max={160} step={2}
            fmt={v => v.toFixed(0)} onChange={v => setAlphaPtr('sensitivity', v)}
            description="Inverted, as on the jelly: low is twitchy." />
          <Slider label="Gain" value={alpha.pointer.gain} min={0} max={5} step={0.05}
            onChange={v => setAlphaPtr('gain', v)} />
          <Slider label="Throttle (ms)" value={alpha.pointer.throttleMs} min={16} max={160} step={2}
            fmt={v => v.toFixed(0)} onChange={v => setAlphaPtr('throttleMs', v)} />
          <Slider label="Click Impulse" value={alpha.pointer.clickImpulse} min={0} max={20} step={0.5}
            onChange={v => setAlphaPtr('clickImpulse', v)}
            description="Kicks the clicked tile and its neighbours, so a press lands on the grid rather than on one square." />
        </AccordionSection>

        <div style={{ borderTop: '1px solid rgba(74,124,63,0.08)', margin: '4px 0 6px' }} />

        {/* ── Liquid glass ── */}
        <AccordionSection title="GLASS — LIQUID GLASS" open={openSection === 'glass'} onToggle={() => toggle('glass')}>
          <LiquidGlassControls
            params={glass}
            set={setGlassParam}
            mode={glassMode}
            setMode={setGlassMode}
            follow={glassFollow}
            setFollow={setGlassFollow}
          />
        </AccordionSection>

        <div style={{ borderTop: '1px solid rgba(74,124,63,0.08)', margin: '4px 0 6px' }} />

        {/* ── Jelly wireframe button ── */}
        <AccordionSection title="WIREFRAME — EDGES" open={openSection === 'wEdges'} onToggle={() => toggle('wEdges')}>
          <Note>
            The cuboid&apos;s twelve edges, traced along the refracted ray so they
            bend through the glass the same way the word does.
          </Note>

          <GroupLabel first>LINES</GroupLabel>
          <Slider label="Line Width" value={wire.material.frameWidth} min={0} max={0.08} step={0.001}
            fmt={v => v.toFixed(3)} onChange={v => setWireMat('frameWidth', v)}
            description="Half-thickness of the bars in world units, against a blob 1.6 wide. 0 removes the wireframe and leaves the plain jelly." />
          <Slider label="Line Opacity" value={wire.material.frameGain} min={0} max={3} step={0.05}
            onChange={v => setWireMat('frameGain', v)}
            description="Goes into the alpha channel as well as the colour, so above 1 the edges stay opaque even where the body is see-through." />
          <Slider label="Line Softness" value={wire.material.frameSoftness} min={0} max={4} step={0.02}
            onChange={v => setWireMat('frameSoftness', v)}
            description="Falloff as a fraction of the bar width. Well above 1 the line is almost entirely falloff, which reads as caught light rather than ink." />
          <Slider label="Line Brightness" value={wire.material.frameBrightness} min={0} max={1} step={0.01}
            onChange={v => setWireMat('frameBrightness', v)}
            description="0 = near-black ink. 1 = white, which reads as light in the edges." />
          <Slider label="Line Falloff" value={wire.material.frameFalloff} min={0.15} max={4} step={0.05}
            onChange={v => setWireMat('frameFalloff', v)}
            description="Shape of the gradient out from the core. Below 1 spreads it into a halo; above 1 pulls it into a bright thread with a faint tail." />
          <Slider label="Ink → Light" value={wire.material.frameGlow} min={0} max={1} step={0.01}
            onChange={v => setWireMat('frameGlow', v)}
            description="0 paints the line over the body; 1 adds it as light, so it comes through the glass and stops forcing the body opaque underneath." />
          <Slider label="Line Dispersion" value={wire.material.frameDispersion} min={0} max={3} step={0.05}
            onChange={v => setWireMat('frameDispersion', v)}
            description="Chromatic aberration on the edges. The frame is traced monochrome, so without this it stays achromatic however much dispersion the glass has. Costs two extra marches above 0." />
          <Slider label="Depth Fade" value={wire.material.frameDepthFade} min={0} max={4} step={0.05}
            onChange={v => setWireMat('frameDepthFade', v)}
            description="Dims edges by how deep they sit. At 0 all twelve draw at the same weight however far back they are, which is most of what makes the shape read as a diagram." />

          <GroupLabel>SOFT INNER EDGE</GroupLabel>
          <Note>
            Not drawn — the floor darkens in a band where the blob meets it, and
            refraction shows that band as an inset edge.
          </Note>
          <Slider label="Edge Width" value={wire.material.edgeWidth} min={0.005} max={0.35} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWireMat('edgeWidth', v)}
            description="Measured horizontally out from the silhouette." />
          <Slider label="Edge Darkness" value={wire.material.edgeDark} min={0} max={1} step={0.01}
            onChange={v => setWireMat('edgeDark', v)} />
          <Slider label="Base Brightness" value={wire.material.baseBright} min={0} max={1.4} step={0.01}
            onChange={v => setWireMat('baseBright', v)}
            description="Light on the floor under the blob. 1 keeps the base reading as translucent." />

          <GroupLabel>SHAPE FIT</GroupLabel>
          <Slider label="Corner Radius" value={wire.material.round} min={0.01} max={0.2} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWireMat('round', v)}
            description="A large fillet leaves no corner for the frame to sit on and the lines float clear of the silhouette." />
          <Slider label="Bend" value={wire.material.bend} min={0} max={0.4} step={0.01}
            onChange={v => setWireMat('bend', v)}
            description="The bend is not an affine transform, so the wireframe cannot follow it — past about 0.15 the lines peel away from the body." />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — GLASS" open={openSection === 'wGlass'} onToggle={() => toggle('wGlass')}>
          <GlassMaterialControls mat={wire.material} set={setWireMat} />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — SHAPE" open={openSection === 'wShape'} onToggle={() => toggle('wShape')}>
          <GroupLabel first>Half-extents · the blob is twice these across</GroupLabel>
          <Slider label="Width (X)" value={wire.material.halfX} min={0.1} max={1.8} step={0.01}
            onChange={v => setWireMat('halfX', v)}
            description="The word has to stay inside this or it pokes out from under the glass." />
          <Slider label="Height (Y)" value={wire.material.halfY} min={0.05} max={1} step={0.01}
            onChange={v => setWireMat('halfY', v)}
            description="The strongest single control here: it sets how much material light crosses, so it drives the absorption gradient, and it decides how far refraction throws the word backwards — raise it and Label Depth has to follow." />
          <Slider label="Depth (Z)" value={wire.material.halfZ} min={0.05} max={1.2} step={0.01}
            onChange={v => setWireMat('halfZ', v)} />
          <Slider label="Sink" value={wire.material.sink} min={-0.2} max={0.3} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWireMat('sink', v)}
            description="How far the blob settles into the plane. Negative lifts it clear and breaks the contact edge." />
          <Note>The wireframe is built from these same half-extents, so it tracks the box as you resize it.</Note>
        </AccordionSection>

        <AccordionSection title="WIREFRAME — WORD" open={openSection === 'wWord'} onToggle={() => toggle('wWord')}>
          <Slider label="Label Depth (z)" value={wire.material.labelCenterZ} min={-0.9} max={0.4} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWireMat('labelCenterZ', v)}
            description="Larger moves the word's refracted image toward the camera and so DOWN the screen. Refraction throws that image about a quarter unit back, and this compensates." />
          <Slider label="Label Across (x)" value={wire.material.labelCenterX} min={-0.8} max={0.8} step={0.005}
            fmt={v => v.toFixed(3)} onChange={v => setWireMat('labelCenterX', v)}
            description="Barely displaced by refraction, since the camera looks down the centre line — moves close to one-for-one." />
          <Slider label="Label Scale" value={wire.material.labelScale} min={0.3} max={3} step={0.01}
            onChange={v => setWireMat('labelScale', v)} />
          <Slider label="Ink" value={wire.material.labelInk} min={0} max={1} step={0.01}
            onChange={v => setWireMat('labelInk', v)}
            description="0 fades the word out entirely, worth trying if you want the box read on its own." />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — STAGE" open={openSection === 'wStage'} onToggle={() => toggle('wStage')}>
          <GroupLabel first>CAMERA</GroupLabel>
          <Slider label="Height" value={wire.stage.camera.height} min={0.3} max={3} step={0.02}
            onChange={v => setWireCam('height', v)}
            description="With Distance this sets the viewing angle — the biggest lever on whether the shape reads as a cuboid at all." />
          <Slider label="Distance" value={wire.stage.camera.distance} min={0.1} max={3} step={0.02}
            onChange={v => setWireCam('distance', v)} />
          <Slider label="Look At (y)" value={wire.stage.camera.targetY} min={-0.3} max={1} step={0.01}
            onChange={v => setWireCam('targetY', v)} />
          <Slider label="Field of View" value={wire.stage.camera.fov} min={12} max={90} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setWireCam('fov', v)}
            description="Narrow flattens perspective toward isometric, which suits a box." />

          <GroupLabel>LIGHT</GroupLabel>
          <Slider label="Azimuth" value={wire.stage.light.azimuth} min={-180} max={180} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setWireLight('azimuth', v)} />
          <Slider label="Elevation" value={wire.stage.light.elevation} min={-10} max={85} step={1}
            fmt={v => v.toFixed(0)} onChange={v => setWireLight('elevation', v)}
            description="Low grazes the body and pushes light through it, which is what Subsurface Scatter needs to show anything; high lights the top face and kills the glow." />

          <GroupLabel>QUALITY</GroupLabel>
          <Slider label="Supersample" value={wire.stage.quality} min={0.5} max={3} step={0.25}
            onChange={v => setWire(s => ({ ...s, stage: { ...s.stage, quality: v } }))}
            description="2 renders at twice the canvas and downsamples, which is what keeps the silhouette clean against a transparent page. Rebuilds the render targets on change." />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — POINTER" open={openSection === 'wHover'} onToggle={() => toggle('wHover')}>
          <HoverControls hover={wire.hover} setHover={fn => setWire(s => ({ ...s, hover: typeof fn === 'function' ? fn(s.hover) : fn }))} />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — SPRINGS" open={openSection === 'wSprings'} onToggle={() => toggle('wSprings')}>
          <SpringControls springs={wire.springs} setSprings={fn => setWire(s => ({ ...s, springs: typeof fn === 'function' ? fn(s.springs) : fn }))} />
        </AccordionSection>

        <AccordionSection title="WIREFRAME — CLICK" open={openSection === 'wClick'} onToggle={() => toggle('wClick')}>
          <Note>
            Impulses fired into the springs on release. Amplitude is roughly the
            impulse over the spring&apos;s frequency, so these set how hard it is hit
            and SPRINGS decides what happens next.
          </Note>
          <Slider label="Squash X Impulse" value={wire.click.squashX} min={-20} max={20} step={0.5}
            onChange={v => setWireClick('squashX', v)} description="TypeGPU fires -5." />
          <Slider label="Squash Z Impulse" value={wire.click.squashZ} min={-20} max={20} step={0.5}
            onChange={v => setWireClick('squashZ', v)} description="TypeGPU fires 5." />
          <Slider label="Rock Impulse" value={wire.click.wiggleX} min={-30} max={30} step={0.5}
            onChange={v => setWireClick('wiggleX', v)} description="TypeGPU fires -10, and it is the most visible of the three." />
          <Slider label="Delay before action (ms)" value={wire.click.delayMs} min={0} max={3000} step={50}
            fmt={v => v.toFixed(0)} onChange={v => setWireClick('delayMs', v)}
            description="How long the wobble plays before onClick fires. Match it to how long the springs actually ring." />
        </AccordionSection>

        <div style={{ borderTop: '1px solid rgba(74,124,63,0.08)', margin: '4px 0 6px' }} />

        {/* ── Jelly render button ── */}
        <AccordionSection title="RENDER BTN — GLASS" open={openSection === 'rGlass'} onToggle={() => toggle('rGlass')}>
          <GlassMaterialControls mat={render.material} set={setRenderMat} />
        </AccordionSection>

        <AccordionSection title="RENDER BTN — POINTER" open={openSection === 'rHover'} onToggle={() => toggle('rHover')}>
          <HoverControls hover={render.hover} setHover={fn => setRender(s => ({ ...s, hover: typeof fn === 'function' ? fn(s.hover) : fn }))} />
        </AccordionSection>

        <AccordionSection title="RENDER BTN — SPRINGS" open={openSection === 'rSprings'} onToggle={() => toggle('rSprings')}>
          <SpringControls springs={render.springs} setSprings={fn => setRender(s => ({ ...s, springs: typeof fn === 'function' ? fn(s.springs) : fn }))} />
        </AccordionSection>
      </ControlPanel>
    </>
  )
}
