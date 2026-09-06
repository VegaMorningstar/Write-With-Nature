/**
 * Controls for the glazed masthead.
 *
 * The same shader as the glass alphabet, so the same groups — but the numbers
 * live in a different range and the notes say why. The alphabet refracts a
 * smooth gradient and has to overdrive everything to be legible; this refracts
 * Landsat imagery, which is already dense, so the same settings would read as
 * damage rather than as glass.
 */
import { Slider, Chips, GroupLabel, Note } from './primitives.jsx'

export function GlassTitleControls({ material, setMat, pointer, setPtr }) {
  return (
    <>
      <GroupLabel first>SHAPE</GroupLabel>
      <Note>
        Tile size is measured from the container the way the masthead measures
        it, so a glazed row breaks where the CSS one does. These are the bounds
        it works between.
      </Note>

      <Slider label="Max Tile (px)" value={material.maxSize} min={40} max={140} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('maxSize', v)} />
      <Slider label="Min Tile (px)" value={material.minSize} min={20} max={80} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('minSize', v)} />
      <Slider label="Corner Radius (px)" value={material.radius} min={0} max={40} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('radius', v)} />
      <Slider label="Gap (px)" value={material.gap} min={0} max={24} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('gap', v)} />
      <Slider label="Row Gap (px)" value={material.rowGap} min={0} max={30} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('rowGap', v)} />
      <Slider label="Space Width" value={material.spaceRatio} min={0} max={1.5} step={0.05}
        onChange={v => setMat('spaceRatio', v)}
        description="The gap between WRITE and WITH, as a fraction of a tile." />

      <GroupLabel>GLAZE — the ring that refracts</GroupLabel>
      <Note>
        The SDF box is the image, and the shader inflates it by Edge Width to
        make the visible tile — so the glaze is added around the picture rather
        than carved out of it, and none of the photograph is spent on the bevel.
        What it refracts is the image itself, redrawn into a texture: a DOM image
        under a hole in the canvas would stay perfectly flat, since the shader
        cannot sample the page.
      </Note>

      <Slider label="Edge Width (px)" value={material.edge} min={0} max={30} step={0.5}
        onChange={v => setMat('edge', v)}
        description="The glaze's thickness, growing outward. The layout reserves it, so raising this spreads the tiles rather than shrinking their images." />
      <Slider label="Ring Start (px)" value={material.ringStart} min={0} max={20} step={0.5}
        onChange={v => setMat('ringStart', v)}
        description="A flat band before the rim begins. Above zero it sits outside the image, so it reads as clear glass overhanging the picture." />
      <Slider label="Refraction" value={material.refractionStrength} min={-0.6} max={0.6} step={0.002}
        fmt={v => v.toFixed(3)} onChange={v => setMat('refractionStrength', v)}
        description="Negative is worth trying. Positive pushes the sample outward, so the rim shows what lies beyond the tile; negative pulls the image out into the rim instead, which reads as glass thicker than the picture magnifying its own edge." />
      <Slider label="Edge Curve" value={material.edgeCurve} min={0.2} max={8} step={0.05}
        onChange={v => setMat('edgeCurve', v)}
        description="The edge's profile rather than its strength — how much of the image blends into it, and where. 1 is a flat chamfer, tilting at a constant rate from the image to the rim. Above 1 the bend holds off near the image and sweeps fast at the outer edge, so the picture compresses into a thin lip and reads as curved. Below 1 front-loads it into a dome." />
      <Slider label="Rim Aberration" value={material.chromaticStrength} min={0} max={0.08} step={0.0005}
        fmt={v => v.toFixed(4)} onChange={v => setMat('chromaticStrength', v)}
        description="Red bends least, blue most — the colour fringe along the glaze's edge." />
      <Slider label="Fringe Falloff" value={material.chromaticFalloff} min={0.2} max={6} step={0.05}
        onChange={v => setMat('chromaticFalloff', v)} />
      <Slider label="Body Dispersion" value={material.bodyChromatic} min={0} max={0.03} step={0.0002}
        fmt={v => v.toFixed(4)} onChange={v => setMat('bodyChromatic', v)}
        description="Splits the image seen through the middle of the tile, strongest against its own edge. Small values only — this one runs across photographic detail rather than a single glyph." />

      <GroupLabel>BODY</GroupLabel>

      <Slider label="Blur" value={material.blur} min={0} max={4} step={0.05}
        onChange={v => setMat('blur', v)}
        description="A mip level through the middle, not a bias — so zero really is the sharpest one. As a bias it was added to a level the hardware derived from the uv derivatives, and no setting could reach mip 0." />
      <Slider label="Edge Blur ×" value={material.edgeBlurMultiplier} min={0} max={2} step={0.05}
        onChange={v => setMat('edgeBlurMultiplier', v)}
        description="Below 1 the rim is sharper than the body, which is what makes the edge read as a bevel rather than a smear." />
      <Slider label="Edge Feather" value={material.edgeFeather} min={0} max={8} step={0.1}
        onChange={v => setMat('edgeFeather', v)} />

      <GroupLabel>TINT</GroupLabel>
      <Note>
        Lower than the alphabet&apos;s. These tiles carry their own colour and a
        tint fights it.
      </Note>

      <Slider label="Tint Strength" value={material.tintStrength} min={0} max={0.5} step={0.005}
        onChange={v => setMat('tintStrength', v)} />
      <Slider label="Tint R" value={material.tintR} min={0} max={1} step={0.01} onChange={v => setMat('tintR', v)} />
      <Slider label="Tint G" value={material.tintG} min={0} max={1} step={0.01} onChange={v => setMat('tintG', v)} />
      <Slider label="Tint B" value={material.tintB} min={0} max={1} step={0.01} onChange={v => setMat('tintB', v)} />

      <GroupLabel>CORNER GLYPH</GroupLabel>
      <Note>
        The letter in each tile&apos;s corner, in the overlay texture so the
        glaze refracts it along with the image beneath. Placed against the
        body&apos;s corner, not the visible tile&apos;s — the glaze extends past
        the picture, and a glyph set against its outer edge floats off into the
        bevel.
      </Note>

      <Chips label="Corner — horizontal" value={material.letterAlign}
        options={['left', 'center', 'right']}
        onChange={v => setMat('letterAlign', v)} />
      <Chips label="Corner — vertical" value={material.letterBaseline}
        options={['top', 'middle', 'bottom']}
        onChange={v => setMat('letterBaseline', v)} />
      <Slider label="Inset X (px)" value={material.letterInsetX} min={-20} max={60} step={0.5}
        onChange={v => setMat('letterInsetX', v)}
        description="In from the image's own left or right edge. Ignored on centre." />
      <Slider label="Inset Y (px)" value={material.letterInsetY} min={-20} max={60} step={0.5}
        onChange={v => setMat('letterInsetY', v)}
        description="In from the image's own top or bottom edge. Ignored on middle." />

      <Slider label="Size (px)" value={material.letterSize} min={5} max={40} step={0.5}
        onChange={v => setMat('letterSize', v)} />
      <Slider label="Weight" value={material.letterWeight} min={300} max={900} step={100}
        fmt={v => v.toFixed(0)} onChange={v => setMat('letterWeight', v)} />
      <Slider label="Opacity" value={material.letterOpacity} min={0} max={1} step={0.01}
        onChange={v => setMat('letterOpacity', v)} />
      <Slider label="R" value={material.letterR} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterR', v)} />
      <Slider label="G" value={material.letterG} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterG', v)} />
      <Slider label="B" value={material.letterB} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('letterB', v)} />

      <GroupLabel>GLOW — the press</GroupLabel>
      <Note>
        Emission from residual wobble energy, as on the jelly and the alphabet.
        Gold here rather than green, to sit with the masthead.
      </Note>

      <Slider label="Glow Strength" value={material.glowStrength} min={0} max={3} step={0.02}
        onChange={v => setMat('glowStrength', v)} />
      <Slider label="Glow Gain" value={pointer.glowGain} min={0} max={3} step={0.02}
        onChange={v => setPtr('glowGain', v)} />
      <Slider label="Halo Reach (px)" value={material.glowHalo} min={0} max={60} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('glowHalo', v)} />
      <Slider label="R" value={material.glowR} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('glowR', v)} />
      <Slider label="G" value={material.glowG} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('glowG', v)} />
      <Slider label="B" value={material.glowB} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('glowB', v)} />

      <GroupLabel>WOBBLE</GroupLabel>
      <Note>
        The jelly&apos;s springs, deforming each tile&apos;s box in the shader
        uniform every frame. Clicking also cycles the scene, as the masthead
        already does.
      </Note>

      <Slider label="Reach (tiles)" value={pointer.radius} min={0.5} max={8} step={0.1}
        onChange={v => setPtr('radius', v)}
        description="How far the disturbance spreads from the cursor. Large makes the whole word breathe; small picks out one letter." />
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
        description="Fires when the cursor crosses into a tile, so a slow approach still gets a wobble." />
      <Slider label="Hover Lift (px)" value={pointer.hoverLift} min={0} max={24} step={0.5}
        onChange={v => setPtr('hoverLift', v)}
        description="The masthead's CSS lifts a hovered tile 5px and scales it 1.07. This is the spring equivalent." />
      <Slider label="Click Impulse" value={pointer.clickImpulse} min={0} max={2} step={0.02}
        onChange={v => setPtr('clickImpulse', v)} />
    </>
  )
}

export default GlassTitleControls
