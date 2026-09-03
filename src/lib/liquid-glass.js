/*!
 * liquid-glass.js — Apple-style liquid glass refraction + rdev enhancements.
 *
 * Refraction:    SVG feDisplacementMap per RGB channel (chromatic aberration).
 * Edge masking:  Aberration composited to rim only; centre stays crisp (rdev pattern).
 * Highlight:     Two blend-mode spans whose gradient angle tracks cursor (rdev pattern).
 * Elasticity:    Cursor-proximity squash/stretch + translate (rdev pattern).
 * Modes:         standard | polar | prominent — three distinct displacement maps.
 *
 * Chromium only for real refraction; Safari/Firefox get frosted-blur fallback.
 */

"use strict";

const SVG_NS = "http://www.w3.org/2000/svg";
let _uid     = 0;
let _svgDefs = null;

// ── Browser capability ────────────────────────────────────────────────────────
const supported = (() => {
  const ua = navigator.userAgent;
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return false;
  if (/Firefox/.test(ua)) return false;
  if (!CSS.supports("backdrop-filter", "url(#lg)")) return false;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    c.getContext("2d").getImageData(0, 0, 1, 1);
    return true;
  } catch (_) { return false; }
})();

// ── Shared mouse state ────────────────────────────────────────────────────────
let _mouseX    = 0;
let _mouseY    = 0;
let _mouseBound = false;
const _highlights  = new Set();
const _elasticEls  = new Set();

function _bindMouse() {
  if (_mouseBound) return;
  _mouseBound = true;
  window.addEventListener("mousemove", e => {
    _mouseX = e.clientX;
    _mouseY = e.clientY;
    _highlights.forEach(_refreshHighlight);
    if (_elasticEls.size) requestAnimationFrame(_refreshAllElastic);
  }, { passive: true });
}

// ── Border highlight (rdev pattern) ──────────────────────────────────────────
// Two spans share the 1.5 px rim via CSS mask trick.
// Gradient angle + opacity track cursor offset from element centre.
function _refreshHighlight(h) {
  const rect = h.el.getBoundingClientRect();
  if (!rect.width) return;

  const ox = ((_mouseX - (rect.left + rect.width  * 0.5)) / (rect.width  * 0.5)) * 100;
  const oy = ((_mouseY - (rect.top  + rect.height * 0.5)) / (rect.height * 0.5)) * 100;

  const angle = 135 + ox * 1.2;
  const p1    = Math.max(10, 33 + oy * 0.3);
  const p2    = Math.min(90, 66 + oy * 0.4);
  const a1    = (0.12 + Math.abs(ox) * 0.0008).toFixed(3);
  const a2    = (0.32 + Math.abs(ox) * 0.0008).toFixed(3);

  const g = (a) =>
    `linear-gradient(${angle.toFixed(1)}deg, rgba(255,255,255,${a}) ${p1.toFixed(1)}%, rgba(255,255,255,0) ${p2.toFixed(1)}%)`;
  h.s1.style.background = g(a1);
  h.s2.style.background = g(a2);
}

const _MASK = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";

function _createHighlight(el) {
  const base = {
    position: "absolute", inset: "0", borderRadius: "inherit",
    padding: "1.5px", pointerEvents: "none",
    WebkitMask: _MASK, WebkitMaskComposite: "xor", maskComposite: "exclude",
  };
  const s1 = Object.assign(document.createElement("span"), { "aria-hidden": "true" });
  Object.assign(s1.style, base, { mixBlendMode: "screen",  opacity: "0.65", zIndex: "1" });
  const s2 = Object.assign(document.createElement("span"), { "aria-hidden": "true" });
  Object.assign(s2.style, base, { mixBlendMode: "overlay", opacity: "0.50", zIndex: "2" });

  el.appendChild(s1);
  el.appendChild(s2);

  const entry = { el, s1, s2 };
  _highlights.add(entry);
  _bindMouse();
  _refreshHighlight(entry);

  return () => { _highlights.delete(entry); s1.remove(); s2.remove(); };
}

// ── Elasticity (rdev pattern) ─────────────────────────────────────────────────
// Cursor proximity drives squash/stretch scale + subtle translation.
// Activation zone: 200 px outside the element edge.
const ACTIVATION_ZONE = 200;

