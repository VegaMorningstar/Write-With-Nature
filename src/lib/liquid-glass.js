/*!
 * liquid-glass.js — Apple-style liquid glass refraction + mouse-reactive border highlight.
 * Refraction: SVG feDisplacementMap per RGB channel (chromatic aberration).
 * Highlight: two blend-mode spans whose gradient angle tracks the cursor (rdev pattern).
 * Chromium only for real refraction; Safari/Firefox get frosted-blur fallback.
 */

"use strict";

const SVG_NS = "http://www.w3.org/2000/svg";
let _uid = 0;
let _svgDefs = null;

// ── Browser capability check ──────────────────────────────────────────────────
const supported = (() => {
  const ua = navigator.userAgent;
  const isSafari  = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  if (isSafari || isFirefox) return false;
  if (!CSS.supports("backdrop-filter", "url(#lg)")) return false;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    c.getContext("2d").getImageData(0, 0, 1, 1);
    return true;
  } catch (_) {
    return false;
  }
})();

// ── Shared mouse-tracking for border highlights ───────────────────────────────
let _mouseX = 0;
let _mouseY = 0;
let _mouseBound = false;
const _highlights = new Set();

function _bindMouse() {
  if (_mouseBound) return;
  _mouseBound = true;
  window.addEventListener("mousemove", e => {
    _mouseX = e.clientX;
    _mouseY = e.clientY;
    _highlights.forEach(_refreshHighlight);
  }, { passive: true });
}

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

  const g1 = `linear-gradient(${angle.toFixed(1)}deg, rgba(255,255,255,${a1}) ${p1.toFixed(1)}%, rgba(255,255,255,0) ${p2.toFixed(1)}%)`;
  const g2 = `linear-gradient(${angle.toFixed(1)}deg, rgba(255,255,255,${a2}) ${p1.toFixed(1)}%, rgba(255,255,255,0) ${p2.toFixed(1)}%)`;

  h.s1.style.background = g1;
  h.s2.style.background = g2;
}

// Mask trick: only the 1.5 px padding band is visible → rim highlight
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

  return () => {
    _highlights.delete(entry);
    s1.remove();
    s2.remove();
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

// Canvas displacement map: x-gradient (R) XOR y-gradient (B), grey rounded rect.
function _makeMap(w, h, radius, border, mapBlur) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

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
  ctx.fillStyle = "rgba(128,128,128,0.93)";
  ctx.beginPath();
  ctx.roundRect(inset, inset, w - inset * 2, h - inset * 2, Math.max(radius - inset, 2));
  ctx.fill();
  ctx.filter = "none";

  return canvas.toDataURL();
}

// Three feDisplacementMap passes (one per RGB channel) → feBlend screen.
// Different scale per channel = chromatic aberration at edges.
function _buildFilter(id, scales) {
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "-35%");
  filter.setAttribute("y", "-35%");
  filter.setAttribute("width", "170%");
  filter.setAttribute("height", "170%");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const feImage = document.createElementNS(SVG_NS, "feImage");
  feImage.setAttribute("x", "0");
  feImage.setAttribute("y", "0");
  feImage.setAttribute("result", "map");
  feImage.setAttribute("preserveAspectRatio", "none");
  filter.appendChild(feImage);

  // One feDisplacementMap per channel, then extract only that channel
  const KEEP = [
    "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",   // keep R
    "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",   // keep G
    "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0",   // keep B
  ];
  const channels = [];
  for (let i = 0; i < 3; i++) {
    const disp = document.createElementNS(SVG_NS, "feDisplacementMap");
    disp.setAttribute("in", "SourceGraphic");
    disp.setAttribute("in2", "map");
    disp.setAttribute("scale", scales[i]);
    disp.setAttribute("xChannelSelector", "R");
    disp.setAttribute("yChannelSelector", "B");
    disp.setAttribute("result", "d" + i);
    filter.appendChild(disp);

    const cm = document.createElementNS(SVG_NS, "feColorMatrix");
    cm.setAttribute("in", "d" + i);
    cm.setAttribute("type", "matrix");
    cm.setAttribute("values", KEEP[i]);
    cm.setAttribute("result", "c" + i);
    filter.appendChild(cm);
    channels.push("c" + i);
  }

  const blend1 = document.createElementNS(SVG_NS, "feBlend");
  blend1.setAttribute("in",   channels[0]);
  blend1.setAttribute("in2",  channels[1]);
  blend1.setAttribute("mode", "screen");
  blend1.setAttribute("result", "c01");
  filter.appendChild(blend1);

  const blend2 = document.createElementNS(SVG_NS, "feBlend");
  blend2.setAttribute("in",   "c01");
  blend2.setAttribute("in2",  channels[2]);
  blend2.setAttribute("mode", "screen");
  filter.appendChild(blend2);

  _ensureDefs().appendChild(filter);
  return { filter, feImage };
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
    blur: 3, saturate: 1.5, radius: null,
    fallbackBlur: 16,
    highlight: true,   // mouse-reactive border rim (rdev pattern)
  }, opts);

  // ── Fallback path (Safari / Firefox) ──
  if (!supported) {
    const frosted = "blur(" + o.fallbackBlur + "px) saturate(" + o.saturate + ")";
    el.style.backdropFilter = frosted;
    el.style.webkitBackdropFilter = frosted;
    el.classList.add("lg-fallback");

    const destroyHL = o.highlight ? _createHighlight(el) : null;

    return {
      supported: false,
      refresh() {},
      destroy() {
        el.style.backdropFilter = "";
        el.style.webkitBackdropFilter = "";
        el.classList.remove("lg-fallback");
        destroyHL?.();
      },
    };
  }

  // ── Chromium path: real refraction ──
  const id = "lg-filter-" + (++_uid);
  // Scale per channel: R at base, G and B offset by chroma for aberration
  const scales = [o.scale, o.scale + o.chroma, o.scale + 2 * o.chroma];
  const parts = _buildFilter(id, scales);

  function refresh() {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return;
    const radius = _resolveRadius(el, w, h, o.radius);
    parts.feImage.setAttribute("href",   _makeMap(w, h, radius, o.border, o.mapBlur));
    parts.feImage.setAttribute("width",  w);
    parts.feImage.setAttribute("height", h);
  }

  refresh();
  const bf = "url(#" + id + ") blur(" + o.blur + "px) saturate(" + o.saturate + ")";
  el.style.backdropFilter       = bf;
  el.style.webkitBackdropFilter = bf;

  let _resizeTimer = null;
  const ro = new ResizeObserver(() => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(refresh, 120);
  });
  ro.observe(el);

  const destroyHL = o.highlight ? _createHighlight(el) : null;

  return {
    supported: true,
    refresh,
    destroy() {
      ro.disconnect();
      clearTimeout(_resizeTimer);
      parts.filter.remove();
      el.style.backdropFilter       = "";
      el.style.webkitBackdropFilter = "";
      destroyHL?.();
    },
  };
}

export default liquidGlass;
