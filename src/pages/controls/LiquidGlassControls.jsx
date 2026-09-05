/**
 * The liquid glass suite, grouped the way the shader is actually organised.
 *
 * The shape is a rounded box measured by an SDF, and the visible lens is that
 * box inflated by Edge End — so the lozenge you see is always larger than
 * Width/Height suggest. Between Edge Start and Edge End is the ring, and the
 * ring is where everything interesting happens: the backdrop is displaced
 * outward there, by an amount that ramps from nothing at the inner edge to full
 * at the outer one. Inside the ring the backdrop is simply blurred. Outside it
 * is left alone.
 */
import { Slider, Toggle, Chips, GroupLabel, Note } from './primitives.jsx'

export function LiquidGlassControls({ params, set, mode, setMode, follow, setFollow }) {
  return (
    <>
      <GroupLabel first>BACKDROP — what the glass has to bend</GroupLabel>

      <Chips label="Source" value={mode} options={['page', 'image', 'none']} onChange={setMode}
        description="page = the real page background and fluid cursor, rebuilt into a texture every frame · image = a photograph, which is what their demo uses · none = an empty texture." />

      <Note>
        This is the constraint the whole effect lives under: it refracts a
        texture, so it can only distort what is in one. A page background of
        smooth gradients has almost nothing to bend — a blurred, displaced copy
        of a smooth gradient is the same gradient — which is why the fluid
        trails are what you actually see it working on. Try &apos;none&apos; once and the
        point makes itself.
      </Note>

      <GroupLabel>PLACEMENT</GroupLabel>

      <Toggle label="Follow cursor" value={follow} onChange={setFollow}
        description="Off pins the lens, which is the case worth judging: static glass with the background moving underneath." />

      <Slider label="Centre X" value={params.centerX} min={0} max={1} step={0.005}
        onChange={v => set('centerX', v)} />
      <Slider label="Centre Y" value={params.centerY} min={0} max={1} step={0.005}
        onChange={v => set('centerY', v)}
        description="Fraction of the element. Ignored while Follow cursor is on." />

      <Slider label="Width" value={params.rectW} min={0.01} max={0.5} step={0.005}
        onChange={v => set('rectW', v)}
        description="Half-width of the box the SDF measures from, before Edge End inflates it into the visible lens." />
      <Slider label="Height" value={params.rectH} min={0.01} max={0.5} step={0.005}
        onChange={v => set('rectH', v)}
        description="Half-height. Their default is 0.01 — almost a line, so nearly the whole visible lozenge is inflated edge rather than box." />
      <Slider label="Corner Radius" value={params.radius} min={0} max={0.05} step={0.001}
        fmt={v => v.toFixed(3)} onChange={v => set('radius', v)} />

      <GroupLabel>THE RING — where the refraction lives</GroupLabel>

      <Slider label="Edge Start" value={params.start} min={0} max={0.1} step={0.001}
        fmt={v => v.toFixed(3)} onChange={v => set('start', v)}
        description="SDF distance where the frosted middle ends and the ring begins." />

      <Slider label="Edge End" value={params.end} min={0} max={0.2} step={0.001}
        fmt={v => v.toFixed(3)} onChange={v => set('end', v)}
        description="Where the ring ends and the untouched backdrop resumes — the lens's actual outer boundary. The gap between this and Edge Start is the ring's width, and at their defaults it is roughly half the whole lozenge." />

      <Slider label="Refraction Strength" value={params.refractionStrength} min={0} max={0.2} step={0.001}
        fmt={v => v.toFixed(3)} onChange={v => set('refractionStrength', v)}
        description="How far the ring samples outward, in element fractions. Ramps from 0 at Edge Start to full at Edge End. Theirs is about twice the ring's width, which is why the backdrop smears so hard at the rim." />

      <Slider label="Chromatic Strength" value={params.chromaticStrength} min={0} max={0.1} step={0.001}
        fmt={v => v.toFixed(3)} onChange={v => set('chromaticStrength', v)}
        description="Separation between the red, green and blue samples across the ring. Red lands furthest out, blue least." />

      <Slider label="Edge Feather" value={params.edgeFeather} min={0} max={20} step={0.5}
        onChange={v => set('edgeFeather', v)}
        description="Softness of both weight boundaries, in texels of the backdrop. Near 0 the frosted middle meets the ring in a visible line." />

      <GroupLabel>FROST</GroupLabel>

      <Slider label="Blur" value={params.blur} min={0} max={6} step={0.1}
        onChange={v => set('blur', v)}
        description="Mip bias on the frosted middle. Needs the backdrop's mip chain, which is generated per frame when the source is the live page." />

      <Slider label="Edge Blur ×" value={params.edgeBlurMultiplier} min={0} max={2} step={0.05}
        onChange={v => set('edgeBlurMultiplier', v)}
        description="Ring blur as a multiple of the middle's. Theirs is 0.7 — the ring is SHARPER than the body, because the refraction detail is the point of the ring and blurring it away defeats it." />

      <GroupLabel>TINT</GroupLabel>

      <Slider label="Strength" value={params.tintStrength} min={0} max={1} step={0.005}
        fmt={v => v.toFixed(3)} onChange={v => set('tintStrength', v)}
        description="Mix toward the colour below, across both the body and the ring. Theirs is 0.05. Push it to 1 to find the lens if you have lost track of where it is." />

      <Slider label="R" value={params.tintR} min={0} max={1} step={0.01} onChange={v => set('tintR', v)} />
      <Slider label="G" value={params.tintG} min={0} max={1} step={0.01} onChange={v => set('tintG', v)} />
      <Slider label="B" value={params.tintB} min={0} max={1} step={0.01} onChange={v => set('tintB', v)}
        description="Their default is the violet 0.58 / 0.44 / 0.96." />
    </>
  )
}

export default LiquidGlassControls
