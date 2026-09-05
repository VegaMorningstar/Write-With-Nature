export type SpringProperties = {
  mass: number;
  stiffness: number;
  damping: number;
};

/**
 * Same explicit-Euler spring the jelly widgets use, and with the same caveat:
 * it diverges once dt passes 2/omega. The grid integrates in fixed substeps for
 * that reason — see GlassAlphabet.jsx.
 */
export class Spring {
  value = 0;
  target = 0;
  velocity = 0;
  properties: SpringProperties;

  constructor(properties: SpringProperties) {
    this.properties = { ...properties };
  }

  step(dt: number) {
    const spring = -this.properties.stiffness * (this.value - this.target);
    const damp = -this.properties.damping * this.velocity;
    this.velocity += ((spring + damp) / this.properties.mass) * dt;
    this.value += this.velocity * dt;
  }
}
