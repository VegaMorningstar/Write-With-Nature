/**
 * The backdrop the glass refracts.
 *
 * Their shader samples a texture. Ours has to refract the live page, and a
 * WebGPU shader cannot sample the DOM — so the page's background is rebuilt
 * into a canvas each frame and uploaded as that texture.
 *
 * Two layers, matching what actually sits behind the panels:
 *   1. the paper gradients from index.css, repainted here with the same values
 *      collage.js uses for export, so the two stay in agreement
 *   2. the fluid cursor canvas, composited with multiply because that is the
 *      mix-blend-mode the real one uses
 *
 * What this does NOT include is the DOM on top of it — text, tiles, vines. The
 * glass refracts the page's background, not its content. Anything the lens is
 * placed over is covered rather than bent.
 *
 * Rendered at a fraction of device resolution: it is about to be blurred and
 * displaced, and a full-size upload every frame is a lot of bandwidth for
 * detail that is immediately destroyed.
 */

const PAPER_BASE = '#d9cdb4'

// centreX, centreY, radiusX, radiusY, 'r,g,b', alpha, stop — all as fractions,
// lifted from the body gradients in index.css
const PAPER_GRADIENTS = [
  [0.12, 0.18, 0.75, 0.60, '42,107,94', 0.38, 0.65],
  [0.88, 0.10, 0.60, 0.50, '200,150,42', 0.32, 0.60],
  [0.72, 0.78, 0.65, 0.55, '74,124,63', 0.30, 0.65],
  [0.06, 0.82, 0.50, 0.45, '184,84,42', 0.26, 0.60],
  [0.50, 0.48, 0.55, 0.40, '122,182,72', 0.14, 0.70],
]

function ellipticGrad(ctx, cw, ch, cxPct, cyPct, rxPct, ryPct, rgb, alpha, stopPct) {
  const cx = cw * cxPct
  const cy = ch * cyPct
  const rx = cw * rxPct
  const ry = ch * ryPct
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, ry / rx)
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  grd.addColorStop(0, `rgba(${rgb},${alpha})`)
  grd.addColorStop(stopPct, `rgba(${rgb},0)`)
  grd.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = grd
  const r = rx * 1.1
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.restore()
}

export function createBackdrop({ scale = 0.5 } = {}) {
  const composite = document.createElement('canvas')
  const ctx = composite.getContext('2d', { willReadFrequently: false })

  // The paper only changes on resize, so it is painted once and blitted
  const paper = document.createElement('canvas')
  const paperCtx = paper.getContext('2d')

  let w = 0
  let h = 0

  function resize(cssW, cssH) {
    const nw = Math.max(2, Math.round(cssW * scale))
    const nh = Math.max(2, Math.round(cssH * scale))
    if (nw === w && nh === h) return false

    w = nw
    h = nh
    composite.width = w
    composite.height = h
    paper.width = w
    paper.height = h

    paperCtx.fillStyle = PAPER_BASE
    paperCtx.fillRect(0, 0, w, h)
    for (const g of PAPER_GRADIENTS) ellipticGrad(paperCtx, w, h, ...g)
    return true
  }

  function update() {
    if (!w || !h) return composite

    ctx.globalCompositeOperation = 'source-over'
    ctx.drawImage(paper, 0, 0)

    const fluid = document.getElementById('fluid-cursor-canvas')
    if (fluid && fluid.width > 0 && fluid.height > 0) {
      try {
        // Same blend the real canvas uses, so the glass refracts what is
        // actually on screen rather than a brighter version of it
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(fluid, 0, 0, w, h)
        ctx.globalCompositeOperation = 'source-over'
      } catch (_) {
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    return composite
  }

  return {
    canvas: composite,
    resize,
    update,
    get width() { return w },
    get height() { return h },
  }
}
