function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y)
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r)
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r)
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

export async function downloadCollage(exportCanvas, showToast) {
  const rows = document.querySelectorAll('.collage-row')
  if (!rows.length) { showToast('Nothing to export yet'); return }
  showToast('Preparing your image…')

  const cv = exportCanvas
  const ctx = cv.getContext('2d')
  const gap = 2, pad = 32

  // Infer tileW from the first tile in DOM
  const firstTile = document.querySelector('.collage-row .tile')
  const tileW = firstTile ? firstTile.offsetWidth : 118
  const spW = Math.max(24, Math.round(tileW * 0.6))

  let maxW = 0, totalH = pad
  const layouts = []
  rows.forEach(row => {
    const items = [...row.children].filter(el =>
      el.classList.contains('tile') || el.classList.contains('tile-space'))
    const rowW = items.reduce((sum, el) =>
      sum + (el.classList.contains('tile') ? tileW : spW), 0)
      + Math.max(0, items.length - 1) * gap
    maxW = Math.max(maxW, rowW)
    layouts.push(items)
    totalH += tileW + gap
  })
  totalH += pad - gap
  cv.width  = maxW + pad * 2
  cv.height = totalH

  ctx.fillStyle = '#f0ead8'
  ctx.fillRect(0, 0, cv.width, cv.height)

  const wc = document.getElementById('wc')
  if (wc && wc.width > 0 && wc.height > 0) {
    const scale = Math.max(cv.width / wc.width, cv.height / wc.height)
    const sw = cv.width / scale, sh = cv.height / scale
    const sx = Math.max(0, (wc.width  - sw) / 2)
    const sy = Math.max(0, (wc.height - sh) / 2)
    ctx.drawImage(wc, sx, sy, sw, sh, 0, 0, cv.width, cv.height)
  }

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

  let y = pad
  for (const items of layouts) {
    let x = pad
    for (const el of items) {
      if (el.classList.contains('tile-space')) { x += spW + gap; continue }
      const img = el.querySelector('img')
      ctx.save(); rr(ctx, x, y, tileW, tileW, 5); ctx.clip()
      if (img?.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, tileW, tileW)
      } else {
        ctx.fillStyle = '#ddd4b8'; ctx.fillRect(x, y, tileW, tileW)
        const lbl = el.querySelector('.tile-char')?.textContent || ''
        ctx.globalAlpha = 0.18; ctx.fillStyle = '#1c1a10'
        ctx.font = `bold ${Math.round(tileW * 0.48)}px 'Playfair Display',Georgia,serif`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(lbl, x + tileW / 2, y + tileW / 2)
      }
      ctx.restore()
      x += tileW + gap
    }
    y += tileW + gap
  }

  const a = document.createElement('a')
  a.download = 'write-with-nature.png'
  a.href = cv.toDataURL('image/png')
  a.click()
  showToast('Saved · write-with-nature.png')

  if (wc) {
    wc.getContext('2d').clearRect(0, 0, wc.width, wc.height)
  }
}
