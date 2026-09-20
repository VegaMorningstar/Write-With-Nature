/**
 * The butterfly field, with no framework attached.
 *
 * Everything here is plain DOM and a requestAnimationFrame loop. React was
 * never involved in the animation even when this lived inside a component: it
 * mounted once and then stayed out of the way. Pulling it out makes that
 * explicit and makes the field droppable into anything that has an element.
 *
 * Sizing comes from the container rather than the window, and pointer events
 * are bound to the container rather than the window, so the field can be a
 * full-screen overlay or a panel in the middle of a page without changing.
 */

import {
  makeBody,
  makeGlow,
  makeShadow,
  makeSilhouette,
  makeVignette,
  makeWing,
  SHADOW_ALPHA,
  SHADOW_BLUR_LEVELS,
  SHADOW_DX,
  SHADOW_DY,
  SS,
  type Sprite,
} from './butterfly';

import { DEFAULT_TUNING, type ButterflyOptions, type ButterflyTuning } from './options';

/** One butterfly. */
interface B {
  x: number;
  y: number;
  tilt: number;
  sz: number;
  ph: number;
  hover: number;
  spread: number;
  rise: number;
  sway: number;
  layer: number;
  throw_: number;
  band: number;
  mode: 0 | 1 | 2;
  hold: number;
  shut: number;
  fStart: number;
  /** Where this one's own shadow currently sits — trails behind (x, y). */
  shx: number;
  shy: number;
}