function _smoothStep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function _refreshElastic(e) {
  const rect = e.el.getBoundingClientRect();
  if (!rect.width) return;

  // Distance from cursor to nearest edge of element
  const dX = _mouseX < rect.left ? rect.left - _mouseX : _mouseX > rect.right  ? _mouseX - rect.right  : 0;
  const dY = _mouseY < rect.top  ? rect.top  - _mouseY : _mouseY > rect.bottom ? _mouseY - rect.bottom : 0;
  const dist = Math.sqrt(dX * dX + dY * dY);

  const factor = 1 - _smoothStep(0, ACTIVATION_ZONE, dist);

  if (factor < 0.001) {
    if (e._active) { e.el.style.transform = ""; e._active = false; }
    return;
  }
  e._active = true;

  const cx = rect.left + rect.width  * 0.5;
  const cy = rect.top  + rect.height * 0.5;
  // Normalised offset in [-1, 1]
  const nx = (_mouseX - cx) / (rect.width  * 0.5);
  const ny = (_mouseY - cy) / (rect.height * 0.5);

  const str = e.elasticity;

  // Directional squash/stretch (rdev formula)
  const sx = Math.max(0.8, 1 + Math.abs(nx) * str * 0.3 - Math.abs(ny) * str * 0.15);
  const sy = Math.max(0.8, 1 + Math.abs(ny) * str * 0.3 - Math.abs(nx) * str * 0.15);

  const sxF = (1 + (sx - 1) * factor).toFixed(4);
  const syF = (1 + (sy - 1) * factor).toFixed(4);

  // Translation toward cursor (subtle)
  const dx = ((_mouseX - cx) * str * 0.04 * factor).toFixed(2);
  const dy = ((_mouseY - cy) * str * 0.04 * factor).toFixed(2);

  e.el.style.transform = `translate(${dx}px,${dy}px) scaleX(${sxF}) scaleY(${syF})`;
}

function _refreshAllElastic() { _elasticEls.forEach(_refreshElastic); }

function _createElasticity(el, elasticity) {
  Object.assign(el.style, {
    transition: "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
    willChange: "transform",
  });
  const entry = { el, elasticity, _active: false };
  _elasticEls.add(entry);
  _bindMouse();
  return () => {
    _elasticEls.delete(entry);
    el.style.transform  = "";
    el.style.transition = "";
    el.style.willChange = "";
  };
}

// ── SVG filter helpers ────────────────────────────────────────────────────────
function _ensureDefs() {
  if (_svgDefs) return _svgDefs;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  _svgDefs = document.createElementNS(SVG_NS, "defs");
  svg.appendChild(_svgDefs);
  document.body.appendChild(svg);
  return _svgDefs;
}

// Displacement map variants
// standard:  X+Y gradient + fully-neutral grey centre → aberration at rim only
// polar:     X-only gradient, no centre override → horizontal sliding across full panel
// prominent: X+Y gradient + partially-neutral centre → lens push throughout panel
function _makeMap(w, h, radius, border, mapBlur, mode) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (mode === "polar") {
    // X gradient only — creates left/right sliding distortion panel-wide
    const gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, "rgb(0,0,0)");
    gx.addColorStop(1, "rgb(255,0,0)");
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);

  } else {
    // X+Y gradient (both standard and prominent share this base)
    const gx = ctx.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, "rgb(0,0,0)");
    gx.addColorStop(1, "rgb(255,0,0)");
    ctx.fillStyle = gx;
    ctx.fillRect(0, 0, w, h);

    const gy = ctx.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, "rgb(0,0,0)");
    gy.addColorStop(1, "rgb(0,0,255)");
    ctx.globalCompositeOperation = "difference";
    ctx.fillStyle = gy;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";

    const inset = border * Math.min(w, h);
    ctx.filter = "blur(" + mapBlur + "px)";
    // prominent: partial neutralisation → distortion bleeds toward centre
    // standard:  full neutralisation  → only rim distorts
    const alpha = mode === "prominent" ? 0.52 : 0.93;
    ctx.fillStyle = `rgba(128,128,128,${alpha})`;
    ctx.beginPath();
    ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, Math.max(radius - inset, 2));
    ctx.fill();
    ctx.filter = "none";
  }

  return canvas.toDataURL();
}

