# UI elements

Self-contained WebGPU widgets. Both are ports of TypeGPU examples, adapted for
this app. They live here rather than in `src/components/` so the shelved ones sit
alongside the ones in use.

Everything here needs `navigator.gpu` — Chrome and Edge only. Anything you wire up
must have a CSS fallback for Safari, Firefox and iOS.

`unplugin-typegpu/vite` compiles the `'use gpu'` functions to WGSL, and it **must
be first** in the plugins array in `vite.config.js`, ahead of the React plugin.

---

## `jelly-render-button/` — in use

The render button in the compose card. A translucent jelly cuboid resting on the
word RENDER; clicking jiggles it and the page moves to the collage once it
settles.

```jsx
import JellyRenderButton from './ui-elements/jelly-render-button/JellyRenderButton'

<JellyRenderButton onClick={handleRender} label="RENDER" />
```

Props: `onClick`, `color` (linear RGB triple), `label`.

The component renders a plain `.render-btn` when `navigator.gpu` is absent, and
defers GPU init to `requestIdleCallback` so it never blocks page load.

**Tuning** lives in `constants.ts`. The ones worth knowing:

| Constant | Does |
| --- | --- |
| `JELLY_BASE_ALPHA` | How much of the page shows through the middle of the blob |
| `JELLY_TINT` | Colour strength. Lower reads as clearer glass |
| `JELLY_DISPERSION` | Width of the chromatic fringe |
| `LABEL_CENTER_Z` | See below — retune whenever the camera or blob thickness moves |
| `squash*/wiggle*Properties` | Spring tuning, currently TypeGPU's verbatim |

Hover response lives in `JellyRenderButton.jsx` as `HOVER_DEFAULTS`, since it is
pointer handling rather than rendering. Both it and the springs can be overridden
live through the `hover` and `springs` props — the tune page at **`?tune`** drives
them with sliders under JELLY — POINTER and JELLY — SPRINGS, and Copy Config
emits the values under a `jelly` key. Retuning does not rebuild the scene.

**`LABEL_CENTER_Z` is the fragile one.** The word is a texture on a plane inside
the scene, not DOM behind the canvas, which is what lets it refract and pick up
the chromatic fringe. But refraction displaces it backwards by roughly
`thickness * tan(asin(sin(view angle) / IOR))` — about 0.26 world units at the
current camera, which is three times the word's own height. `LABEL_CENTER_Z`
shifts the plane by that amount so the refracted image lands under the blob. Move
the camera or change `JELLY_HALFSIZE.y` and the word will slide out from under the
jelly until this is recomputed.

---

## `jelly-slider/` — shelved, not wired up

TypeGPU's jelly-slider example, ported but never integrated. Richer than the
render button: it has `computeOptimalQuality()`, a runtime light direction, and an
optional blur pass.

It is kept verbatim, so `index.ts` is still the upstream example's entry point —
it grabs `document.querySelector('canvas')` at module scope, does a top-level
`await tgpu.init()`, and imports a `defineControls` helper that does not exist in
this repo. Nothing imports it, so Vite never compiles it and the broken import is
inert.

To use it, don't touch `index.ts` — write a React wrapper against `scene.ts`
instead. `setupScene(root, context)` has the same shape as the render button's, so
`JellyRenderButton.jsx` is a working template for the init, cleanup and pointer
handling; the setter names differ (`lightDirection`, `blurEnabled`,
`computeOptimalQuality`).
