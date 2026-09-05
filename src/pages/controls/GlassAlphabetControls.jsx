/**
 * Controls for the glass alphabet.
 *
 * Grouped the way the shader is built: the lens shape, the ring that does the
 * refracting, the tint, the letter under the glass, and the springs. Distances
 * are in pixels — the shader works in canvas heights, which is right for it and
 * hopeless for tuning a 30px tile.
 */
import { Slider, Toggle, GroupLabel, Note } from './primitives.jsx'

export function GlassAlphabetControls({ material, setMat, pointer, setPtr, fluidBlend, setFluidBlend }) {
  return (
    <>
      <GroupLabel first>SHAPE</GroupLabel>

      <Slider label="Tile Size (px)" value={material.size} min={20} max={140} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('size', v)}
        description="30 matches the colophon's alphabet grid in the app." />
      <Slider label="Corner Radius (px)" value={material.radius} min={0} max={60} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('radius', v)} />
      <Slider label="Gap (px)" value={material.gap} min={0} max={48} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('gap', v)} />

      <GroupLabel>LENS — the ring that refracts</GroupLabel>
      <Note>
        The visible tile is an SDF box inflated by Edge Width, and the ring
        between Ring Start and that edge is where the backdrop gets displaced
        outward. Inside the ring the glass only blurs; outside it nothing is
        drawn, so the gaps show the real page.
      </Note>

      <Slider label="Edge Width (px)" value={material.edge} min={1} max={20} step={0.5}
        onChange={v => setMat('edge', v)}
        description="The rim's thickness, and how far the tile grows beyond its box. Most of what reads as glass happens in this band." />
      <Slider label="Ring Start (px)" value={material.ringStart} min={0} max={12} step={0.5}
        onChange={v => setMat('ringStart', v)}
        description="Above zero leaves a flat blurred band before the rim begins." />
      <Slider label="Refraction" value={material.refractionStrength} min={0} max={0.12} step={0.001}
        fmt={v => v.toFixed(3)} onChange={v => setMat('refractionStrength', v)}
        description="How far the ring drags the backdrop, as a fraction of the canvas. TypeGPU's demo runs 0.1 across a full-screen lozenge; on a 30px tile that hauls in colour from the far side of the grid." />
      <Slider label="Chromatic Aberration" value={material.chromaticStrength} min={0} max={0.04} step={0.0005}
        fmt={v => v.toFixed(4)} onChange={v => setMat('chromaticStrength', v)}
        description="Splits that displacement across three refractive indices — red bends least, blue most. This is the width of the colour fringe at the rim." />
      <Slider label="Fringe Falloff" value={material.chromaticFalloff} min={0.2} max={6} step={0.05}
        onChange={v => setMat('chromaticFalloff', v)}
        description="Exponent on the fringe's ramp across the ring. 1 is TypeGPU's linear version; higher pushes the colour into the outer rim." />

      <GroupLabel>BODY</GroupLabel>

      <Slider label="Blur" value={material.blur} min={0} max={5} step={0.05}
        onChange={v => setMat('blur', v)}
        description="Mip bias for what you see through the middle of the tile." />
      <Slider label="Edge Blur ×" value={material.edgeBlurMultiplier} min={0} max={2} step={0.05}
        onChange={v => setMat('edgeBlurMultiplier', v)}
        description="Below 1 the rim is sharper than the body, which is what makes the edge read as a bevel rather than a smear." />
      <Slider label="Edge Feather" value={material.edgeFeather} min={0} max={8} step={0.1}
        onChange={v => setMat('edgeFeather', v)}
        description="Antialiasing on the lens boundary, in texels." />

      <GroupLabel>TINT</GroupLabel>
      <Note>
        From the jelly&apos;s notes, and TypeGPU&apos;s: glass reads as glass
        when the tint is a suggestion, not a filter. Their example runs 0.05.
      </Note>

      <Slider label="Tint Strength" value={material.tintStrength} min={0} max={1} step={0.01}
        onChange={v => setMat('tintStrength', v)} />
      <Slider label="Tint R" value={material.tintR} min={0} max={1} step={0.01} onChange={v => setMat('tintR', v)} />
      <Slider label="Tint G" value={material.tintG} min={0} max={1} step={0.01} onChange={v => setMat('tintG', v)} />
      <Slider label="Tint B" value={material.tintB} min={0} max={1} step={0.01} onChange={v => setMat('tintB', v)} />

      <GroupLabel>LETTER — painted under the glass</GroupLabel>
      <Note>
        The letters go into the backdrop the shader refracts, not on top of the
        canvas, so they are displaced and split by the lens the way RENDER is
        under the jelly button. Sliding Refraction up moves them.
      </Note>

      <Slider label="Size (px)" value={material.letterSize} min={6} max={60} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('letterSize', v)} />
      <Slider label="Weight" value={material.letterWeight} min={300} max={900} step={100}
        fmt={v => v.toFixed(0)} onChange={v => setMat('letterWeight', v)} />
      <Slider label="Opacity" value={material.letterOpacity} min={0} max={1} step={0.01}
        onChange={v => setMat('letterOpacity', v)} />
      <Slider label="R" value={material.letterR} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterR', v)} />
      <Slider label="G" value={material.letterG} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterG', v)} />
      <Slider label="B" value={material.letterB} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterB', v)} />

      <GroupLabel>WOBBLE</GroupLabel>
      <Note>
        The jelly&apos;s springs, resizing each tile&apos;s box in the shader
        uniform every frame — so the deformation is in the glass rather than a
        CSS transform of a picture of glass.
      </Note>

      <Slider label="Reach (tiles)" value={pointer.radius} min={0.5} max={8} step={0.1}
        onChange={v => setPtr('radius', v)}
        description="How far the disturbance spreads from the cursor. Large makes the grid breathe as one; small picks out individual tiles." />
      <Slider label="Strength" value={pointer.strength} min={0} max={3} step={0.05}
        onChange={v => setPtr('strength', v)} />
      <Slider label="Gain" value={pointer.gain} min={0} max={2} step={0.01}
        onChange={v => setPtr('gain', v)} />
      <Slider label="Travel per Impulse (px)" value={pointer.sensitivity} min={4} max={160} step={2}
        fmt={v => v.toFixed(0)} onChange={v => setPtr('sensitivity', v)}
        description="Inverted, as on the jelly: low is twitchy." />
      <Slider label="Throttle (ms)" value={pointer.throttleMs} min={16} max={160} step={2}
        fmt={v => v.toFixed(0)} onChange={v => setPtr('throttleMs', v)} />
      <Slider label="Hover Impulse" value={pointer.hoverImpulse} min={0} max={2} step={0.02}
        onChange={v => setPtr('hoverImpulse', v)}
        description="Fires when the cursor crosses into a tile, so a slow approach still gets a wobble — the sliders above only respond to travel." />
      <Slider label="Hover Lift (px)" value={pointer.hoverLift} min={0} max={20} step={0.5}
        onChange={v => setPtr('hoverLift', v)}
        description="How far a hovered tile holds itself above the grid until the cursor leaves." />
      <Slider label="Click Impulse" value={pointer.clickImpulse} min={0} max={2} step={0.02}
        onChange={v => setPtr('clickImpulse', v)}
        description="Kicks the clicked tile and its neighbours." />

      <GroupLabel>BACKDROP</GroupLabel>
      <Note>
        The shader cannot sample the DOM, so the page behind the grid is rebuilt
        into a texture each frame — paper gradients, the fluid canvas, then the
        letters. That is why the fluid&apos;s multiply blend is no longer a
        problem here: this reads the fluid canvas directly rather than relying on
        backdrop-filter, which cannot see blended content.
      </Note>

      <Toggle
        label="Fluid blend: multiply"
        value={fluidBlend === 'multiply'}
        onChange={v => setFluidBlend(v ? 'multiply' : 'normal')}
        description="On is what the app ships — the colour stains the paper. Off lifts it into an overlay. Either way the glass here sees it."
      />
    </>
  )
}

export default GlassAlphabetControls