// Edge mask: white rim + black centre.
// When converted to an alpha channel, this restricts aberration to the rim.
function _makeEdgeMask(w, h, radius, intensity) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  const rim = Math.max(16, 10 + intensity * 3);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, radius);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.roundRect(rim, rim, w - rim * 2, h - rim * 2, Math.max(radius - rim, 2));
  ctx.fill();

  return canvas.toDataURL();
}

// Three feDisplacementMap passes (R/G/B with different scales) → chromatic aberration.
// If aberrationIntensity > 0, edge-mask compositing keeps the centre clean (rdev pattern):
//   aberrated ∩ softMask → edgeAberration
//   SourceGraphic ∖ softMask → cleanCentre
//   edgeAberration over cleanCentre → final
function _buildFilter(id, scales, aberrationIntensity) {
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "-35%");
  filter.setAttribute("y", "-35%");
  filter.setAttribute("width", "170%");
  filter.setAttribute("height", "170%");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const feImage = document.createElementNS(SVG_NS, "feImage");
  feImage.setAttribute("x", "0"); feImage.setAttribute("y", "0");
  feImage.setAttribute("result", "map");
  feImage.setAttribute("preserveAspectRatio", "none");
  filter.appendChild(feImage);

  const KEEP = [
    "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
    "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
    "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",
  ];
  const channels = [];
  for (let i = 0; i < 3; i++) {
    const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic"); disp.setAttribute("in2", "map");
    disp.setAttribute("scale", scales[i]);
    disp.setAttribute("xChannelSelector", "R"); disp.setAttribute("yChannelSelector", "B");
    disp.setAttribute("result", "d" + i);
    filter.appendChild(disp);

    const cm = document.createElementNS(SVG_NS, "feColorMatrix");
    cm.setAttribute("in", "d" + i);
    cm.setAttribute("type", "matrix"); cm.setAttribute("values", KEEP[i]);
    cm.setAttribute("result", "c" + i);
    filter.appendChild(cm);
    channels.push("c" + i);
  }

  const b1 = document.createElementNS(SVG_NS, "feBlend");
  b1.setAttribute("in", channels[0]); b1.setAttribute("in2", channels[1]);
  b1.setAttribute("mode", "screen"); b1.setAttribute("result", "c01");
  filter.appendChild(b1);

  const b2 = document.createElementNS(SVG_NS, "feBlend");
  b2.setAttribute("in", "c01"); b2.setAttribute("in2", channels[2]);
  b2.setAttribute("mode", "screen");
  // Name the blended result so edge compositing can reference it
  b2.setAttribute("result", aberrationIntensity > 0 ? "aberrated" : "final");
  filter.appendChild(b2);

  let feEdgeMask = null;

  if (aberrationIntensity > 0) {
    // Edge mask image (href set per-refresh)
    feEdgeMask = document.createElementNS(SVG_NS, "feImage");
    feEdgeMask.setAttribute("x", "0"); feEdgeMask.setAttribute("y", "0");
    feEdgeMask.setAttribute("result", "edgeMaskImg");
    feEdgeMask.setAttribute("preserveAspectRatio", "none");
    filter.appendChild(feEdgeMask);

    // RGB luminance → alpha so feComposite can use it as a stencil
    const lta = document.createElementNS(SVG_NS, "feColorMatrix");
    lta.setAttribute("in", "edgeMaskImg"); lta.setAttribute("type", "matrix");
    lta.setAttribute("values", "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.299 0.587 0.114 0 0");
    lta.setAttribute("result", "alphaMask");
    filter.appendChild(lta);

    // Soften the mask so the transition between edge/centre is smooth
    const mb = document.createElementNS(SVG_NS, "feGaussianBlur");
    mb.setAttribute("in", "alphaMask");
    mb.setAttribute("stdDeviation", Math.max(4, aberrationIntensity * 1.2).toFixed(1));
    mb.setAttribute("result", "softMask");
    filter.appendChild(mb);

    // Aberrated result clipped to rim (where mask is opaque)
    const ec = document.createElementNS(SVG_NS, "feComposite");
    ec.setAttribute("in", "aberrated"); ec.setAttribute("in2", "softMask");
    ec.setAttribute("operator", "in"); ec.setAttribute("result", "edgeAberration");
    filter.appendChild(ec);

    // Clean source in centre (where mask is transparent)
    const cc = document.createElementNS(SVG_NS, "feComposite");
    cc.setAttribute("in", "SourceGraphic"); cc.setAttribute("in2", "softMask");
    cc.setAttribute("operator", "out"); cc.setAttribute("result", "cleanCentre");
    filter.appendChild(cc);

    // Combine
    const fc = document.createElementNS(SVG_NS, "feComposite");
    fc.setAttribute("in", "edgeAberration"); fc.setAttribute("in2", "cleanCentre");
    fc.setAttribute("operator", "over");
    filter.appendChild(fc);
  }

  _ensureDefs().appendChild(filter);
  return { filter, feImage, feEdgeMask };
}

