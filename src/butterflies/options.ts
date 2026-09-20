/**
 * Every dial the field exposes, with the values it ships at.
 *
 * The names are the ones the build report uses, so the documentation and the
 * API share one vocabulary. Pass a partial object and it is merged over these,
 * so you only name what you want to move.
 */

import { LAYERS, type Layer } from './butterfly';

export interface ButterflyTuning {
  /** Back to front. Each is its own jittered grid. */
  layers: Layer[];

  // ── the field ──
  /** Sprite to screen scale. 0.4 is roughly a 55px wingspan. */
  BASE_SZ: number;
  /** Row spacing as a fraction of column spacing. Butterflies are wide. */
  ROW_RATIO: number;
  /** Total spread of the per-butterfly offset from its grid mark. */
  JITTER: number;
  /** Total spread of random rotation, in radians. */
  TILT: number;

  // ── answering the pointer ──
  /** Reach of the pointer, in px. */
  HOVER_R: number;
  /** Per-frame approach to the target when waking. */
  RISE: number;
  /** Per-frame approach when settling. Keep it well below RISE. */
  FALL: number;
  IDLE_AMP: number;
  MAX_AMP: number;
  IDLE_SPEED: number;
  FAST_SPEED: number;
  /** Hysteresis pair. WAKE shuts the wings, SLEEP re-arms. Keep them apart. */
  WAKE: number;
  SLEEP: number;
  SHUT: number;
  /** Seconds the wings stay shut before beating. Zero loses the pose. */
  HOLD: number;

  // ── the release ──
  /** Flight duration, seconds. */
  FD: number;
  /** Ring thickness in px, roughly one wingspan. */
  BAND_PX: number;
  CONTACT_BANDS: number;
  POKE_STEP: number;
  PHASE_GAP: number;
  ROLL_LAYER_STEP: number;
  DIST_STEP: number;
  SLOW_STEP: number;
  SLOW_RINGS: number;
  BAND_JITTER: number;
  LAG_CHANCE: number;
  LAG_MAX: number;
  LAG_RAMP: number;
  /** Stretches phase two only. 1 is shipping speed. */
  WAVE_SCALE: number;
  STARTLE_AMP: number;
  STARTLE_LEAD: number;
  ALARM_AMP: number;
  ALARM_LEAD: number;
  FLY_UP: number;
  FLY_OUT: number;
  SPREAD_BIAS: number;
  SPREAD_RANDOM: number;
  RISE_VARY: number;

  // ── the shadow every butterfly casts ──
  /** Time constant, in seconds, for a shadow catching up to its butterfly's
   * light-offset spot. Higher lags more — the gap that opens up during a fast
   * flight is what fades and blurs the shadow, so this is the whole reveal's
   * pace-setter. In seconds rather than per-frame so it looks the same at any
   * frame rate. */
  SHADOW_LAG: number;
  /** Gap, in px, at which a trailing shadow has fully faded out. Set against
   * the scale of the flight (FLY_UP), not the field: too small and a shadow
   * blinks out in the first instant of a release instead of being watched
   * away. */
  SHADOW_FADE_DIST: number;

  // ── skipping ──
  /** Real seconds the remainder of the release gets after a second press. */
  SKIP_IN: number;
  /** Rate ceiling, so nothing teleports between two frames. */
  SKIP_MAX_RATE: number;
  /** Time constant for winding the clock up, in seconds. */
  SKIP_TAU: number;

  // ── resolution ──
  /** Device pixel ratio ceiling on a fine pointer, and on a coarse one. */
  DPR_FINE: number;
  DPR_COARSE: number;
}

export const DEFAULT_TUNING: ButterflyTuning = {
  layers: LAYERS,

  BASE_SZ: 0.4,
  ROW_RATIO: 0.62,
  JITTER: 0.62,
  TILT: 0.46,

  HOVER_R: 235,
  RISE: 0.17,
  FALL: 0.045,
  IDLE_AMP: 0.07,
  MAX_AMP: 0.88,
  IDLE_SPEED: 1.4,
  FAST_SPEED: 27,
  WAKE: 0.5,
  SLEEP: 0.12,
  SHUT: 0.3,
  HOLD: 0.42,

  FD: 1.65,
  BAND_PX: 52,
  CONTACT_BANDS: 1,
  POKE_STEP: 0.6,
  PHASE_GAP: 0.25,
  ROLL_LAYER_STEP: 0.09,
  DIST_STEP: 0.045,
  SLOW_STEP: 0.2,
  SLOW_RINGS: 5,
  BAND_JITTER: 0.03,
  LAG_CHANCE: 0.3,
  LAG_MAX: 0.2,
  LAG_RAMP: 6,
  WAVE_SCALE: 3,
  STARTLE_AMP: 0.4,
  STARTLE_LEAD: 1.5,
  ALARM_AMP: 0.92,
  ALARM_LEAD: 0.6,
  FLY_UP: 2600,
  FLY_OUT: 620,
  SPREAD_BIAS: 0.75,
  SPREAD_RANDOM: 0.7,
  RISE_VARY: 0.3,

  SHADOW_LAG: 0.2,
  SHADOW_FADE_DIST: 300,

  SKIP_IN: 0.4,
  SKIP_MAX_RATE: 14,
  SKIP_TAU: 0.07,

  DPR_FINE: 1.5,
  DPR_COARSE: 1.25,
};

export interface ButterflyOptions {
  /**
   * Fires once, when the field has thinned enough to hand over to whatever is
   * underneath. This is the moment to reveal your page, not after.
   */
  onReveal?: () => void;
  /** Fires once, on the press that starts the release. */
  onRelease?: (x: number, y: number) => void;

  /**
   * The line offered at the foot of the field. Set to null for none.
   * It is held back deliberately: the field should be discovered first.
   */
  invite?: string | null;
  /** Seconds before the invitation fades in. */
  inviteDelay?: number;

  /** Anything from ButterflyTuning. Unlisted keys keep their shipped value. */
  tuning?: Partial<ButterflyTuning>;

  /**
   * Skip the animation entirely and hand over immediately when the visitor has
   * asked for reduced motion. On by default, and you should leave it on: a
   * full screen of continuous movement is exactly what that preference is for.
   */
  respectReducedMotion?: boolean;
}
