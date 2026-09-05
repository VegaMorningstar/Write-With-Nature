/**
 * What the alphabet's glass refracts.
 *
 * A WebGPU shader cannot sample the DOM, so the page behind the grid is rebuilt
 * into a canvas each frame and uploaded as a texture — the same approach the
 * page panels take in liquid-glass/backdrop.js.
 *
 * Two differences, both because this one is small:
 *
 *   1. It covers the grid's own rectangle rather than the whole viewport, at
 *      device resolution instead of half. A viewport-sized backdrop downsampled
 *      to a shared texture leaves a 14px letter about four pixels tall by the
 *      time the lens reads it.
 *   2. The letters are painted into it. That is the entire reason they read as
 *      being *under* the glass — they are part of what gets displaced and split
 *      into three refractive indices, exactly as the word RENDER is on the jelly
 *      button. Drawn as DOM on top, they would sit flat on the surface instead.
 *
 * The fluid layer carries the same caveat as the shared backdrop: the cursor
 * canvas runs with preserveDrawingBuffer false, so it is only readable during
 * the frame that drew it. When our rAF lands before the library's, the paper
 * comes through and the fluid does not.
 */
import { paintPaper } from '../liquid-glass/backdrop.js'

export function createTileBackdrop() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  let rect = { left: 0, top: 0, width: 0, height: 0 }
  let dpr = 1

  function resize(r, devicePixelRatio) {
    rect = r
    dpr = devicePixelRatio
    const w = Math.max(2, Math.round(r.width * dpr))
    const h = Math.max(2, Math.round(r.height * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
  }

  /**
   * `letters` are in the canvas's own CSS pixels — the same space the tiles are
   * laid out in — so the caller can hand over the wobbled centres directly and
   * a letter stays under its tile as it moves.
   */
  function update(letters, style) {
    if (!canvas.width || !canvas.height) return canvas

    const vw = window.innerWidth
    const vh = window.innerHeight

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the viewport-wide paper, shifted so the slice behind this canvas
    // lands on it. Painting the gradients at their true scale rather than
    // squeezing the page into a small canvas is what keeps the colour behind
    // the grid the same colour the page has there.
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.translate(-rect.left, -rect.top)
    paintPaper(ctx, vw, vh)

    const fluid = document.getElementById('fluid-cursor-canvas') ||
      document.getElementById('tune-fluid-canvas')
    if (fluid && fluid.width > 0 && fluid.height > 0) {
      try {
        // The blend the real canvas uses, so the glass refracts what is on
        // screen rather than a brighter version of it
        ctx.globalCompositeOperation = 'multiply'
        ctx.drawImage(fluid, 0, 0, vw, vh)
      } catch (_) { /* tainted or mid-frame; the paper still stands */ }
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()

    // Letters, in canvas-local CSS pixels
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.font = `${style.weight} ${style.size}px 'Playfair Display', Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const l of letters) {
      ctx.fillStyle = `rgba(${style.r},${style.g},${style.b},${(style.opacity * l.alpha).toFixed(3)})`
      ctx.fillText(l.letter, l.x, l.y)
    }
    ctx.restore()

    return canvas
  }

  return { canvas, resize, update }
}
