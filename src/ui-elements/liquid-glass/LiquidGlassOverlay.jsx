/**
 * A fixed, full-viewport canvas carrying the liquid glass lens.
 *
 * The lens stays put; the fluid cursor keeps moving underneath it, and the
 * backdrop texture is rebuilt every frame so the refraction tracks it.
 *
 * On z-index: `.page` in index.css is `z-index: 20`, so anything below that is
 * painted under the whole page — which is where this sat at first, and most of
 * why it could not be seen. 30 puts it over page content; `under` drops it to
 * 8, beneath the panels, where it refracts background only.
 *
 * Worth knowing either way: a lens over a smooth gradient is very nearly
 * invisible, because a blurred, displaced copy of a smooth gradient is the same
 * smooth gradient. The fluid cursor trails are the only high-frequency thing in
 * the backdrop, so they are what the refraction actually has to show.
 */
import { useRef, useEffect } from 'react'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

export default function LiquidGlassOverlay({ params, under = false, backdropScale = 0.5 }) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const cleanupRef = useRef(null)
  const paramsRef = useRef(params)

  useEffect(() => {
    paramsRef.current = params
    if (params && sceneRef.current) sceneRef.current.setParams(params)
  }, [params])

  useEffect(() => {
    if (!gpuSupported) return
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let backdrop = null
    let ro = null

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupOverlay } = await import('./overlay.ts')
        const { createBackdrop } = await import('./backdrop.js')
        if (cancelled) return

        backdrop = createBackdrop({ scale: backdropScale })

        const fit = () => {
          const w = window.innerWidth
          const h = window.innerHeight
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
          backdrop.resize(w, h)
          sceneRef.current?.resizeBackdrop(backdrop.width, backdrop.height)
        }
        fit()

        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupOverlay(root, context, backdrop.canvas)
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        scene.beforeFrame = () => backdrop.update()
        if (paramsRef.current) scene.setParams(paramsRef.current)

        sceneRef.current = scene
        cleanupRef.current = () => { scene.onCleanup(); root.destroy() }

        ro = new ResizeObserver(fit)
        ro.observe(document.documentElement)
      } catch (e) {
        console.warn('[LiquidGlassOverlay] init failed:', e)
      }
    }

    init()

    return () => {
      cancelled = true
      ro?.disconnect()
      cleanupRef.current?.()
      cleanupRef.current = null
      sceneRef.current = null
    }
  }, [backdropScale])

  if (!gpuSupported) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        // 30 clears .page's z-index: 20; 8 puts it back under the panels
        zIndex: under ? 8 : 30,
      }}
    />
  )
}
