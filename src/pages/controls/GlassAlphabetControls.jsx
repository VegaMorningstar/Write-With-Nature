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

      <Slider label="Edge Width (px)" value={material.edge} min={1} max={40} step={0.5}
        onChange={v => setMat('edge', v)}
        description="The rim's thickness, and how far the tile grows beyond its box. Nearly everything that reads as depth happens in this band — a thin rim gives a flat pane however strong the refraction. The approved square runs it at 0.6 of the box's half-width." />
      <Slider label="Ring Start (px)" value={material.ringStart} min={0} max={30} step={0.5}
        onChange={v => setMat('ringStart', v)}
        description="The flat blurred band before the rim begins. Their square starts it at about 0.27 of the box's half-width." />
      <Slider label="Refraction" value={material.refractionStrength} min={0} max={0.9} step={0.002}
        fmt={v => v.toFixed(3)} onChange={v => setMat('refractionStrength', v)}
        description="How far the ring drags the backdrop, in canvas heights — the same unit the liquid glass square uses, so its 0.1 transfers straight over. A tile this small needs several times that before the bend is legible; the ceiling was raised once the tuned value hit it." />
      <Slider label="Rim Aberration" value={material.chromaticStrength} min={0} max={0.25} step={0.0005}
        fmt={v => v.toFixed(4)} onChange={v => setMat('chromaticStrength', v)}
        description="Splits the rim's displacement across three refractive indices — red bends least, blue most. This is the width of the colour fringe at the edge." />
      <Slider label="Fringe Falloff" value={material.chromaticFalloff} min={0.2} max={6} step={0.05}
        onChange={v => setMat('chromaticFalloff', v)}
        description="Exponent on the fringe's ramp across the ring. 1 is TypeGPU's linear version; higher pushes the colour into the outer rim." />
      <Slider label="Edge Curve" value={material.edgeCurve} min={0.2} max={8} step={0.05}
        onChange={v => setMat('edgeCurve', v)}
        description="The same exponent, on the displacement itself. 1 is TypeGPU's linear ramp — a flat chamfer. Above it the bend holds off near the body and sweeps fast at the rim, which reads as a rounded lip rather than a slope." />
      <Slider label="Body Dispersion" value={material.bodyChromatic} min={0} max={0.06} step={0.0005}
        fmt={v => v.toFixed(4)} onChange={v => setMat('bodyChromatic', v)}
        description="The jelly's dispersion rather than the rim's: splits what you see through the middle of the tile, letter included. Strongest against the tile's own edge and fading to nothing at its centre, since a slab splits light where you look through it at an angle and not head on." />

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

      <GroupLabel>LETTER — under the glass</GroupLabel>
      <Note>
        The letters sit in a texture of their own, refracted and fringed by the
        lens like everything else behind the tile but sampled at their own mip
        bias. Sharing the backdrop&apos;s bias is what made them mush: that bias
        exists to blur the glass body, and a 20px glyph does not survive it.
      </Note>

      <Slider label="Size (px)" value={material.letterSize} min={6} max={60} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('letterSize', v)} />
      <Slider label="Weight" value={material.letterWeight} min={300} max={900} step={100}
        fmt={v => v.toFixed(0)} onChange={v => setMat('letterWeight', v)} />
      <Slider label="Letter Blur" value={material.letterBlur} min={0} max={4} step={0.05}
        onChange={v => setMat('letterBlur', v)}
        description="Its own mip bias, independent of the body's. Zero is mip 0 — as sharp as the glyph was drawn." />
      <Slider label="Opacity" value={material.letterOpacity} min={0} max={1} step={0.01}
        onChange={v => setMat('letterOpacity', v)} />
      <Slider label="R" value={material.letterR} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterR', v)} />
      <Slider label="G" value={material.letterG} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterG', v)} />
      <Slider label="B" value={material.letterB} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterB', v)} />

      <GroupLabel>GLOW — the press</GroupLabel>
      <Note>
        Emission from residual wobble energy, as on the jelly. It replaces the
        focus ring a click used to leave behind — the ring is now keyboard-only,
        via :focus-visible, so a mouse press is marked by light instead of a
        green band.
      </Note>

      <Slider label="Glow Strength" value={material.glowStrength} min={0} max={3} step={0.02}
        onChange={v => setMat('glowStrength', v)} />
      <Slider label="Glow Gain" value={pointer.glowGain} min={0} max={3} step={0.02}
        onChange={v => setPtr('glowGain', v)}
        description="How readily spring energy becomes light. A settled tile is always dark, so this sets how bright a disturbed one gets, not a floor." />
      <Slider label="Halo Reach (px)" value={material.glowHalo} min={0} max={60} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('glowHalo', v)}
        description="How far the light spills past the tile into the gaps." />
      <Slider label="R" value={material.glowR} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('glowR', v)} />
      <Slider label="G" value={material.glowG} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('glowG', v)} />
      <Slider label="B" value={material.glowB} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('glowB', v)} />

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

      {/* Bench only: the app has one fluid blend and it is not tuned per
          element, so ?tune omits this rather than offering a dial prod has no
          equivalent for. */}
      {setFluidBlend && (
        <>
          <GroupLabel>BACKDROP</GroupLabel>
          <Note>
            The shader cannot sample the DOM, so the page behind the grid is
            rebuilt into a texture each frame — paper gradients, the fluid
            canvas, then the letters. That is why the fluid&apos;s multiply
            blend is no longer a problem here: this reads the fluid canvas
            directly rather than relying on backdrop-filter, which cannot see
            blended content.
          </Note>

          <Toggle
            label="Fluid blend: multiply"
            value={fluidBlend === 'multiply'}
            onChange={v => setFluidBlend(v ? 'multiply' : 'normal')}
            description="On is what the app ships — the colour stains the paper. Off lifts it into an overlay. Either way the glass here sees it."
          />
        </>
      )}
    </>
  )
}

export default GlassAlphabetControls
