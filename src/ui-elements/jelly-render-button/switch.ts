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
import { Spring } from './spring.ts';

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

  /** Kick all three springs at once — the whole click response. */
  jiggle(strength = 1) {
    this.#squashXSpring.velocity += JIGGLE_SQUASH_X * strength;
    this.#squashZSpring.velocity += JIGGLE_SQUASH_Z * strength;
    this.#wiggleXSpring.velocity += JIGGLE_WIGGLE_X * strength;
  }

  /**
   * Light jostle from pointer movement. Same springs, far smaller impulses, with
   * the rock following the direction the pointer travelled. `strength` scales it
   * down with distance so the blob barely stirs at the edge of its hover radius.
   */
  nudge(deltaX: number, strength = 1) {
    const amount = Math.max(-1, Math.min(1, deltaX / 45)) * strength;
    this.#wiggleXSpring.velocity += amount * 1.8;
    this.#squashZSpring.velocity += Math.abs(amount) * 0.9;
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
