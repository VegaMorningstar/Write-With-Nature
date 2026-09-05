/**
 * Liquid glass as the surface of an existing panel.
 *
 * Drops a canvas inside the panel, behind its content, running the same shader
 * the workbench uses. The panel keeps its own text and layout untouched — this
 * only replaces what the surface looks like, so the CSS backdrop-filter on that
 * panel should be turned off or the two will stack.
 *
 * `fill` derives the lens size from the panel itself rather than taking it from
 * the params: the visible lens is the SDF box inflated by Edge End, so to have
 * it reach the panel's own edges the box has to be inset by that much first.
 * Corner radius is read off the element so the glass follows the panel's shape.
 *
 * It still refracts only the reconstructed page background, not the DOM — so
 * text inside the panel sits on the glass rather than being bent by it.
 */
import { useRef, useEffect } from 'react'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

export default function LiquidGlassPanel({ params, fill = true, backdropScale = 0.5 }) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const cleanupRef = useRef(null)
  const paramsRef = useRef(params)
  const fillRef = useRef(fill)

  useEffect(() => { fillRef.current = fill }, [fill])

  /**
   * Lens sized to the panel.
   *
   * The scene's shape space is isotropic and measured in canvas heights, so the
   * panel is 1 tall and `aspect` wide. The box is inset by `end` on both axes,
   * because the shader inflates it by that much to make the visible shape — and
   * the corner radius converts straight from pixels, which is what lines the
   * glass up with the panel's own rounding instead of an ellipse.
   */
  const resolveParams = (p, el) => {
    if (!fillRef.current || !el) return p
    const rect = el.getBoundingClientRect()
    if (!rect.width || !rect.height) return p

    const aspect = rect.width / rect.height
    const radiusPx = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0

    const halfW = Math.max(0.01, 0.5 * aspect - p.end)
    const halfH = Math.max(0.01, 0.5 - p.end)

    return {
      ...p,
      centerX: 0.5,
      centerY: 0.5,
      rectW: halfW,
      rectH: halfH,
      // Also in canvas heights, and never larger than the box it rounds
      radius: Math.max(0, Math.min(radiusPx / rect.height, halfW, halfH)),
    }
  }

  useEffect(() => {
    paramsRef.current = params
    const scene = sceneRef.current
    const canvas = canvasRef.current
    if (params && scene && canvas) scene.setParams(resolveParams(params, canvas.parentElement))
  }, [params, fill])

  useEffect(() => {
    if (!gpuSupported) return
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!canvas || !host) return

    let cancelled = false
    let backdrop = null
    let ro = null

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupOverlay } = await import('./overlay.ts')
        const { getSharedBackdrop } = await import('./backdrop.js')
        if (cancelled) return

        // Shared: every panel refracts the same page, and repainting the whole
        // viewport once per panel per frame is three times the work for one
        // result. The shared one repaints at most once a frame.
        backdrop = getSharedBackdrop({ scale: backdropScale })

        const sync = scene => {
          const rect = host.getBoundingClientRect()
          if (!rect.width || !rect.height) return
          const dpr = Math.min(window.devicePixelRatio || 1, 2)
          canvas.width = Math.max(2, Math.round(rect.width * dpr))
          canvas.height = Math.max(2, Math.round(rect.height * dpr))

          scene?.setShapeScale(rect.width, rect.height)

          const vw = window.innerWidth
          const vh = window.innerHeight
          backdrop.resize(vw, vh)
          scene?.setViewportRect(
            { x: rect.left, y: rect.top, w: rect.width, h: rect.height }, vw, vh,
          )
        }
        sync(null)
        backdrop.update()

        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupOverlay(root, context, backdrop.canvas)
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        // The panel moves with scroll and resizes with the layout, so its slice
        // of the backdrop is recomputed every frame rather than on an event.
        scene.beforeFrame = () => { backdrop.update(); sync(scene) }
        sync(scene)
        if (paramsRef.current) scene.setParams(resolveParams(paramsRef.current, host))

        sceneRef.current = scene
        cleanupRef.current = () => { scene.onCleanup(); root.destroy() }

        ro = new ResizeObserver(() => {
          sync(sceneRef.current)
          if (paramsRef.current && sceneRef.current) {
            sceneRef.current.setParams(resolveParams(paramsRef.current, host))
          }
        })
        ro.observe(host)
      } catch (e) {
        console.warn('[LiquidGlassPanel] init failed:', e)
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
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        borderRadius: 'inherit', pointerEvents: 'none',
        // Negative, so in-flow content paints above it without needing a
        // positioned wrapper — a wrapper would break the flex layout these
        // panels use. Safe because each panel sets `isolation: isolate`, so the
        // canvas cannot fall behind the page itself.
        zIndex: -1,
      }}
    />
  )
}
