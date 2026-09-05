/**
 * Controls for the glass alphabet.
 *
 * Grouped the way the look is actually built: a frosted fill, a bright rim, a
 * colour field across the grid, and springs. All CSS — an earlier WebGPU build
 * bought nothing the reference needed and failed silently three times over.
 */
import { Slider, Toggle, GroupLabel, Note } from './primitives.jsx'

export function GlassAlphabetControls({ material, setMat, pointer, setPtr, fluidBlend, setFluidBlend }) {
  return (
    <>
      <GroupLabel first>BACKDROP — what the tiles have to bend</GroupLabel>
      <Note>
        The fluid is the only thing on the page with enough structure to
        refract; the background gradient is smooth, so bending it produces
        nothing to see. An element with mix-blend-mode forms its own backdrop
        root and Chrome will not let a backdrop-filter sample it, so the
        fluid&apos;s old multiply blend hid it from every frosted panel in the
        app. It now composites normally, which is what makes the refraction
        below visible at all.
      </Note>

      <Toggle
        label="Fluid visible to the glass"
        value={fluidBlend === 'normal'}
        onChange={v => setFluidBlend(v ? 'normal' : 'multiply')}
        description="Off restores the multiply blend — the fluid sinks into the paper and vanishes from the glass. Kept here to compare the two; the tiles go flat with it off, and that is the backdrop, not the material."
      />

      <GroupLabel>SHAPE</GroupLabel>

      <Slider label="Tile Size (px)" value={material.size} min={20} max={140} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('size', v)}
        description="30 matches the colophon's alphabet grid in the app." />
      <Slider label="Corner Radius (px)" value={material.radius} min={0} max={60} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('radius', v)} />
      <Slider label="Gap (px)" value={material.gap} min={0} max={48} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('gap', v)} />

      <GroupLabel>REFRACTION — the lens</GroupLabel>
      <Note>
        The same construction as the app&apos;s glass panels: fractal noise,
        blurred into a displacement map, bending the backdrop behind the tile.
      </Note>

      <Slider label="Refraction (px)" value={material.refraction} min={0} max={60} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('refraction', v)}
        description="How far the backdrop is pushed. Past roughly the tile's own width it stops reading as glass and starts reading as smear." />
      <Slider label="Lens Scale" value={material.refractionScale} min={0.002} max={0.08} step={0.001}
        fmt={v => v.toFixed(3)} onChange={v => setMat('refractionScale', v)}
        description="Noise frequency. Low is one broad warp across the tile; high is many small ones." />
      <Slider label="Chromatic Aberration" value={material.chromatic} min={0} max={1} step={0.01}
        onChange={v => setMat('chromatic', v)}
        description="Refracts three times at three scales and takes red, green and blue from each — the same trick the WebGPU liquid glass plays with three refractive indices. Needs some Refraction above zero to show." />

      <GroupLabel>FROST</GroupLabel>
      <Note>
        From the jelly&apos;s own notes: glass reads as glass when the tint is a
        suggestion, not a filter. Four white layers land on a tile — Fill, Face
        Gradient, Grain, and whatever Brightness lifts out of the backdrop —
        and they compound, so half opacity on each is an opaque tile. Every one
        of these should stay a suggestion; the Fresnel rim above carries the
        tile.
      </Note>

      <Slider label="Blur (px)" value={material.blur} min={0} max={40} step={0.5}
        onChange={v => setMat('blur', v)}
        description="Blurs whatever the page puts behind the tile. On a 30px tile anything past about 6 averages the backdrop to a flat colour, which is its own kind of opaque." />
      <Slider label="Fill" value={material.fill} min={0} max={1} step={0.01}
        onChange={v => setMat('fill', v)}
        description="A flat white wash over the whole face. The most direct way to kill transparency — small values only." />
      <Slider label="Grain" value={material.grain} min={0} max={1} step={0.01}
        onChange={v => setMat('grain', v)}
        description="Speckle painted over the fill. The dust half of frost." />
      <Slider label="Roughness (px)" value={material.roughness} min={0} max={6} step={0.1}
        onChange={v => setMat('roughness', v)}
        description="Fine displacement on the refracted backdrop — the other half. Pits the surface rather than warping it, so it stays legible where Refraction would not." />
      <Slider label="Saturate (%)" value={material.saturate} min={50} max={320} step={5}
        fmt={v => v.toFixed(0)} onChange={v => setMat('saturate', v)} />
      <Slider label="Brightness" value={material.brightness} min={0.7} max={1.5} step={0.01}
        onChange={v => setMat('brightness', v)} />

      <GroupLabel>RIM — where the opacity belongs</GroupLabel>
      <Note>
        The jelly gets its glass from Fresnel: a surface turning away from the
        eye goes opaque at its silhouette and stays clear where you look
        straight through it. Spreading that opacity flat across the face
        instead is what turns a pane into a painted chip. So push these up and
        the face washes down, not the other way round.
      </Note>

      <Slider label="Fresnel Rim" value={material.fresnel} min={0} max={1} step={0.01}
        onChange={v => setMat('fresnel', v)}
        description="Bright the whole way round the border, fading to nothing at the centre. The tile's main source of presence." />
      <Slider label="Fresnel Width (px)" value={material.fresnelWidth} min={0} max={20} step={0.5}
        onChange={v => setMat('fresnelWidth', v)}
        description="How far in it reaches. Past about a third of the tile it stops being a rim and becomes a fill." />
      <Slider label="Border" value={material.border} min={0} max={1} step={0.01}
        onChange={v => setMat('border', v)} />
      <Slider label="Border Width (px)" value={material.borderWidth} min={0} max={4} step={0.5}
        fmt={v => v.toFixed(1)} onChange={v => setMat('borderWidth', v)} />
      <Slider label="Top Highlight" value={material.innerTop} min={0} max={1} step={0.01}
        onChange={v => setMat('innerTop', v)}
        description="Inset light along the top edge, as if lit from above." />
      <Slider label="Bottom Shade" value={material.innerBottom} min={0} max={1} step={0.01}
        onChange={v => setMat('innerBottom', v)}
        description="Inset shade along the bottom. With the highlight above it, this is what gives the tile thickness." />

      <GroupLabel>COLOUR — the bloom across the grid</GroupLabel>
      <Note>
        Each tile takes one colour from a field centred on the grid, so the
        bloom runs through the middle. Colouring every tile the same is what
        makes 26 of them read as wallpaper.
      </Note>

      <Slider label="Glow Strength" value={material.glowStrength} min={0} max={1.5} step={0.01}
        onChange={v => setMat('glowStrength', v)}
        description="The halo each tile casts around itself, in its own colour." />
      <Slider label="Glow Blur (px)" value={material.glowBlur} min={0} max={80} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('glowBlur', v)} />
      <Slider label="Spread (tiles)" value={material.glowSpread} min={0.4} max={8} step={0.05}
        onChange={v => setMat('glowSpread', v)}
        description="How far the field reaches from the grid's centre. Small keeps the bloom to a few tiles; large lights them all alike and loses it." />
      <Slider label="Face Tint" value={material.tintStrength} min={0} max={1} step={0.01}
        onChange={v => setMat('tintStrength', v)}
        description="How much of that colour lands in the tile's own face, rather than only in its halo." />
      <Slider label="Face Gradient" value={material.faceGradient} min={0} max={1} step={0.01}
        onChange={v => setMat('faceGradient', v)}
        description="A sheen across one corner — what gives a flat rectangle a lit surface. It fades out by halfway, so it stays a highlight rather than a coat; it is still the largest single source of opacity here." />
      <Slider label="Face Angle" value={material.faceAngle} min={0} max={360} step={1}
        fmt={v => v.toFixed(0)} onChange={v => setMat('faceAngle', v)} />

      <GroupLabel>CENTRE COLOUR</GroupLabel>
      <Slider label="R" value={material.nearR} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('nearR', v)} />
      <Slider label="G" value={material.nearG} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('nearG', v)} />
      <Slider label="B" value={material.nearB} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('nearB', v)} />

      <GroupLabel>EDGE COLOUR</GroupLabel>
      <Slider label="R" value={material.farR} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('farR', v)} />
      <Slider label="G" value={material.farG} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('farG', v)} />
      <Slider label="B" value={material.farB} min={0} max={255} step={1} fmt={v => v.toFixed(0)} onChange={v => setMat('farB', v)} />

      <GroupLabel>LETTER</GroupLabel>
      <Slider label="Size (px)" value={material.letterSize} min={10} max={60} step={1}
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
        Springs written straight to each button&apos;s transform, so a tile and its
        letter are the same element and cannot drift apart.
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
    </>
  )
}

export default GlassAlphabetControls
