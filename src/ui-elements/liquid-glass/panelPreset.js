/**
 * The liquid glass settings the app's panels ship with.
 *
 * One preset for the compose card, the board and the colophon. The lens size is
 * deliberately absent: LiquidGlassPanel measures each element and derives
 * rectW, rectH and the corner radius from it, so what is here is the edge
 * character rather than the shape.
 */
import { overlayDefaults } from './overlay.ts'

export const PANEL_GLASS = {
  ...overlayDefaults,
  // Where the frosted middle gives way to the refracting ring, and where the
  // ring ends — the lens's outer boundary, which is the panel's own edge.
  start: 0.037,
  end: 0.078,
  // Colour fringing at the rim, biased inward from a hard edge
  chromaticStrength: 0.097,
  chromaticFalloff: 0.35,
  refractionStrength: 0.14,
  // Frost across the middle; the ring stays sharper
  blur: 1.2,
  edgeBlurMultiplier: 0.7,
  edgeFeather: 2,
  // A suggestion of violet, as in TypeGPU's own example
  tintStrength: 0.05,
  tintR: 0.58,
  tintG: 0.44,
  tintB: 0.96,
}

export default PANEL_GLASS
