/**
 * Puts the star field on the page, for themes that have one.
 *
 * This owns a display canvas and repaints it each frame, because a few dozen
 * stars twinkle. The expensive part — the thousands of still stars — is a
 * single blit of the canvas stars.js baked once; only the twinklers are real
 * drawing. The glass backdrops draw the same field from the same module, so a
 * panel refracts the sky that is behind it rather than a second one.
 *
 * z-index -1, inside body's own stacking context: above the page background,
 * below everything in normal flow. The grain layers this replaces sat at 0 and
 * could, because they were blended overlays meant to fall on top of the text.
 * A star field at 0 would paint over it.
 */
import { useEffect, useRef, useState } from 'react'
import { tokens, onThemeChange } from '../theme.js'
import { drawStars, refreshStars } from './stars.js'

export default function NightSky() {
  const canvasRef = useRef(null)
  const [on, setOn] = useState(() => tokens().stars)

  useEffect(() => onThemeChange(() => setOn(tokens().stars)), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!on || !canvas) return

    const ctx = canvas.getContext('2d')
    // No context, no sky. Starting the loop anyway would throw on the first
    // frame and take every other animation on the page down with it.
    if (!ctx) return
    let raf = 0

    const frame = now => {
      raf = requestAnimationFrame(frame)
      const w = Math.max(1, window.innerWidth)
      const h = Math.max(1, window.innerHeight)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = Math.round(w * dpr)
      const ch = Math.round(h * dpr)
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
        refreshStars()
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      drawStars(ctx, w, h, now)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [on])

  if (!on) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
