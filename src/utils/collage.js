function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

// Draws an elliptical radial gradient onto ctx, matching CSS radial-gradient(ellipse ...)
function ellipticGrad(ctx, cw, ch, cx_pct, cy_pct, rx_pct, ry_pct, rgb, alpha, stopPct) {
  const cx = cw * cx_pct, cy = ch * cy_pct
  const rx = cw * rx_pct, ry = ch * ry_pct
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(1, ry / rx)
  const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  grd.addColorStop(0,        `rgba(${rgb},${alpha})`)
  grd.addColorStop(stopPct,  `rgba(${rgb},0)`)
  grd.addColorStop(1,        `rgba(${rgb},0)`)
  ctx.fillStyle = grd
  const r = rx * 1.1
  ctx.fillRect(-r, -r, r * 2, r * 2)
  ctx.restore()
}

export async function downloadCollage(exportCanvas, showToast) {
  const rows = document.querySelectorAll('.collage-row')
  if (!rows.length) { showToast('Nothing to export yet'); return }
  showToast('Preparing high-res image…')

  const cv = exportCanvas
  const ctx = cv.getContext('2d')
  const GAP = 6, ROW_GAP = 14, PAD = 52

  // Tile width: use DOM value but at least 160px for export quality
  const firstTile = document.querySelector('.collage-row .tile')
  const domTileW = firstTile ? firstTile.offsetWidth : 118
  const tileW = Math.max(domTileW, 160)
  const scale = tileW / domTileW         // scale factor relative to DOM
  const spW   = Math.round(tileW * 0.37)

  // ── Pre-pass: collect images and compute portrait heights ─────────────────
  const rowLayouts = []
  let maxRowW = 0, totalH = PAD

  for (const row of rows) {
    const domItems = [...row.children].filter(el =>
      el.classList.contains('tile') || el.classList.contains('tile-space'))

    let rowW = 0, rowH = tileW
    const cells = []

    for (const el of domItems) {
      if (el.classList.contains('tile-space')) {
        cells.push({ space: true, w: spW })
        rowW += spW
      } else {
        const img = el.querySelector('img')
        let h = tileW // fallback square
        if (img?.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
          h = Math.round(tileW * img.naturalHeight / img.naturalWidth)
        }
        rowH = Math.max(rowH, h)
        const letter = el.querySelector('.tile-char')?.textContent || ''
        cells.push({ space: false, w: tileW, h, img, letter })
        rowW += tileW
      }
    }
    if (cells.length > 1) rowW += (cells.length - 1) * GAP
    maxRowW = Math.max(maxRowW, rowW)
    rowLayouts.push({ cells, rowH })
    totalH += rowH + ROW_GAP
  }

  totalH += PAD - ROW_GAP
  cv.width  = maxRowW + PAD * 2
  cv.height = totalH

  // ── 1. Paper base colour ──────────────────────────────────────────────────
  ctx.fillStyle = '#d9cdb4'
  ctx.fillRect(0, 0, cv.width, cv.height)

  // ── 2. Replicate the 5 CSS body radial gradients ─────────────────────────
  // radial-gradient(ellipse W H at X Y, rgba(...) 0%, transparent STOP)
  ctx.globalCompositeOperation = 'source-over'
  ellipticGrad(ctx, cv.width, cv.height, 0.12, 0.18, 0.75, 0.60, '42,107,94',   0.38, 0.65)
  ellipticGrad(ctx, cv.width, cv.height, 0.88, 0.10, 0.60, 0.50, '200,150,42',  0.32, 0.60)
  ellipticGrad(ctx, cv.width, cv.height, 0.72, 0.78, 0.65, 0.55, '74,124,63',   0.30, 0.65)
  ellipticGrad(ctx, cv.width, cv.height, 0.06, 0.82, 0.50, 0.45, '184,84,42',   0.26, 0.60)
  ellipticGrad(ctx, cv.width, cv.height, 0.50, 0.48, 0.55, 0.40, '122,182,72',  0.14, 0.70)

  // ── 3. Fluid cursor capture (WebGL — works if called before next rAF) ─────
  const fluidCanvas = document.getElementById('fluid-cursor-canvas')
  if (fluidCanvas?.width > 0 && fluidCanvas?.height > 0) {
    try {
      ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(fluidCanvas, 0, 0, cv.width, cv.height)
      ctx.globalCompositeOperation = 'source-over'
    } catch (_) {
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  // ── 4. Paper grain overlay (matching body::before SVG noise) ─────────────
  await new Promise(resolve => {
    const gi = new Image()
    gi.onload = () => {
      ctx.globalCompositeOperation = 'multiply'
      const ts = 180
      for (let x = 0; x < cv.width; x += ts)
        for (let y = 0; y < cv.height; y += ts)
          ctx.drawImage(gi, x, y, ts, ts)
      ctx.globalCompositeOperation = 'source-over'
      resolve()
    }
    gi.onerror = resolve
    gi.src = 'data:image/svg+xml,' + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/></filter>" +
      "<rect width='180' height='180' filter='url(#n)' opacity='0.10'/></svg>"
    )
  })

  // ── 5. Draw tiles at natural portrait aspect ratio ────────────────────────
  let y = PAD
  for (const { cells, rowH } of rowLayouts) {
    let x = PAD
    for (const cell of cells) {
      if (cell.space) { x += cell.w + GAP; continue }

      const { img, w, letter } = cell
      const h = cell.h || rowH
      const radius = Math.max(6, Math.round(w * 0.055))

      ctx.save()
      rr(ctx, x, y, w, h, radius)
      ctx.clip()

      if (img?.complete && img.naturalWidth > 0) {
        // Draw at full natural aspect — no squashing
        ctx.drawImage(img, x, y, w, h)
      } else {
        ctx.fillStyle = '#cfc3a8'
        ctx.fillRect(x, y, w, h)
        ctx.globalAlpha = 0.15
        ctx.fillStyle = '#1c1a10'
        ctx.font = `bold ${Math.round(w * 0.48)}px 'Playfair Display',Georgia,serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(letter, x + w / 2, y + h / 2)
      }
      ctx.restore()

      // Subtle dark vignette rim on each tile (matches .tile-wash)
      ctx.save()
      rr(ctx, x, y, w, h, radius)
      ctx.clip()
      const rim = ctx.createLinearGradient(x, y, x, y + h)
      rim.addColorStop(0,   'rgba(200,150,42,0)')
      rim.addColorStop(0.7, 'rgba(200,150,42,0)')
      rim.addColorStop(1,   'rgba(200,150,42,0.05)')
      ctx.fillStyle = rim
      ctx.fillRect(x, y, w, h)
      ctx.restore()

      x += w + GAP
    }
    y += rowH + ROW_GAP
  }

  // ── 6. Export ─────────────────────────────────────────────────────────────
  const a = document.createElement('a')
  a.download = 'write-with-nature.png'
  a.href = cv.toDataURL('image/png')
  a.click()
  showToast('Saved · write-with-nature.png')
}
