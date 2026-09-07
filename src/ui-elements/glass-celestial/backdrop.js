/**
 * What the ornament refracts: the page immediately behind it.
 *
 * Its own rather than the masthead's, because the masthead's is 2048x512 —
 * sized for a row of Landsat tiles — and repainting that every frame for a 40px
 * ornament is most of a megapixel of work for a few hundred pixels of result.
 * This one is square and small, and the ornament is square and small.
 *
 * Same construction as the others: the shader cannot sample the DOM, so the
 * gradients are repainted from the theme's own tokens and the fluid canvas is
 * composited in at whatever blend the page is using.
 */
import { paintPaper } from '../liquid-glass/backdrop.js'

/** Comfortably above the ornament's own size at any sane device ratio. */
export const TEX_SIZE = 256

export function createCelestialBackdrop() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = TEX_SIZE
  canvas.height = TEX_SIZE

  let rect = { left: 0, top: 0, width: 0, height: 0 }

  function resize(r) {
    rect = r
  }

  function update() {
    if (!rect.width || !rect.height) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE)
    ctx.save()
    // Drawn at exactly the texture's size, so the upload is one-to-one. The
    // scale is anisotropic only if the element is not square, and the shader
    // squeezes it back by the same factor either way.
    ctx.scale(TEX_SIZE / rect.width, TEX_SIZE / rect.height)
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
  }

  return { canvas, resize, update }
}
