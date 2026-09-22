/**
 * A few small creatures that follow the cursor around the page: blue
 * butterflies on the paper theme, fireflies on the night sky.
 *
 * Separate from the loading screen's butterfly field in every way that
 * matters: that one covers an element and scatters once, this one is a handful
 * of individuals that live for as long as the page does. The motion is shared
 * ancestry — the same springs, orbits, press-scatter and roam-when-idle that
 * the blue butterflies used — but nothing of the artwork is, because a firefly
 * is a light rather than a body. No sprites, no shadow: a core and a halo,
 * composited additively, blinking on their own clocks.
 *
 * The module and its canvas id still say "butterflies". Renaming them would
 * touch App, the loading screen's hand-off and the canvas every backdrop looks
 * for, for no behavioural gain.
 *
 * Plain DOM and requestAnimationFrame, like the field. The canvas never takes
 * pointer events; it only watches them.
 *
 * Which creature is a theme token, read per frame: fireflies at night,
 * butterflies on paper. The two are not interchangeable — an additive glow on
 * beige paper is nearly invisible, and a blue butterfly with a soft shadow on
 * a night sky is a cut-out. The physics is shared; only the drawing differs.
 */

import {
  makeBody,
  makeShadow,
  makeSilhouette,
  makeWing,
  SS,
  type Sprite,
} from '../butterflies/butterfly';
import { tokens } from '../theme.js';

export interface CursorButterflies {
  /** Remove the canvas and every listener. */
  destroy(): void;
}

export interface CursorButterflyOptions {
  /** How many. Five is the shipping number. */
  count?: number;
  /**
   * Sprite-to-screen scale. The wing art is 144 units across, so 0.15 is a
   * wingspan around 21px — deliberately a little under a cursor, which is
   * about 24 to 32.
   */
  size?: number;
  /** Skip entirely when the visitor has asked for reduced motion. */
  respectReducedMotion?: boolean;
}

const TUNING = {
  /** Where each one settles relative to the cursor, and how fast it circles. */
  ORBIT_MIN: 26,
  ORBIT_MAX: 62,
  ORBIT_SPEED_MIN: 0.45,
  ORBIT_SPEED_MAX: 1.15,

  /**
   * Spring toward that spot, and the drag on it. Under-damped on purpose:
   * they overshoot the cursor and swing back, which is what stops the
   * following from looking like a cursor with things bolted to it.
   */
  STIFF: 8,
  STIFF_VARY: 3.5,
  DAMP: 3.6,
  MAX_SPEED: 1400,

  /** Wingbeat: a floor, plus more the faster it is travelling. */
  FLAP_BASE: 11,
  FLAP_PER_SPEED: 0.03,
  /**
   * Kept well under the field's full fold. At this size a wing squeezed to a
   * tenth of its width is three pixels of nothing — they have to stay open
   * enough to read as butterflies rather than as specks.
   */
  FLAP_AMP: 0.62,

  /**
   * The kick away from a press, how long the spring stays loosened, and how
   * far the spot each one is heading for swings out while that lasts.
   *
   * Two things set how far they actually get, and they are the same order of
   * magnitude: the kick itself, which peaks around SCATTER_SPEED / DAMP, and
   * the widened reach holding them out there before the pull wins. Moving one
   * without the other only changes half the distance.
   */
  SCATTER_SPEED: 280,
  SCATTER_HOLD: 0.75,
  SCATTER_REACH: 0.8,

  /**
   * The shadow one throws on another it happens to be over. Offsets are per
   * unit of size, not pixels, so the shadow sits the same distance off its
   * butterfly at any scale — the same ratio the loading field uses.
   */
  SHADOW_ALPHA: 0.42,
  SHADOW_BLUR: 9,
  SHADOW_DX: 28,
  SHADOW_DY: 38,

  /**
   * With no cursor to chase they pick somewhere on screen and drift to it,
   * more slowly than they chase, then pick somewhere else.
   */
  ROAM_STIFF: 0.3,
  ROAM_ARRIVED: 70,
  ROAM_FOR_MIN: 1.8,
  ROAM_FOR_MAX: 4.5,
  ROAM_MARGIN: 90,

  /** Device pixel ratio ceiling. Five sprites, so this can be generous. */
  DPR_CAP: 2,
  SIZE_VARY: 0.22,
};

