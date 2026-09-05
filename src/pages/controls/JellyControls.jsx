/**
 * Control groups shared by both jelly widgets. They carry the same material
 * struct, the same spring model and the same pointer handling — they just no
 * longer agree on the values, so each gets its own state and these render
 * against whatever is passed in.
 */
import { Slider, SpringRow, GroupLabel, Note } from './primitives.jsx'

/** The twelve glass material sliders. */
export function GlassMaterialControls({ mat, set }) {
  return (
    <>
      <GroupLabel first>TRANSPARENCY</GroupLabel>

      <Slider label="Base Transparency" value={1 - mat.baseAlpha} min={0} max={1} step={0.01}
        onChange={v => set('baseAlpha', 1 - v)}
        description="How much of the page and the word show through the middle of the blob. High = clear glass, but the interior shading washes out. Low = solid gummy." />

      <Slider label="Edge Opacity" value={mat.fresnelAlpha} min={0} max={10} step={0.1}
        onChange={v => set('fresnelAlpha', v)}
        description="How hard Fresnel drives the rim opaque at grazing angles. This is what gives glass its dense bright edge against a clear centre. 0 = uniform transparency, which looks like tinted film." />

      <GroupLabel>REFRACTION</GroupLabel>

      <Slider label="Refractive Index" value={mat.ior} min={1.01} max={2.4} step={0.01}
        onChange={v => set('ior', v)}
        description="How hard light bends entering the jelly. 1.0 = no bend, invisible. 1.33 water, 1.42 stock, 1.5 glass, 2.4 diamond. Raising it throws the word further back and needs Label Depth moved with it." />

      <Slider label="Chromatic Aberration" value={mat.dispersion} min={0} max={0.35} step={0.005}
        fmt={v => v.toFixed(3)} onChange={v => set('dispersion', v)}
        description="Splits red, green and blue onto their own refractive indices. Widens the colour fringe at the rim and along the letter edges. 0 = achromatic." />

      <Slider label="Frost / Blur" value={mat.blur} min={0} max={0.6} step={0.01}
        onChange={v => set('blur', v)}
        description="Scatters the refracted ray. The TAA averages it across frames into a real blur, so it settles about a third of a second after you stop dragging. Past ~0.35 the noise outruns what the TAA can resolve and it starts to sparkle." />

      <GroupLabel>COLOUR &amp; ABSORPTION</GroupLabel>

      <Slider label="Tint Strength" value={mat.tint} min={0} max={1.5} step={0.01}
        onChange={v => set('tint', v)}
        description="Overall colour saturation. TypeGPU's liquid-glass example runs 0.05 — glass reads as glass when the tint is a suggestion rather than a filter." />

      <Slider label="Absorption Density" value={mat.absorbDensity} min={0} max={60} step={0.5}
        fmt={v => v.toFixed(1)} onChange={v => set('absorbDensity', v)}
        description="Beer-Lambert density. Sets how fast colour deepens with depth through the body, so it darkens the bottom far more than the top. High values swallow the word." />

      <Slider label="Subsurface Scatter" value={mat.scatter} min={0} max={10} step={0.1}
        onChange={v => set('scatter', v)}
        description="Forward scattering toward the light — the glow you get holding a gummy up to a lamp. Only shows where the refracted ray points at the light, so it needs a low Light Elevation to do anything." />

      <GroupLabel>LIGHT &amp; SHADOW</GroupLabel>

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

      <Note>All live — these are a uniform, not baked shader constants.</Note>
    </>
  )
}

/** Pointer proximity and the impulses it feeds into the springs. */
export function HoverControls({ hover, setHover }) {
  const set = (k, v) => setHover(h => ({ ...h, [k]: v }))
  return (
    <>
      <GroupLabel first>REACH</GroupLabel>

      <Slider label="Hover Radius (px)" value={hover.radius} min={0} max={700} step={10}
        fmt={v => v.toFixed(0)} onChange={v => set('radius', v)}
        description="How far from the button the jelly still notices the cursor. 0 = only reacts once you are on it. Large = stirs from across the card." />

      <Slider label="Strength" value={hover.strength} min={0} max={2} step={0.05}
        onChange={v => set('strength', v)}
        description="Ceiling on the hover impulse, reached when the cursor is directly over the blob. Falls off with the square of distance from there." />

      <GroupLabel>SENSITIVITY</GroupLabel>

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

/** The three springs every deformation runs through. */
export function SpringControls({ springs, setSprings }) {
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

      <Note>
        Retunes live · no scene rebuild. Values above ~200,000 stiffness will
        outrun the integrator.
      </Note>
    </>
  )
}
