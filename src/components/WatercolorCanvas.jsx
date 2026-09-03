import { useEffect, useRef } from 'react'

const COLORS = [
  [242, 222, 120],
  [248, 205, 110],
  [110, 215, 205],
  [130, 200, 230],
  [160, 225, 215],
  [200, 170, 232],
  [218, 195, 245],
]

export default function WatercolorCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const cv = canvasRef.current
    const ctx = cv.getContext('2d')
    let lx = -1, ly = -1, ci = 0, traveled = 0
    let resizeTimer

    function resize() {
      cv.width  = window.innerWidth
      cv.height = window.innerHeight
    }
    resize()

    function drop(x, y, rad, alpha) {
      const [r, g, b] = COLORS[ci]
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rad)
      grd.addColorStop(0,    `rgba(${r},${g},${b},${Math.min(0.95, alpha * 1.6).toFixed(3)})`)
      grd.addColorStop(0.40, `rgba(${r},${g},${b},${alpha.toFixed(3)})`)
      grd.addColorStop(1,    `rgba(${r},${g},${b},0)`)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.random() * Math.PI)
      ctx.scale(0.7 + Math.random() * 0.6, 0.45 + Math.random() * 0.55)
      ctx.translate(-x, -y)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, rad, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    function blob(x, y) {
      const alpha = 0.28 + Math.random() * 0.18
      const rad   = 38 + Math.random() * 36
      drop(x, y, rad, alpha)
      const satellites = 3 + Math.floor(Math.random() * 4)
      for (let i = 0; i < satellites; i++) {
        const a = Math.random() * Math.PI * 2
        const d = rad * (0.4 + Math.random() * 1.1)
        drop(x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + Math.random() * 10, alpha * 0.75)
      }
    }

    function paint(x, y) {
      if (lx < 0) { lx = x; ly = y; return }
      const dx = x - lx, dy = y - ly
      const d = Math.sqrt(dx * dx + dy * dy)
      if (d < 8) return
      blob(x, y)
      traveled += d
      if (traveled > 70 + Math.random() * 110) {
        ci = (ci + 1) % COLORS.length
        traveled = 0
      }
      lx = x; ly = y
    }

    function splatter(x, y) {
      const n = 6 + Math.floor(Math.random() * 7)
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        blob(x + Math.cos(a) * Math.random() * 55, y + Math.sin(a) * Math.random() * 55)
      }
      ci = (ci + 1) % COLORS.length
    }

    const onMouseMove  = e => paint(e.clientX, e.clientY)
    const onMouseLeave = () => { lx = -1; ly = -1 }
    const onTouchStart = e => {
      const t = e.touches[0]
      lx = t.clientX; ly = t.clientY
      splatter(t.clientX, t.clientY)
    }
    const onTouchMove  = e => { const t = e.touches[0]; paint(t.clientX, t.clientY) }
    const onTouchEnd   = () => { lx = -1; ly = -1 }
    const onResize     = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150) }

    document.addEventListener('mousemove',  onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd)
    window.addEventListener('resize',       onResize)

    return () => {
      document.removeEventListener('mousemove',  onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
      window.removeEventListener('resize',       onResize)
      clearTimeout(resizeTimer)
    }
  }, [])

  return (
    <canvas
      id="wc"
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 5,
      }}
    />
  )
}
