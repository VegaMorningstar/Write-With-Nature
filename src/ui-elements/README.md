# UI elements

Self-contained WebGPU widgets, all descended from TypeGPU examples. They live
here rather than in `src/components/` so the shelved ones sit alongside the one
in use.

Everything here needs `navigator.gpu` — Chrome and Edge only. Anything you wire
up must have a CSS fallback for Safari, Firefox and iOS.

`unplugin-typegpu/vite` compiles the `'use gpu'` functions to WGSL, and it **must
be first** in the plugins array in `vite.config.js`, ahead of the React plugin.

| Folder | Status |
| --- | --- |
| `jelly-wireframe-button/` | **In use** — the render button on the compose card |
| `jelly-render-button/` | Superseded by the wireframe variant, kept as a fallback |
| `jelly-slider/` | Shelved, never integrated |

---

## `jelly-wireframe-button/` — in use

A translucent jelly cuboid resting on the word RENDER, with the box's twelve
edges drawn through it. Hovering nearby stirs it, clicking makes it wobble, and
the page moves to the collage once it settles.

```jsx
import JellyWireframeButton from './ui-elements/jelly-wireframe-button/JellyWireframeButton'

<JellyWireframeButton onClick={handleRender} />
```

Every prop is optional. With none passed it runs the tuned defaults from
`constants.ts`, which is how `App.jsx` uses it. `onClick`, `color`, `label`,
`hover`, `springs`, `material`, `camera`, `light`, `impulses`, `quality`,
`jiggleMs` are all accepted, and the tune page passes all of them from sliders.

They are read through refs rather than effect deps, so retuning is a uniform
write and never tears down the WebGPU device — far too expensive to rebuild on a
slider drag. Camera and light are the exception and go through CPU setters, since
a view matrix is not a per-pixel value.

### Tuning

**`?tune`** drives the whole thing with sliders, in seven sections: EDGES, GLASS,
SHAPE, WORD, STAGE, POINTER, SPRINGS and CLICK. Copy Config emits everything
under a `jellyWireframe` key; paste the values back into `constants.ts` to make
them the defaults.

`MATERIAL_DEFAULTS` holds everything the shader reads, in one uniform rather than
baked into the WGSL. `CAMERA_DEFAULTS`, `LIGHT_DEFAULTS`, the spring properties
and the click impulses sit alongside it.

### Things that are not obvious

**The word is in the scene, not behind the canvas.** It is rasterised to a
texture in `label.ts` and rendered as a plane the rays actually hit. That is what
lets it refract and pick up the chromatic fringe; DOM text behind a transparent
canvas would sit flat.

**`labelCenterZ` compensates for refraction, and it is the fragile one.**
Refraction throws the word's image backwards by roughly
`thickness * tan(asin(sin(view angle) / IOR))` — a quarter of a unit or so at the
default camera, which is three times the word's own height. The plane is shifted
forward by that much so the image lands under the blob. It depends on the IOR,
the blob's thickness and the camera angle, so move any of those and the word
slides out from under the jelly until this follows.

**The second, upside-down RENDER is not a bug.** It is the front face refracting
the same word — a real double image through a thick faceted transparent body, the
upright one via the top face and the inverted one via the front. Lower IOR or
thickness weakens it.

**The soft inset edge is not ambient occlusion.** Occlusion marched up from the
floor sees the blob directly overhead across its entire footprint, so it dims the
whole floor uniformly instead of banding at the contact line — which reads as
murk under a body that is meant to be translucent. The edge comes from horizontal
distance to the blob's silhouette instead (`edgeWidth`, `edgeDark`). Occlusion is
still used for the contact shadow cast *outside* the blob, where the blob is not
overhead and it behaves sensibly.

**Corner radius fights the wireframe.** A large fillet leaves no corner for a
frame to sit on and the lines float clear of the silhouette. `bend` is worse: it
is not an affine transform, so the frame provably cannot follow it, and above
about 0.15 the lines visibly peel away from the body.

**Chromatic aberration is two separate things.** `dispersion` splits the
environment — the word and the floor seen through the glass. `frameDispersion`
splits the wireframe. The frame is traced separately and composited after, so it
stays achromatic however much dispersion the glass carries unless its own slider
is raised. It costs two extra marches, the most expensive thing in the shader, so
it branches on the uniform and is free at 0.

**Springs are integrated in fixed substeps.** Explicit Euler on springs this stiff
diverges past a `dt` of roughly 80ms, and triggering the render stalls the main
thread long enough to hit that. Without the substepping the squash values blow up
and the SDF degenerates. The squash values are also clamped before reaching the
GPU, since the shader divides the blob by `(1 - squash)`.

---

## `jelly-render-button/` — superseded

The version without the wireframe. Same architecture, and it was the live button
until the wireframe variant replaced it. Kept because it is a known-good fallback
and its glass is tuned differently — softer, with a Fresnel rim the wireframe
version turns off.

Its `?tune` sections are JELLY — GLASS, POINTER and SPRINGS, and it still renders
on the tune page beside the wireframe for comparison.

## `jelly-slider/` — shelved, not wired up

TypeGPU's jelly-slider example, ported but never integrated. Richer than either
button: it has `computeOptimalQuality()`, a runtime light direction and an
optional blur pass.

It is kept verbatim, so `index.ts` is still the upstream example's entry point —
it grabs `document.querySelector('canvas')` at module scope, does a top-level
`await tgpu.init()`, and imports a `defineControls` helper that does not exist in
this repo. Nothing imports it, so Vite never compiles it and the broken import is
inert.

To use it, don't touch `index.ts` — write a React wrapper against `scene.ts`
instead. `setupScene(root, context)` has the same shape, so
`JellyWireframeButton.jsx` is a working template for the init, cleanup and pointer
handling; the setter names differ (`lightDirection`, `blurEnabled`,
`computeOptimalQuality`).