/** Wings a washed cornflower, body a deeper ink of the same. */
const WING_BLUE = 'rgba(64, 116, 206, 0.84)';
const BODY_BLUE = 'rgba(26, 48, 98, 0.62)';

/**
 * Firefly light.
 *
 * Warm amber rather than the yellow-green a real Photinus puts out: green is
 * off the page's palette by choice, and the same decision that keeps it out of
 * the fluid cursor keeps it out of these.
 */
const CORE_RGB = '255, 255, 255';
const HALO_RGB = '255, 236, 170';
const GLOW_RGB = '255, 186, 74';

/**
 * `sz` is a sprite scale, not a length: it multiplied a 150px source canvas,
 * so the blue butterflies rendered about 22px across at the default 0.15.
 * Radii below are fractions of that same nominal size, so a firefly matches
 * the footprint of the butterfly it replaced. Treating sz as pixels put the
 * whole glow inside 2px, which is a lit pixel rather than an insect.
 */
const UNIT = 150;
/** The white centre. Small and hard-edged — it is the thing being looked at. */
const CORE_RADIUS = 0.105;  // ~2.3px at the default size
/** The warm inner body the core sits in. */
const HALO_RADIUS = 0.30;   // ~6.7px
/** The outer bloom. */
const GLOW_RADIUS = 1.15;   // ~25px

/**
 * The blink. Floor keeps a firefly faintly visible between pulses — one that
 * goes fully dark reads as a rendering fault rather than as an insect — and
 * the exponent sharpens a sine into something closer to a flash, dim for most
 * of its cycle and bright briefly.
 */
const BLINK_FLOOR = 0.22;
const BLINK_SHARP = 3;
const BLINK_RATE_MIN = 1.1;
const BLINK_RATE_MAX = 2.6;

interface Bf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sz: number;
  /** Blink phase, in radians. */
  ph: number;
  /** Radians per second of blink, so no two pulse together. */
  blinkRate: number;
  stiff: number;
  orbit: number;
  orbitR: number;
  orbitSpeed: number;
  /** Seconds left of the loosened spring after a press. */
  scatter: number;
  /** Somewhere to be while there is no cursor to follow, and how long for. */
  wx: number;
  wy: number;
  wanderFor: number;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Repaint a baked sprite in one colour, keeping its shading. source-atop
 * clips the fill to what the sprite already covers, so the wash lands inside
 * the wing outline and nowhere else.
 */
function recolour(src: Sprite, fill: string): Sprite {
  const c = document.createElement('canvas');
  c.width = src.c.width;
  c.height = src.c.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src.c, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, c.width, c.height);
  return { c, ox: src.ox, oy: src.oy };
}

/**
 * The butterfly artwork, baked on first use.
 *
 * Lazy because the dark theme never asks for it: building three sprite
 * canvases costs real work at start-up, and a page that opens at night should
 * not pay it for butterflies it will not draw. Cached after the first call, so
 * switching back to light is instant the second time.
 */
let sprites: { wing: Sprite; body: Sprite; shadow: Sprite } | null = null;
function butterflySprites() {
  if (sprites) return sprites;
  // `light` rakes a highlight across them so they do not read as flat cutouts.
  const cfg = { gs: 0, sz: 1, dark: 0, light: 0.14, shadow: 0 };
  sprites = {
    wing: recolour(makeWing(cfg), WING_BLUE),
    body: recolour(makeBody(cfg), BODY_BLUE),
    shadow: makeShadow(makeSilhouette(), TUNING.SHADOW_BLUR),
  };
  return sprites;
}

