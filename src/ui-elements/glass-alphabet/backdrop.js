/**
 * What the alphabet's glass refracts: two canvases, rebuilt each frame.
 *
 * A WebGPU shader cannot sample the DOM, so the page behind the grid is redrawn
 * into a texture — the same approach the page panels take in
 * liquid-glass/backdrop.js. Two differences, both because this one is small:
 *
 *   1. It covers the grid's own rectangle rather than the whole viewport, at
 *      device resolution instead of half. A viewport-sized backdrop downsampled
 *      into a shared texture leaves a 15px letter about four pixels tall by the
 *      time the lens reads it.
 *   2. The letters get a canvas of their own. They have to be part of what the
 *      lens displaces — that is what puts them *under* the glass rather than on
 *      it, the way RENDER sits under the jelly — but the paper is sampled at a
 *      mip bias to blur the glass body, and a letter sampled at that bias is
 *      mush. Separate textures let the glyph stay at mip 0 while the page
 *      behind it blurs.
 *
 * The letter canvas carries a coverage mask, not colour: white glyphs, alpha
 * doing the work. The shader mixes its own letter colour through that mask, so
 * three chromatic samples give real fringing on the glyph edges instead of
 * three tinted copies, and recolouring costs a uniform write rather than a
 * repaint.
 *
 * The fluid layer carries the same caveat as the shared backdrop: the cursor
 * canvas runs with preserveDrawingBuffer false, so it is only readable during
 * the frame that drew it. When our rAF lands before the library's, the paper
 * comes through and the fluid does not.
 */
import { paintPaper } from '../liquid-glass/backdrop.js'

export function createTileBackdrop() {
  const paper = document.createElement('canvas')
  const letters = document.createElement('canvas')
  const paperCtx = paper.getContext('2d')
  const letterCtx = letters.getContext('2d')

  let rect = { left: 0, top: 0, width: 0, height: 0 }
  let dpr = 1

  function resize(r, devicePixelRatio) {
    rect = r
    dpr = devicePixelRatio
    const w = Math.max(2, Math.round(r.width * dpr))
    const h = Math.max(2, Math.round(r.height * dpr))
    for (const c of [paper, letters]) {
      if (c.width !== w || c.height !== h) {
        c.width = w
        c.height = h
      }
    }
  }

  /**
   * `glyphs` are in the canvas's own CSS pixels — the same space the tiles are
   * laid out in — so the caller hands over the wobbled centres directly and a
   * letter stays under its tile as it moves.
   */
  function update(glyphs, style) {
    if (!paper.width || !paper.height) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    // ── Paper: the page, shifted so the slice behind this canvas lands on it.
    // Painting the gradients at their true scale rather than squeezing the whole
    // page into a small canvas is what keeps the colour behind the grid the same
    // colour the page has there.
    paperCtx.setTransform(1, 0, 0, 1, 0, 0)
    paperCtx.globalCompositeOperation = 'source-over'
    paperCtx.clearRect(0, 0, paper.width, paper.height)
    paperCtx.save()
    paperCtx.scale(dpr, dpr)
    paperCtx.translate(-rect.left, -rect.top)
    paintPaper(paperCtx, vw, vh)

    const fluid = document.getElementById('fluid-cursor-canvas') ||
      document.getElementById('tune-fluid-canvas')
    if (fluid && fluid.width > 0 && fluid.height > 0) {
      try {
        // The blend the real canvas uses, so the glass refracts what is on
        // screen rather than a brighter version of it
        paperCtx.globalCompositeOperation = 'multiply'
        paperCtx.drawImage(fluid, 0, 0, vw, vh)
      } catch (_) { /* tainted or mid-frame; the paper still stands */ }
      paperCtx.globalCompositeOperation = 'source-over'
    }
    paperCtx.restore()

    // ── Letters: a coverage mask in canvas-local CSS pixels
    letterCtx.setTransform(1, 0, 0, 1, 0, 0)
    letterCtx.clearRect(0, 0, letters.width, letters.height)
    letterCtx.save()
    letterCtx.scale(dpr, dpr)
    letterCtx.font = `${style.weight} ${style.size}px 'Playfair Display', Georgia, serif`
    letterCtx.textAlign = 'center'
    letterCtx.textBaseline = 'middle'
    for (const g of glyphs) {
      letterCtx.fillStyle = `rgba(255,255,255,${(style.opacity * g.alpha).toFixed(3)})`
      letterCtx.fillText(g.letter, g.x, g.y)
    }
    letterCtx.restore()
  }

  return { paper, letters, resize, update }
}
