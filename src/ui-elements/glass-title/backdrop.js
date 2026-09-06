/**
 * What the masthead's glaze refracts: the page, and the tiles themselves.
 *
 * The alphabet's backdrop paints the paper and a letter. This one also draws the
 * Landsat imagery, straight from the <img> elements the masthead already has in
 * the DOM — so the glass bends the photograph rather than a flat colour, which
 * is the whole reason a glaze over these tiles reads as glass at all.
 *
 * Drawing the images here rather than showing them through the canvas is what
 * makes them refract. A DOM image under a transparent hole in the canvas would
 * stay perfectly flat; a WebGPU shader cannot sample the DOM, so anything that
 * has to bend must first be redrawn into a texture.
 *
 * Both canvases are drawn at exactly their texture's size rather than at device
 * resolution. The masthead is around four times wider than it is tall, so a
 * square texture fed from it would throw away nearly half the horizontal detail
 * on upload — and no amount of sharpening downstream brings that back. A wide
 * texture matched to the canvas keeps the imagery at full clarity.
 *
 * Images are drawn with the same object-fit: cover crop the CSS applies, so the
 * glazed tile frames the scene identically to the plain one.
 */
import { paintPaper } from '../liquid-glass/backdrop.js'
import { LETTER_TEX_W, LETTER_TEX_H } from '../glass-alphabet/scene.ts'

export const MASK_W = LETTER_TEX_W
export const MASK_H = LETTER_TEX_H

// Roughly the masthead's own aspect: two rows of tiles across a page-width
// container. Wide enough that the imagery is upsampled on the way in rather
// than crushed.
export const PAPER_W = 2048
export const PAPER_H = 512

/** object-fit: cover — the largest centred crop of `img` that fills w x h. */
function coverRect(img, w, h) {
  const ir = img.naturalWidth / img.naturalHeight
  const tr = w / h
  if (ir > tr) {
    const sw = img.naturalHeight * tr
    return [(img.naturalWidth - sw) / 2, 0, sw, img.naturalHeight]
  }
  const sh = img.naturalWidth / tr
  return [0, (img.naturalHeight - sh) / 2, img.naturalWidth, sh]
}

export function createTitleBackdrop() {
  const paper = document.createElement('canvas')
  const mask = document.createElement('canvas')
  const paperCtx = paper.getContext('2d')
  const maskCtx = mask.getContext('2d')

  // Exactly the textures' sizes, so both uploads are one-to-one rather than
  // stretched on the way in and squeezed back on the way out.
  paper.width = PAPER_W
  paper.height = PAPER_H
  mask.width = MASK_W
  mask.height = MASK_H

  let rect = { left: 0, top: 0, width: 0, height: 0 }

  function resize(r) {
    rect = r
  }

  /**
   * `tiles` are in the canvas's own CSS pixels, carrying the wobbled centre, the
   * size the image occupies and the body's half-extents, so the imagery moves
   * with the glass rather than sliding under it.
   */
  function update(tiles, style) {
    if (!rect.width || !rect.height) return

    const vw = window.innerWidth
    const vh = window.innerHeight
    const sx = PAPER_W / rect.width
    const sy = PAPER_H / rect.height

    paperCtx.setTransform(1, 0, 0, 1, 0, 0)
    paperCtx.globalCompositeOperation = 'source-over'
    paperCtx.clearRect(0, 0, PAPER_W, PAPER_H)
    paperCtx.save()
    // Slightly anisotropic wherever the canvas is not exactly 4:1. The shader's
    // sampling squeezes it back by the same factor, so what lands on screen is
    // undistorted and rasterized at the texture's resolution.
    paperCtx.scale(sx, sy)

    // The page behind the masthead, at its true scale
    paperCtx.save()
    paperCtx.translate(-rect.left, -rect.top)
    paintPaper(paperCtx, vw, vh)

    const fluid = document.getElementById('fluid-cursor-canvas') ||
      document.getElementById('tune-fluid-canvas')
    if (fluid && fluid.width > 0 && fluid.height > 0) {
      try {
        paperCtx.globalCompositeOperation = 'multiply'
        paperCtx.drawImage(fluid, 0, 0, vw, vh)
      } catch (_) { /* tainted or mid-frame; the paper still stands */ }
      paperCtx.globalCompositeOperation = 'source-over'
    }
    paperCtx.restore()

    // The imagery, in canvas-local CSS pixels. It fills the body exactly — the
    // glaze is added around it rather than carved out of it, so nothing of the
    // photograph is spent on the edge.
    for (const t of tiles) {
      const img = t.img
      if (!img || !img.complete || !img.naturalWidth) continue
      try {
        paperCtx.drawImage(
          img, ...coverRect(img, t.w, t.h),
          t.cx - t.w / 2, t.cy - t.h / 2, t.w, t.h,
        )
      } catch (_) { /* not decodable yet; the paper shows through */ }
    }
    paperCtx.restore()

    // Corner glyphs, as a coverage mask the shader mixes its own colour through.
    // Positioned against the body's corner, not the visible tile's — the glaze
    // extends past the image, and a glyph placed against its outer edge would
    // float off the picture into the bevel.
    maskCtx.setTransform(1, 0, 0, 1, 0, 0)
    maskCtx.clearRect(0, 0, MASK_W, MASK_H)
    maskCtx.save()
    maskCtx.scale(MASK_W / rect.width, MASK_H / rect.height)
    maskCtx.font = `${style.weight} ${style.size}px 'Playfair Display', Georgia, serif`
    maskCtx.textAlign = style.align
    maskCtx.textBaseline = style.baseline
    maskCtx.fillStyle = `rgba(255,255,255,${style.opacity.toFixed(3)})`
    for (const t of tiles) {
      const left = style.align === 'left'
      const top = style.baseline === 'top'
      maskCtx.fillText(
        t.ch,
        t.cx + (left ? -t.w / 2 + style.insetX : t.w / 2 - style.insetX),
        t.cy + (top ? -t.h / 2 + style.insetY : t.h / 2 - style.insetY),
      )
    }
    maskCtx.restore()
  }

  return { paper, mask, resize, update }
}