export interface ButterflyField {
  /** Start the release. Coordinates are relative to the container. */
  release(x?: number, y?: number): void;
  /** Hurry a release already in progress. */
  skip(): void;
  /** Stop the loop without tearing anything down. */
  pause(): void;
  resume(): void;
  /** Remove the canvas, listeners and observers. */
  destroy(): void;
  /** The canvas being drawn to, if you need to style it. */
  readonly canvas: HTMLCanvasElement;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function mountButterflies(
  container: HTMLElement,
  options: ButterflyOptions = {},
): ButterflyField {
  const T: ButterflyTuning = { ...DEFAULT_TUNING, ...options.tuning };
  const LAYERS = T.layers;
  const onReveal = options.onReveal;
  const respectReduced = options.respectReducedMotion ?? true;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:none';
  container.appendChild(canvas);

  // A field of continuously moving objects is precisely what this preference
  // exists to suppress. Hand over at once and draw nothing.
  if (respectReduced && prefersReducedMotion()) {
    let handed = false;
    const hand = () => {
      if (handed) return;
      handed = true;
      onReveal?.();
    };
    const id = window.setTimeout(hand, 0);
    return {
      release: hand,
      skip: hand,
      pause() {},
      resume() {},
      destroy() {
        window.clearTimeout(id);
        canvas.remove();
      },
      canvas,
    };
  }

  // ── the invitation, held back so the field is discovered first ──
  let invite: HTMLElement | null = null;
  if (options.invite) {
    invite = document.createElement('div');
    invite.textContent = options.invite;
    invite.style.cssText = [
      'position:absolute',
      'left:0',
      'right:0',
      'bottom:calc(2rem + env(safe-area-inset-bottom))',
      'text-align:center',
      'pointer-events:none',
      'user-select:none',
      'font-size:0.58rem',
      'font-weight:300',
      'letter-spacing:0.3em',
      'text-indent:0.3em',
      'text-transform:uppercase',
      'color:rgba(206,220,232,0.55)',
      'text-shadow:0 1px 10px rgba(6,8,11,0.9), 0 0 26px rgba(6,8,11,0.8)',
      'opacity:0',
      'transition:opacity 1.2s ease',
    ].join(';');
    container.appendChild(invite);
  }
  const inviteTimer = window.setTimeout(
    () => invite && (invite.style.opacity = '1'),
    (options.inviteDelay ?? 1.6) * 1000,
  );

  // ── sprites, baked once ──
  const wings: Sprite[] = LAYERS.map(makeWing);
  const bodies: Sprite[] = LAYERS.map(makeBody);
  // One flat silhouette, pre-blurred at a handful of radii. Every butterfly
  // picks the bucket nearest how far its shadow has separated from it, so
  // blur grows with distance without a per-frame filter cost.
  const shadowSprites: Sprite[] = SHADOW_BLUR_LEVELS.map(b => makeShadow(makeSilhouette(), b));
  let vignette: HTMLCanvasElement | null = null;
  let glow: HTMLCanvasElement | null = null;

  const ctx = canvas.getContext('2d')!;
  let bfs: B[] = [];
  let W = 0;
  let H = 0;

  // idle: the field is up. fly: the release is running. done: handed over, and
  // the field stops claiming input so the page underneath can have it back.
  let stage: 'idle' | 'fly' | 'done' = 'idle';
  const mouse = { x: -9999, y: -9999, seen: false };

  // The release is scheduled against `clock`, a virtual second count that
  // normally advances with real time. Skipping speeds it up, which compresses
  // the launch schedule, the flights and the wing beats together.
  let clock = 0;
  let rate = 1;
  let rateTarget = 1;
  let revealAt = Infinity;
  let lastLaunchAt = Infinity;
  let running = true;
  let raf = 0;

  const buildGrid = () => {
    const make = (x: number, y: number, layer: number): B => ({
      x,
      y,
      layer,
      tilt: (Math.random() - 0.5) * T.TILT,
      sz: T.BASE_SZ * LAYERS[layer].sz * (0.9 + Math.random() * 0.2),
      throw_: 0.6 + Math.random() * 0.8,
      band: 0,
      ph: Math.random() * Math.PI * 2,
      hover: 0,
      spread: 0,
      rise: 1 + (Math.random() - 0.5) * T.RISE_VARY,
      sway: Math.random() * Math.PI * 2,
      mode: 0,
      hold: 0,
      shut: 0,
      fStart: 0,
      shx: x,
      shy: y,
    });

    // One jittered grid per layer. The grid guarantees coverage, the jitter
    // removes the evidence of it, and a per-row phase avoids the triangular
    // lattice a fixed half-step stagger would build. Built bottom row up and
    // right to left, so each butterfly is drawn after the neighbours its
    // shadow falls on.
    const out: B[] = [];
    for (let L = 0; L < LAYERS.length; L++) {
      const gs = LAYERS[L].gs;
      const cols = Math.max(3, Math.round(W / gs));
      const rows = Math.max(3, Math.round(H / (gs * T.ROW_RATIO)));
      const stepX = W / cols;
      const stepY = H / rows;
      for (let r = rows; r >= -1; r--) {
        const phase = (Math.random() - 0.5) * stepX;
        for (let c = cols; c >= -1; c--) {
          const jx = (Math.random() - 0.5) * stepX * T.JITTER;
          const jy = (Math.random() - 0.5) * stepY * T.JITTER;
          out.push(make((c + 0.5) * stepX + phase + jx, (r + 0.5) * stepY + jy, L));
        }
      }
    }
    bfs = out;
  };

  // A coarse pointer is the real signal for a weaker GPU. Unlike a viewport
  // width breakpoint it does not false-positive on a desktop window dragged
  // narrow, and it still catches a wide touch device.
  const coarseQuery = window.matchMedia?.('(pointer: coarse)') ?? null;
  let coarse = coarseQuery?.matches ?? false;
  const onPointerCapability = (e: MediaQueryListEvent) => {
    coarse = e.matches;
  };
  coarseQuery?.addEventListener('change', onPointerCapability);
  const dpr = () => Math.min(window.devicePixelRatio || 1, coarse ? T.DPR_COARSE : T.DPR_FINE);

  // A height-only wobble is usually a mobile browser's address bar, not a
  // layout change. Rebuilding thousands of butterflies for that is a visible
  // hitch, so only a width change or a large height change forces a rebuild.
  let prevW = 0;
  let prevH = 0;
  const resize = () => {
    const r = container.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    const widthChanged = Math.abs(W - prevW) > 1;
    const majorHeightChange = Math.abs(H - prevH) > 150;
    const needsRebuild = prevW === 0 || widthChanged || majorHeightChange;
    prevW = W;
    prevH = H;

    const d = dpr();
    canvas.width = Math.round(W * d);
    canvas.height = Math.round(H * d);
    vignette = makeVignette(canvas.width, canvas.height);
    if (!glow) glow = makeGlow(Math.round(T.HOVER_R * d));
    if (needsRebuild) buildGrid();
  };
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ── input ──
  const local = (clientX: number, clientY: number) => {
    const r = container.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const release = (ox = W / 2, oy = H / 2) => {
    if (stage !== 'idle') return;
    stage = 'fly';
    if (invite) invite.style.opacity = '0';
    options.onRelease?.(ox, oy);

    const t0 = clock;
    const back = LAYERS.length - 1;

    let maxRing = 0;
    for (const b of bfs) {
      b.band = Math.floor(Math.hypot(b.x - ox, b.y - oy) / T.BAND_PX);
      if (b.band > maxRing) maxRing = b.band;
      // Lean away from the click, clamped so an off-centre press cannot throw
      // the far side sideways at double speed, then scattered per butterfly.
      const away = Math.max(-1, Math.min(1, (b.x - ox) / (W * 0.5)));
      b.spread = away * T.SPREAD_BIAS + (Math.random() - 0.5) * T.SPREAD_RANDOM;
    }

    // Cumulative ring clock: slow to start, easing up to full cadence, so the
    // opening of the wave is legible. A lookup rather than a per-butterfly sum.
    const ring = [0];
    for (let k = 1; k <= maxRing; k++) {
      const e = Math.min(1, (k - 1) / T.SLOW_RINGS);
      ring[k] = ring[k - 1] + T.SLOW_STEP + (T.DIST_STEP - T.SLOW_STEP) * e;
    }

    const rollStart = back * T.POKE_STEP + T.PHASE_GAP;
    const edge = ring[Math.min(T.CONTACT_BANDS, maxRing)];

    let maxDelay = 0;
    for (const b of bfs) {
      const depth = back - b.layer;
      // Contact is not negotiable, so only the alarm-driven rings hesitate.
      const reluctance = Math.min(1, b.band / T.LAG_RAMP);
      const lag =
        Math.random() < T.LAG_CHANCE * reluctance
          ? Math.random() ** 2 * T.LAG_MAX * reluctance
          : 0;

      const delay =
        b.band < T.CONTACT_BANDS
          ? ring[b.band] + depth * T.POKE_STEP
          : rollStart + (ring[b.band] - edge + depth * T.ROLL_LAYER_STEP + lag) * T.WAVE_SCALE;
      b.fStart = t0 + delay + Math.random() * T.BAND_JITTER;
      if (delay > maxDelay) maxDelay = delay;
    }
    maxDelay += T.BAND_JITTER;

    // On the virtual clock rather than a timeout, so speeding the clock up
    // brings the handover forward with everything else.
    lastLaunchAt = t0 + maxDelay;
    revealAt = lastLaunchAt + T.FD * 0.66;
  };

  const skip = () => {
    if (stage !== 'fly' || rateTarget > 1) return;
    const remaining = Math.max(0, lastLaunchAt - clock);
    rateTarget = Math.min(T.SKIP_MAX_RATE, Math.max(1, remaining / T.SKIP_IN));
    // Stop waiting for the flight tail. Anything still airborne finishes over
    // the top of the page during the crossfade.
    revealAt = lastLaunchAt;
  };

  const advance = (x: number, y: number) => {
    if (stage === 'idle') release(x, y);
    else skip();
  };

  const onMove = (e: MouseEvent) => {
    const p = local(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.seen = true;
  };
  const onLeave = () => {
    mouse.x = -9999;
    mouse.y = -9999;
    mouse.seen = false;
  };
  const onClick = (e: MouseEvent) => {
    const p = local(e.clientX, e.clientY);
    advance(p.x, p.y);
  };

  const onKey = (e: KeyboardEvent) => {
    if (stage === 'done') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      advance(mouse.seen ? mouse.x : W / 2, mouse.seen ? mouse.y : H / 2);
    }
  };

  // Touch parity: a finger sliding on the field is the same signal a cursor
  // gives, and lifting it is the click. They keep running through the release
  // so a second tap can skip, then stop at 'done'. That last guard matters:
  // preventDefault on touchend suppresses the click the browser would
  // synthesise, so a handler left live swallows taps on whatever is revealed.
  const touchXY = (e: TouchEvent) => e.touches[0] ?? e.changedTouches[0] ?? null;
  const onTouchStart = (e: TouchEvent) => {
    if (stage === 'done') return;
    const t = touchXY(e);
    if (t && stage === 'idle') {
      const p = local(t.clientX, t.clientY);
      mouse.x = p.x;
      mouse.y = p.y;
      mouse.seen = true;
    }
    if (e.cancelable) e.preventDefault();
  };
  const onTouchMove = (e: TouchEvent) => {
    if (stage !== 'idle') return;
    const t = touchXY(e);
    if (t) {
      const p = local(t.clientX, t.clientY);
      mouse.x = p.x;
      mouse.y = p.y;
      mouse.seen = true;
    }
    if (e.cancelable) e.preventDefault();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (stage === 'done') return;
    const t = touchXY(e);
    if (t) {
      const p = local(t.clientX, t.clientY);
      advance(p.x, p.y);
    }
    onLeave();
    if (e.cancelable) e.preventDefault();
  };

  container.addEventListener('mousemove', onMove);
  container.addEventListener('mouseleave', onLeave);
  container.addEventListener('click', onClick);
  container.addEventListener('touchstart', onTouchStart, { passive: false });
  container.addEventListener('touchmove', onTouchMove, { passive: false });
  container.addEventListener('touchend', onTouchEnd, { passive: false });
  container.addEventListener('touchcancel', onLeave);
  window.addEventListener('keydown', onKey);

  // ── the loop ──
  let last = performance.now() / 1000;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (!running) {
      last = performance.now() / 1000;
      return;
    }
    if (!vignette || !glow) return;

    const real = performance.now() / 1000;
    const elapsed = real - last;
    last = real;

    // Ease into the skip rate rather than switching to it. Exponential in
    // elapsed time, so the wind-up lasts the same fraction of a second at any
    // frame rate; a per-frame fraction would take longer on a slow device,
    // which is most of the time the skip was meant to save.
    rate += (rateTarget - rate) * (1 - Math.exp(-elapsed / T.SKIP_TAU));

    // Two clamps for two jobs. `dt` drives per-butterfly integration and goes
    // unstable with large steps. `clock` carries the release schedule and has
    // to keep wall-clock pace, or a device that cannot hold 20fps would also
    // wait proportionally longer for the field to clear.
    const dt = Math.min(elapsed, 0.05) * rate;
    clock += Math.min(elapsed, 0.25) * rate;
    const now = clock;

    if (stage === 'fly' && clock >= revealAt) {
      stage = 'done';
      revealAt = Infinity;
      onReveal?.();
    }

    const d = dpr();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    // No backdrop to paint: there is no ground layer any more, only the
    // butterflies and the shadows they each carry. Cleared, not filled.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // How far a shadow closes on its butterfly this frame. Exponential in
    // elapsed time, for the same reason the skip rate above is: a per-frame
    // fraction would lag twice as far on a 30fps device as on a 60fps one,
    // and here the lag is not a detail — the gap it opens is what drives the
    // fade and the blur, so the whole reveal would look different per device.
    const follow = 1 - Math.exp(-dt / T.SHADOW_LAG);

    // Not `=== 'fly'`: the stage flips to 'done' at handover but the field is
    // usually still visible through a crossfade. Anything in the air keeps
    // flying.
    const flying = stage !== 'idle';
    const cull = 120;
    const mx = mouse.x;
    const my = mouse.y;

    for (const b of bfs) {
      let px = b.x;
      let py = b.y;
      let rot = b.tilt;
      let alpha = 1;
      let amp: number;

      if (flying) {
        const el = now - b.fStart;
        if (el < 0) {
          // Both wind-up stages are measured backwards from this butterfly's
          // own launch, so agitation spreads in the same order as departure.
          const target =
            el > -T.ALARM_LEAD ? T.ALARM_AMP : el > -T.STARTLE_LEAD ? T.STARTLE_AMP : 0;
          b.hover += (target - b.hover) * T.RISE;
          amp = T.IDLE_AMP + b.hover * (T.MAX_AMP - T.IDLE_AMP);
          b.ph += dt * (T.IDLE_SPEED + b.hover * (T.FAST_SPEED - T.IDLE_SPEED));
        } else {
          const t = Math.min(el / T.FD, 1);
          // Gone for good. Its shadow already faded out well before this —
          // the gap it leaves behind, below, grows the whole time it's
          // airborne — so there's nothing left here worth drawing.
          if (t >= 1) continue;
          const ease = t * t * t;
          py = b.y - T.FLY_UP * b.rise * ease - 46 * t;
          px = b.x + b.spread * T.FLY_OUT * ease + Math.sin(now * 2.4 + b.sway) * 16 * t;
          rot = b.tilt + b.spread * 0.42 * ease + Math.sin(now * 2.4 + b.sway) * 0.06;
          alpha = 1 - Math.max(0, (t - 0.3) / 0.7) ** 1.4;
          b.ph += dt * T.FAST_SPEED * 1.15;
          amp = T.MAX_AMP;
        }
      } else {
        const dx = b.x - mx;
        const dy = b.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = dist < T.HOVER_R ? 1 - dist / T.HOVER_R : 0;
        // Squared, so the effect concentrates near the middle and the rim has
        // no visible edge travelling through the field.
        const target = t * t;
        b.hover += (target - b.hover) * (target > b.hover ? T.RISE : T.FALL);
        amp = T.IDLE_AMP + b.hover * (T.MAX_AMP - T.IDLE_AMP);

        if (b.mode === 0 && b.hover > T.WAKE) {
          b.mode = 1;
          b.hold = T.HOLD;
        } else if (b.mode !== 0 && b.hover < T.SLEEP) {
          b.mode = 0;
          b.shut = 0;
        }

        if (b.mode === 1) {
          b.shut += (1 - b.shut) * T.SHUT;
          // Parked at PI, where (1 - cos) / 2 is exactly 1, so the phase
          // carries straight on into the downstroke when the hold ends.
          b.ph = Math.PI;
          if (b.shut > 0.96) {
            b.hold -= dt;
            if (b.hold <= 0) b.mode = 2;
          }
          amp *= b.shut;
        } else {
          b.ph += dt * (T.IDLE_SPEED + b.hover * (T.FAST_SPEED - T.IDLE_SPEED));
        }
      }

      // fold: 0 = wings flat open, 1 = closed over the back. Squeezing a
      // sprite that is symmetric about the body axis is identical to folding
      // two halves inward, at one drawImage instead of two. Shared by the
      // shadow below and the wing further down — same flap, same transform,
      // only the position differs.
      const fold = amp * (1 - Math.cos(b.ph)) * 0.5;
      const sx = (1 - fold * 0.93) * b.sz;
      const sy = (1 + fold * 0.12) * b.sz;
      const lift = -fold * SS * 0.05 * b.sz;

      // The transform is composed by hand and pushed in one setTransform. The
      // equivalent save/translate/rotate/scale/restore chain is four
      // state-stack operations per sprite, which is measurable at this count.
      const co = Math.cos(rot);
      const si = Math.sin(rot);
      const wa = co * sx * d;
      const wb = si * sx * d;
      const wc = -si * sy * d;
      const wd = co * sy * d;
      const lx = -si * lift;
      const ly = co * lift;

      // The shadow, drawn immediately before its own wing so it lands on the
      // neighbours already on the canvas — the ones below and to its right,
      // because the grid is built bottom row up and right to left and the
      // light comes from the upper left. That landing is what makes the field
      // read as a pile of butterflies sitting on each other rather than a
      // pattern of separate ones.
      //
      // At rest the lag has long since closed, so it sits exactly where a
      // fixed drop shadow would: tight, dark, touching. Once its butterfly
      // launches, the target runs out ahead of the shadow and the gap that
      // opens is what fades it and widens its blur, so it trails its own
      // butterfly up and off rather than snapping along with it.
      const targetX = px + SHADOW_DX * b.throw_;
      const targetY = py + SHADOW_DY * b.throw_;
      b.shx += (targetX - b.shx) * follow;
      b.shy += (targetY - b.shy) * follow;

      const cast = LAYERS[b.layer].shadow;
      if (cast > 0) {
        // near: 1 while the shadow is still touching its butterfly, 0 once it
        // has fallen SHADOW_FADE_DIST behind. It fades the shadow out and
        // picks how wide its blur has spread, together.
        const gap = Math.hypot(targetX - b.shx, targetY - b.shy);
        const near = Math.max(0, 1 - gap / T.SHADOW_FADE_DIST);
        const shAlpha = alpha * SHADOW_ALPHA * cast * near;
        if (
          shAlpha > 0.004 &&
          b.shx > -cull && b.shx < W + cull && b.shy > -cull && b.shy < H + cull
        ) {
          const levels = shadowSprites.length;
          const shadow = shadowSprites[Math.min(levels - 1, Math.floor((1 - near) * levels))];
          ctx.globalAlpha = shAlpha;
          ctx.setTransform(wa, wb, wc, wd, (b.shx + lx) * d, (b.shy + ly) * d);
          ctx.drawImage(shadow.c, shadow.ox, shadow.oy);
        }
      }

      // Culled after the shadow, not before: a butterfly can be off the edge
      // or faded past seeing while the shadow it left behind is still on
      // screen and still worth drawing.
      if (alpha < 0.012) continue;
      if (px < -cull || px > W + cull || py < -cull || py > H + cull) continue;

      ctx.globalAlpha = alpha * (1 - fold * 0.16);
      const wing = wings[b.layer];
      ctx.setTransform(wa, wb, wc, wd, (px + lx) * d, (py + ly) * d);
      ctx.drawImage(wing.c, wing.ox, wing.oy);

      // The body rides on top, unfolded, so the fold reads as a hinge.
      const body = bodies[b.layer];
      const bs = b.sz * d;
      ctx.setTransform(co * bs, si * bs, -si * bs, co * bs, px * d, py * d);
      ctx.drawImage(body.c, body.ox, body.oy);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    if (!flying && mouse.seen) {
      ctx.drawImage(glow, Math.round((mx - T.HOVER_R) * d), Math.round((my - T.HOVER_R) * d));
    }
    ctx.drawImage(vignette, 0, 0);
  };
  raf = requestAnimationFrame(loop);

  return {
    release,
    skip,
    pause() {
      running = false;
    },
    resume() {
      running = true;
    },
    destroy() {
      cancelAnimationFrame(raf);
      window.clearTimeout(inviteTimer);
      ro.disconnect();
      coarseQuery?.removeEventListener('change', onPointerCapability);
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseleave', onLeave);
      container.removeEventListener('click', onClick);
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onLeave);
      window.removeEventListener('keydown', onKey);
      canvas.remove();
      invite?.remove();
    },
    canvas,
  };
}
