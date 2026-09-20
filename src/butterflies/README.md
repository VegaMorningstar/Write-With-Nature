# butterflies

A field of butterflies that covers an element and scatters on a press.

Self contained. No framework, no CSS file, no image assets, no fonts, no
network. Copy the folder into a project and import it.

```
butterflies/
  index.ts       public surface
  field.ts       the engine, plain DOM and requestAnimationFrame
  butterfly.ts   the artwork: bezier wings, gradients, sprite baking
  options.ts     every dial, with the values it ships at
  react.tsx      a thin React wrapper
```

## Vanilla

```js
import { mountButterflies } from './butterflies';

const host = document.getElementById('loader');

const field = mountButterflies(host, {
  invite: 'Tap or click anywhere to release',
  onReveal: () => host.classList.add('gone'),   // fade it out from here
});
```

The host wants a size and a position; the field fills it absolutely and paints
its own dark backdrop, so the host needs no background of its own — the field
is dense enough that every butterfly's individual shadow, overlapping its
neighbours', reads as solid ground. A full screen overlay is the usual case:

```css
#loader { position: fixed; inset: 0; z-index: 10; transition: opacity .9s ease; }
#loader.gone { opacity: 0; pointer-events: none; }
```

A panel works identically, because sizing comes from the container rather than
the window.

## React

```jsx
import { ButterflyLoader } from './butterflies/react';

<ButterflyLoader
  invite="Click to release"
  onReveal={() => setReady(true)}
/>
```

## The handle

```ts
field.release(x, y)  // start the release yourself, coordinates optional
field.skip()         // hurry one already running
field.pause()        // stop the loop without tearing down
field.resume()
field.destroy()      // remove canvas, listeners, observers
field.canvas         // if you need to style it
```

## Options

| | |
|---|---|
| `onReveal` | Fires once, when the field has thinned enough to hand over. |
| `onRelease` | Fires once, on the press that starts the release. |
| `invite` | Line shown at the foot of the field, or `null` for none. |
| `inviteDelay` | Seconds before it fades in. Default 1.6. |
| `respectReducedMotion` | Default true. Leave it on. |
| `tuning` | Any subset of `ButterflyTuning`. |

`DEFAULT_TUNING` carries about forty named constants: density, the wing beat,
the response to a pointer, the release choreography, the skip, and the device
pixel ratio caps. Override only what you want to move.

```js
mountButterflies(host, {
  tuning: { HOVER_R: 150, WAVE_SCALE: 1, layers: [myLayer] },
});
```

`BASE_SZ` and the layer spacings move together. Shrinking the butterflies
without also shrinking `layers[].gs` leaves the same grid with smaller objects
on it, so the field goes sparse: fewer overlapping shadows, and whatever the
field covers starts showing through the gaps. Halve both to keep the coverage
you had:

```js
import { LAYERS } from './butterflies';

tuning: {
  BASE_SZ: 0.2,
  layers: LAYERS.map(l => ({ ...l, gs: l.gs * 0.5 })),
}
```

## Two things worth knowing

**`onReveal` is not the end of the animation.** It fires when the field has
thinned enough to hand over, with butterflies still in the air. Cross-fade your
content in at that moment so the two movements overlap. Waiting for the last
butterfly leaves a dead beat, which is the thing this timing exists to avoid.

**Reduced motion is honoured by default.** When the visitor has asked for it,
the field draws nothing and calls `onReveal` immediately, so your page appears
without the animation. A full screen of continuous movement is exactly what
that preference is for, so do not switch this off to keep the effect.

**There is no backdrop layer.** Every butterfly casts its own shadow — same
wingbeat, no colour, just a soft dark silhouette a little down-and-right of it
at rest. Packed as densely as the field is, those shadows overlap enough to
read as solid ground on their own. On release, a butterfly's shadow trails
behind it rather than jumping to match, so the gap between them opens up as it
flies; that gap is what fades the shadow out and spreads its blur, the same
way a real shadow's penumbra widens the further its object lifts off the
ground. Light reaches a spot exactly when the shadows that were covering it
have thinned, not on any separate schedule.

## Cost

Sprites are painted once at startup into cropped offscreen canvases and stamped
from then on, so the per-frame work is `drawImage` calls rather than path
filling. Head count follows the container size at a fixed pixel pitch: a few
hundred on a phone, several thousand on a large display. The device pixel ratio
is capped, lower on a coarse pointer, because fill rate is the limit.
