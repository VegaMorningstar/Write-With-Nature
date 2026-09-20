/**
 * A field of butterflies that covers a page and scatters on a press.
 *
 * Self contained: no framework, no CSS file, no image assets, no build step
 * beyond whatever bundles your TypeScript. Drop the folder in and import.
 *
 * Vanilla:
 *
 *   import { mountButterflies } from './butterflies';
 *
 *   const host = document.getElementById('loader');
 *   const field = mountButterflies(host, {
 *     invite: 'Tap or click anywhere to release',
 *     onReveal: () => host.classList.add('gone'),
 *   });
 *
 * React:
 *
 *   import { ButterflyLoader } from './butterflies/react';
 *
 *   <ButterflyLoader invite="Click to release" onReveal={() => setReady(true)} />
 *
 * The host element wants a size and a background; the field fills it
 * absolutely. A full screen overlay is the usual case, but a panel works
 * exactly the same, because sizing comes from the container rather than the
 * window.
 *
 * onReveal fires when the field has thinned enough to hand over, not when the
 * last butterfly leaves. Cross-fade your content in at that moment and the two
 * movements overlap, which is the whole point of the timing.
 */

export { mountButterflies, type ButterflyField } from './field';
export {
  DEFAULT_TUNING,
  type ButterflyOptions,
  type ButterflyTuning,
} from './options';

// The art, for anyone who wants the sprites without the field.
export {
  BASE_SZ,
  drawButterfly,
  getSprites,
  LAYERS,
  makeBody,
  makeGlow,
  makeShadow,
  makeSilhouette,
  makeVignette,
  makeWing,
  paintBody,
  paintWings,
  SS,
  wingPaths,
  type Layer,
  type Sprite,
} from './butterfly';