function spawnAtEdge(W: number, H: number) {
  const m = 60;
  switch (Math.floor(Math.random() * 4)) {
    case 0: return { x: Math.random() * W, y: -m };
    case 1: return { x: W + m, y: Math.random() * H };
    case 2: return { x: Math.random() * W, y: H + m };
    default: return { x: -m, y: Math.random() * H };
  }
}

export function mountCursorButterflies(
  options: CursorButterflyOptions = {},
): CursorButterflies {
  const count = options.count ?? 5;
  const size = options.size ?? 0.15;
  const respectReduced = options.respectReducedMotion ?? true;

  if (respectReduced && prefersReducedMotion()) {
    return { destroy() {} };
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'cursor-butterflies-canvas';
  canvas.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100%',
    'height:100%',
    // Never take a click. Everything under this canvas stays reachable, which
    // is what lets it sit over all of it without being in the way.
    'pointer-events:none',
    // Above everything: the page and its glass panels (20), the toast (100),
    // and the scene sheet (10000), which is the highest thing the app puts up.
    // They are never drawn over the loading field, because they are not
    // mounted until it has handed over.
    'z-index:100000',
  ].join(';');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  // Nothing is baked here any more. The butterfly sprites are built on first
  // use by butterflySprites(), so the night theme — which draws lights rather
  // than bodies, and needs no artwork — never pays for them.

  let W = 0;
  let H = 0;
  let d = 1;

  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    d = Math.min(window.devicePixelRatio || 1, TUNING.DPR_CAP);
    canvas.width = Math.round(W * d);
    canvas.height = Math.round(H * d);
  };
  resize();

  // `present` is false until the pointer has actually been somewhere, and
  // again once it leaves the window. Without it they would converge on a
  // guessed point and sit there, which is worse than having them roam.
  const cursor = { x: W / 2, y: H / 2, present: false };

  const pickWander = (b: Bf) => {
    const m = TUNING.ROAM_MARGIN;
    b.wx = m + Math.random() * Math.max(1, W - m * 2);
    b.wy = m + Math.random() * Math.max(1, H - m * 2);
    b.wanderFor =
      TUNING.ROAM_FOR_MIN + Math.random() * (TUNING.ROAM_FOR_MAX - TUNING.ROAM_FOR_MIN);
  };

  const bfs: Bf[] = Array.from({ length: count }, () => {
    const at = spawnAtEdge(W, H);
    return {
      x: at.x,
      y: at.y,
      vx: 0,
      vy: 0,
      sz: size * (1 - TUNING.SIZE_VARY / 2 + Math.random() * TUNING.SIZE_VARY),
      ph: Math.random() * Math.PI * 2,
      blinkRate: BLINK_RATE_MIN + Math.random() * (BLINK_RATE_MAX - BLINK_RATE_MIN),
      stiff: TUNING.STIFF + (Math.random() - 0.5) * TUNING.STIFF_VARY,
      orbit: Math.random() * Math.PI * 2,
      orbitR: TUNING.ORBIT_MIN + Math.random() * (TUNING.ORBIT_MAX - TUNING.ORBIT_MIN),
      orbitSpeed:
        (TUNING.ORBIT_SPEED_MIN +
          Math.random() * (TUNING.ORBIT_SPEED_MAX - TUNING.ORBIT_SPEED_MIN)) *
        (Math.random() < 0.5 ? -1 : 1),
      scatter: 0,
      wx: 0,
      wy: 0,
      wanderFor: 0,
    };
  });
  for (const b of bfs) pickWander(b);

  const onMove = (e: MouseEvent) => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    cursor.present = true;
  };
  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    cursor.x = t.clientX;
    cursor.y = t.clientY;
    cursor.present = true;
  };

  // Cursor gone: off the window entirely, or the tab lost focus with it
  // sitting somewhere we can no longer hear about. Either way, stop chasing a
  // position that is no longer being updated, and give each one somewhere of
  // its own to be until it comes back.
  const onLeave = () => {
    if (!cursor.present) return;
    cursor.present = false;
    for (const b of bfs) pickWander(b);
  };

  // A press shoves them off the cursor. The spring is loosened for a moment
  // afterwards so the shove reads before the pull hauls them back in.
  const onPress = (e: MouseEvent) => {
    cursor.x = e.clientX;
    cursor.y = e.clientY;
    cursor.present = true;
    for (const b of bfs) {
      const dx = b.x - cursor.x;
      const dy = b.y - cursor.y;
      const dist = Math.hypot(dx, dy) || 1;
      const kick = TUNING.SCATTER_SPEED * (0.7 + Math.random() * 0.6);
      b.vx += (dx / dist) * kick;
      b.vy += (dy / dist) * kick;
      b.scatter = TUNING.SCATTER_HOLD;
      // Sent the other way round the cursor too, so the swarm breaks up
      // instead of expanding as one ring.
      b.orbitSpeed *= Math.random() < 0.5 ? -1 : 1;
    }
  };

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onTouch, { passive: true });
  window.addEventListener('mousedown', onPress, { passive: true });
  window.addEventListener('resize', resize);
  // On documentElement, not window: this is the one that fires when the
  // pointer actually crosses out of the page rather than between elements.
  document.documentElement.addEventListener('mouseleave', onLeave);
  window.addEventListener('blur', onLeave);

  let raf = 0;
  let last = performance.now() / 1000;

  const loop = () => {
    raf = requestAnimationFrame(loop);

    const now = performance.now() / 1000;
    const dt = Math.min(now - last, 0.05);
    last = now;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const b of bfs) {
      b.orbit += b.orbitSpeed * dt;
      if (b.scatter > 0) b.scatter = Math.max(0, b.scatter - dt);

      const ease = b.scatter > 0 ? 1 - b.scatter / TUNING.SCATTER_HOLD : 1;

      let tx: number;
      let ty: number;
      let stiff: number;

      if (cursor.present) {
        // Each one aims at its own slowly circling spot beside the cursor,
        // not at the cursor itself — five things converging on one point
        // would pile up into a single blur.
        const reach = b.orbitR * (1 + (1 - ease) * TUNING.SCATTER_REACH);
        tx = cursor.x + Math.cos(b.orbit) * reach;
        ty = cursor.y + Math.sin(b.orbit) * reach;
        stiff = b.stiff;
      } else {
        // No cursor: make for somewhere of its own, and pick somewhere else
        // on arriving or on losing interest. A much softer pull, so this
        // reads as drifting about rather than commuting between points.
        b.wanderFor -= dt;
        if (b.wanderFor <= 0 || Math.hypot(b.wx - b.x, b.wy - b.y) < TUNING.ROAM_ARRIVED) {
          pickWander(b);
        }
        tx = b.wx;
        ty = b.wy;
        stiff = b.stiff * TUNING.ROAM_STIFF;
      }

      const ax = (tx - b.x) * stiff * ease - b.vx * TUNING.DAMP;
      const ay = (ty - b.y) * stiff * ease - b.vy * TUNING.DAMP;
      b.vx += ax * dt;
      b.vy += ay * dt;

      const speed = Math.hypot(b.vx, b.vy);
      if (speed > TUNING.MAX_SPEED) {
        b.vx = (b.vx / speed) * TUNING.MAX_SPEED;
        b.vy = (b.vy / speed) * TUNING.MAX_SPEED;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (tokens().cursorCreature === 'butterfly') {
        const { wing, body, shadow } = butterflySprites();
        b.ph += (TUNING.FLAP_BASE + speed * TUNING.FLAP_PER_SPEED) * dt;

        // Nose into the direction of travel. A sprite at zero rotation points
        // up, hence the quarter turn off atan2.
        const rot = Math.atan2(b.vy, b.vx) + Math.PI / 2;

        const fold = TUNING.FLAP_AMP * (1 - Math.cos(b.ph)) * 0.5;
        const sx = (1 - fold * 0.93) * b.sz;
        const sy = (1 + fold * 0.12) * b.sz;
        const lift = -fold * SS * 0.05 * b.sz;
        const co = Math.cos(rot);
        const si = Math.sin(rot);
        const lx = -si * lift;
        const ly = co * lift;

        // Its shadow — on the page as much as on the others. Plain source-over,
        // so it lands wherever it falls: over butterflies already drawn, and
        // over bare canvas, which is the page showing through. Drawn before its
        // own wing, so it never shades the butterfly casting it.
        ctx.globalAlpha = TUNING.SHADOW_ALPHA;
        ctx.setTransform(
          co * sx * d, si * sx * d, -si * sy * d, co * sy * d,
          (b.x + lx + TUNING.SHADOW_DX * b.sz) * d,
          (b.y + ly + TUNING.SHADOW_DY * b.sz) * d,
        );
        ctx.drawImage(shadow.c, shadow.ox, shadow.oy);

        ctx.globalAlpha = 1 - fold * 0.16;
        ctx.setTransform(co * sx * d, si * sx * d, -si * sy * d, co * sy * d, (b.x + lx) * d, (b.y + ly) * d);
        ctx.drawImage(wing.c, wing.ox, wing.oy);

        const bs = b.sz * d;
        ctx.setTransform(co * bs, si * bs, -si * bs, co * bs, b.x * d, b.y * d);
        ctx.drawImage(body.c, body.ox, body.oy);
        continue;
      }

      // The blink runs on its own clock rather than on airspeed. A wingbeat
      // scaled with how fast the butterfly was moving; a firefly's pulse has
      // nothing to do with how fast it is flying.
      b.ph += b.blinkRate * dt;

      const blink =
        BLINK_FLOOR +
        (1 - BLINK_FLOOR) * Math.pow(0.5 + 0.5 * Math.sin(b.ph), BLINK_SHARP);

      // No shadow: this is a light source, so there is nothing for it to cast.
      // Additive, so where two fireflies overlap the light sums instead of the
      // nearer one's halo painting a dull disc over the further one's.
      const scale = b.sz * UNIT * d;
      ctx.setTransform(1, 0, 0, 1, b.x * d, b.y * d);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';

      // Three coats, widest first: an outer bloom, a warm body, then a white
      // centre. The centre is what makes it read as a light rather than as a
      // smudge — a glow with no hard point in it has nothing to focus on.
      const glowR = GLOW_RADIUS * scale;
      const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
      bloom.addColorStop(0, `rgba(${GLOW_RGB},${(0.46 * blink).toFixed(3)})`);
      bloom.addColorStop(0.3, `rgba(${GLOW_RGB},${(0.15 * blink).toFixed(3)})`);
      bloom.addColorStop(1, `rgba(${GLOW_RGB},0)`);
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();

      const haloR = HALO_RADIUS * scale;
      const body = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
      body.addColorStop(0, `rgba(${HALO_RGB},${(0.85 * blink).toFixed(3)})`);
      body.addColorStop(1, `rgba(${HALO_RGB},0)`);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Held near full even at the dim end of the blink, so the point never
      // disappears into its own glow.
      ctx.fillStyle = `rgba(${CORE_RGB},${(0.55 + 0.45 * blink).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(0, 0, CORE_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();

      // Back to normal, or the next frame's clear and everything after it
      // composite additively too.
      ctx.globalCompositeOperation = 'source-over';
    }
  };
  raf = requestAnimationFrame(loop);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('mousedown', onPress);
      window.removeEventListener('resize', resize);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
      canvas.remove();
    },
  };
}