function _resolveRadius(el, w, h, override) {
  if (override != null) return override;
  const raw = getComputedStyle(el).borderTopLeftRadius || "0px";
  const v = parseFloat(raw) || 0;
  return raw.trim().endsWith("%") ? (v / 100) * Math.min(w, h) : v;
}

// ── Public API ────────────────────────────────────────────────────────────────
export function liquidGlass(el, opts) {
  const o = Object.assign({
    scale: -112, chroma: 6, border: 0.07, mapBlur: 12,
    blur: 3, saturate: 1.5, radius: null, fallbackBlur: 16,
    highlight: true,
    aberrationIntensity: 6,   // rim thickness for edge-only aberration; 0 = skip
    elasticity: 0.4,           // mouse pull strength; 0 = disabled
    mode: "standard",          // 'standard' | 'polar' | 'prominent'
  }, opts);

  // ── Fallback (Safari / Firefox) ──
  if (!supported) {
    const frosted = `blur(${o.fallbackBlur}px) saturate(${o.saturate})`;
    el.style.backdropFilter = frosted;
    el.style.webkitBackdropFilter = frosted;
    el.classList.add("lg-fallback");
    const destroyHL = o.highlight  ? _createHighlight(el)               : null;
    const destroyEL = o.elasticity ? _createElasticity(el, o.elasticity) : null;
    return {
      supported: false, refresh() {},
      destroy() {
        el.style.backdropFilter = el.style.webkitBackdropFilter = "";
        el.classList.remove("lg-fallback");
        destroyHL?.(); destroyEL?.();
      },
    };
  }

  // ── Chromium ──
  const id = "lg-filter-" + (++_uid);
  const scales = [o.scale, o.scale + o.chroma, o.scale + 2 * o.chroma];
  const parts  = _buildFilter(id, scales, o.aberrationIntensity);

  function refresh() {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    const radius = _resolveRadius(el, w, h, o.radius);

    parts.feImage.setAttribute("href",   _makeMap(w, h, radius, o.border, o.mapBlur, o.mode));
    parts.feImage.setAttribute("width",  w);
    parts.feImage.setAttribute("height", h);

    if (parts.feEdgeMask) {
      parts.feEdgeMask.setAttribute("href",   _makeEdgeMask(w, h, radius, o.aberrationIntensity));
      parts.feEdgeMask.setAttribute("width",  w);
      parts.feEdgeMask.setAttribute("height", h);
    }
  }

  refresh();
  const bf = `url(#${id}) blur(${o.blur}px) saturate(${o.saturate})`;
  el.style.backdropFilter = el.style.webkitBackdropFilter = bf;

  let _resizeTimer = null;
  const ro = new ResizeObserver(() => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(refresh, 120);
  });
  ro.observe(el);

  const destroyHL = o.highlight  ? _createHighlight(el)               : null;
  const destroyEL = o.elasticity ? _createElasticity(el, o.elasticity) : null;

  return {
    supported: true, refresh,
    destroy() {
      ro.disconnect();
      clearTimeout(_resizeTimer);
      parts.filter.remove();
      el.style.backdropFilter = el.style.webkitBackdropFilter = "";
      destroyHL?.(); destroyEL?.();
    },
  };
}

export default liquidGlass;
