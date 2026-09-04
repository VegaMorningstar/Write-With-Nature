import type { TgpuRoot, TgpuUniform } from 'typegpu';
import {
  JIGGLE_SQUASH_X,
  JIGGLE_SQUASH_Z,
  JIGGLE_WIGGLE_X,
  squashXProperties,
  squashZProperties,
  wiggleXProperties,
} from './constants.ts';
import { SwitchState } from './dataTypes.ts';
import { Spring, type SpringProperties } from './spring.ts';

function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : 0;
}

export class SwitchBehavior {
  #root: TgpuRoot;

  stateUniform: TgpuUniform<typeof SwitchState>;

  pressed = false;

  #squashXSpring: Spring;
  #squashZSpring: Spring;
  #wiggleXSpring: Spring;

  constructor(root: TgpuRoot) {
    this.#root = root;

    this.#squashXSpring = new Spring(squashXProperties);
    this.#squashZSpring = new Spring(squashZProperties);
    this.#wiggleXSpring = new Spring(wiggleXProperties);

    this.stateUniform = this.#root.createUniform(SwitchState);
  }

  #impulses = {
    squashX: JIGGLE_SQUASH_X,
    squashZ: JIGGLE_SQUASH_Z,
    wiggleX: JIGGLE_WIGGLE_X,
  };

  /** Kick all three springs at once — the whole click response. */
  jiggle(strength = 1) {
    this.#squashXSpring.velocity += this.#impulses.squashX * strength;
    this.#squashZSpring.velocity += this.#impulses.squashZ * strength;
    this.#wiggleXSpring.velocity += this.#impulses.wiggleX * strength;
  }

  /** Live retuning of the click impulses. Values are merged, not replaced. */
  setImpulses(next: Partial<{ squashX: number; squashZ: number; wiggleX: number }>) {
    Object.assign(this.#impulses, next);
  }

  /**
   * Light jostle from pointer movement. Same springs, far smaller impulses.
   *
   * Horizontal travel is signed and rocks the blob the way the pointer went;
   * total travel is unsigned and squashes it. Taking both axes matters — with
   * only deltaX, moving straight up or down across the jelly did nothing at all.
   *
   * `strength` scales the whole thing down with distance so the blob barely
   * stirs at the edge of its hover radius. `sensitivity` is the travel in pixels
   * that produces a full-scale impulse, so lower is twitchier.
   */
  nudge(
    deltaX: number,
    deltaY: number,
    opts: { strength: number; sensitivity: number; rockGain: number; squashGain: number },
  ) {
    const { strength, sensitivity, rockGain, squashGain } = opts;
    if (strength <= 0 || sensitivity <= 0) return;

    const rock = Math.max(-1, Math.min(1, deltaX / sensitivity)) * strength;
    const speed = Math.min(Math.hypot(deltaX, deltaY) / sensitivity, 1) * strength;

    this.#wiggleXSpring.velocity += rock * rockGain;
    this.#squashZSpring.velocity += speed * squashGain;
    this.#squashXSpring.velocity -= speed * squashGain * 0.5;
  }

  /** Live spring retuning, for the tune page. Values are merged, not replaced. */
  setSpringProperties(next: {
    squashX?: Partial<SpringProperties>;
    squashZ?: Partial<SpringProperties>;
    wiggleX?: Partial<SpringProperties>;
  }) {
    if (next.squashX) Object.assign(this.#squashXSpring.properties, next.squashX);
    if (next.squashZ) Object.assign(this.#squashZSpring.properties, next.squashZ);
    if (next.wiggleX) Object.assign(this.#wiggleXSpring.properties, next.wiggleX);
  }

  update(dt: number) {
    if (dt <= 0) return;

    // These springs are stiff (omega ~= 25 rad/s) and integrated with explicit
    // Euler, which diverges once dt passes 2/omega ~= 80ms. Triggering the render
    // stalls the main thread long enough to hit that, so integrate in fixed
    // substeps and let the frame length only decide how many we take.
    const maxStep = 1 / 240;
    const steps = Math.min(Math.ceil(dt / maxStep), 64);
    const step = dt / steps;

    for (let i = 0; i < steps; i++) {
      this.#step(step);
    }

    this.#updateGPUBuffer();
  }

  #step(dt: number) {
    // Anticipation: hold the blob compressed while the pointer is down
    if (this.pressed) {
      this.#squashXSpring.velocity = -2;
      this.#squashZSpring.velocity = 1;
      this.#wiggleXSpring.velocity = -1;
    }

    this.#squashXSpring.update(dt);
    this.#squashZSpring.update(dt);
    this.#wiggleXSpring.update(dt);
  }

  #updateGPUBuffer() {
    // The shader scales the blob by (1 - squash), so a squash value reaching 1
    // would collapse an axis and degenerate the SDF. Normal oscillation peaks
    // around 0.3, so this only ever catches a blow-up.
    const squashX = clamp(this.#squashXSpring.value, -0.6, 0.6);
    const squashZ = clamp(this.#squashZSpring.value, -0.6, 0.6);
    const wiggleX = clamp(this.#wiggleXSpring.value, -1.5, 1.5);

    this.stateUniform.write({
      squashX,
      squashZ,
      wiggleX,
      glow: clamp(Math.abs(squashX) * 2.2 + Math.abs(wiggleX) * 0.8, 0, 1),
    });
  }
}
