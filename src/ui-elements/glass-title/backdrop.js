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
 * Images are drawn with the same object-fit: cover crop the CSS applies, so the
 * glazed tile frames the scene identically to the plain one.
 */
import { paintPaper } from '../liquid-glass/backdrop.js'
import { LETTER_TEX_W, LETTER_TEX_H } from '../glass-alphabet/scene.ts'

export const MASK_W = LETTER_TEX_W
export const MASK_H = LETTER_TEX_H

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

  // Exactly the overlay texture's size, so the upload is one-to-one rather than
  // stretched on the way in and squeezed back on the way out.
  mask.width = MASK_W
  mask.height = MASK_H

  let rect = { left: 0, top: 0, width: 0, height: 0 }
  let dpr = 1

  function resize(r, devicePixelRatio) {
    rect = r
    dpr = devicePixelRatio
    const w = Math.max(2, Math.round(r.width * dpr))
    const h = Math.max(2, Math.round(r.height * dpr))
    if (paper.width !== w || paper.height !== h) {
      paper.width = w
      paper.height = h
    }
  }

  /**
   * `tiles` are in the canvas's own CSS pixels, carrying the wobbled centre and
   * the size each tile currently occupies, so the imagery moves with the glass
   * rather than sliding under it.
   */
  function update(tiles, style) {
    if (!paper.width || !paper.height || !rect.width) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    paperCtx.setTransform(1, 0, 0, 1, 0, 0)
    paperCtx.globalCompositeOperation = 'source-over'
    paperCtx.clearRect(0, 0, paper.width, paper.height)
    paperCtx.save()
    paperCtx.scale(dpr, dpr)

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

    // The imagery, in canvas-local CSS pixels
    for (const t of tiles) {
      const img = t.img
      if (!img || !img.complete || !img.naturalWidth) continue
      const x = t.cx - t.w / 2
      const y = t.cy - t.h / 2
      try {
        paperCtx.drawImage(img, ...coverRect(img, t.w, t.h), x, y, t.w, t.h)
      } catch (_) { /* not decodable yet; the paper shows through */ }
    }
    paperCtx.restore()

    // Corner glyphs, as a coverage mask the shader mixes its own colour through
    maskCtx.setTransform(1, 0, 0, 1, 0, 0)
    maskCtx.clearRect(0, 0, mask.width, mask.height)
    maskCtx.save()
    maskCtx.scale(mask.width / rect.width, mask.height / rect.height)
    maskCtx.font = `${style.weight} ${style.size}px 'Playfair Display', Georgia, serif`
    maskCtx.textAlign = 'right'
    maskCtx.textBaseline = 'alphabetic'
    maskCtx.fillStyle = `rgba(255,255,255,${style.opacity.toFixed(3)})`
    for (const t of tiles) {
      maskCtx.fillText(t.ch, t.cx + t.w / 2 - 5, t.cy + t.h / 2 - 4)
    }
    maskCtx.restore()
  }

  return { paper, mask, resize, update }
}
