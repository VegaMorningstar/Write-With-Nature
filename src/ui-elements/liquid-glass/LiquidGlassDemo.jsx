/**
 * TypeGPU's liquid-glass example running in this app, shader untouched.
 *
 * Three things can sit behind it, which is the useful part:
 *
 *   'image' — their demo: a photograph. Refraction is obvious because a photo
 *             is full of detail to bend.
 *   'page'  — no photo. The page's own background, rebuilt into a canvas every
 *             frame from the index.css gradients and the fluid cursor, so the
 *             glass refracts what is actually on screen.
 *   'none'  — nothing at all. Worth looking at once: the shader samples a
 *             texture, so with an empty one there is nothing to refract and the
 *             lens shows only its tint. That is not a bug, it is the constraint
 *             the whole exercise runs into.
 *
 * The lens is static by default. `follow` puts it back on the cursor.
 */
import { useRef, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL
const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

export default function LiquidGlassDemo({
  params,
  mode = 'page',
  follow = false,
  image = `${BASE}images/A/a-1-FarmIsland-Maine.webp`,
  width = 900,
  height = 520,
}) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const cleanupRef = useRef(null)
  const paramsRef = useRef(params)
  const followRef = useRef(follow)

  useEffect(() => { followRef.current = follow }, [follow])

  useEffect(() => {
    paramsRef.current = params
    if (!params || !sceneRef.current) return
    sceneRef.current.setParams(params)
    // The overlay build takes the centre through setParams; the verbatim one
    // keeps it in the mouse uniform and needs telling separately.
    if (!followRef.current) sceneRef.current.setCenter?.(params.centerX, params.centerY)
  }, [params, follow])

  useEffect(() => {
    if (!gpuSupported) return
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let backdrop = null

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupLiquidGlass } = await import('./scene.ts')

        // 'page' uses the overlay build of the shader, whose only difference is
        // that the outside weight becomes transparency. Their version returns
        // the untouched background there, which against a photo is right and
        // over a page paints an opaque rectangle across it — which is exactly
        // what the washed-out slab was.
        if (mode === 'page') {
          const { setupOverlay } = await import('./overlay.ts')
          const { createBackdrop } = await import('./backdrop.js')

          backdrop = createBackdrop({ scale: 0.5 })
          const syncRect = scene => {
            const vw = window.innerWidth
            const vh = window.innerHeight
            backdrop.resize(vw, vh)
            scene?.resizeBackdrop(backdrop.width, backdrop.height)
            const r = canvas.getBoundingClientRect()
            scene?.setViewportRect({ x: r.left, y: r.top, w: r.width, h: r.height }, vw, vh)
          }
          syncRect(null)
          backdrop.update()
          if (cancelled) return

          const root = await tgpu.init()
          const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
          const scene = await setupOverlay(root, context, backdrop.canvas)
          if (cancelled) { scene.onCleanup(); root.destroy(); return }

          // The canvas scrolls with the page, so its slice of the backdrop has
          // to be recomputed every frame, not just on resize.
          scene.beforeFrame = () => { backdrop.update(); syncRect(scene) }
          syncRect(scene)

          if (paramsRef.current) scene.setParams(paramsRef.current)
          sceneRef.current = scene
          cleanupRef.current = () => { scene.onCleanup(); root.destroy() }
          return
        }

        let source
        const animated = false
        const beforeFrame = undefined

        if (mode === 'image') {
          const response = await fetch(image)
          if (!response.ok) throw new Error(`image ${response.status}`)
          source = await createImageBitmap(await response.blob())
        } else {
          // Deliberately empty — a texture with nothing in it
          const blank = document.createElement('canvas')
          blank.width = 64
          blank.height = 64
          source = blank
        }
        if (cancelled) return

        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupLiquidGlass(root, context, source, { animated, beforeFrame })
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        if (paramsRef.current) {
          scene.setParams(paramsRef.current)
          if (!followRef.current) {
            scene.setCenter?.(paramsRef.current.centerX, paramsRef.current.centerY)
          }
        }

        sceneRef.current = scene
        cleanupRef.current = () => { scene.onCleanup(); root.destroy() }
      } catch (e) {
        console.warn('[LiquidGlass] init failed:', e)
      }
    }

    init()

    return () => {
      cancelled = true
      cleanupRef.current?.()
      cleanupRef.current = null
      sceneRef.current = null
    }
  }, [mode, image, width, height])

  useEffect(() => {
    if (!follow) return
    const onMove = e => sceneRef.current?.updatePosition(e.clientX, e.clientY)
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [follow])

  if (!gpuSupported) {
    return (
      <div style={{
        width: '100%', aspectRatio: `${width} / ${height}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px dashed rgba(0,0,0,0.2)', borderRadius: 10,
        fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'rgba(0,0,0,0.4)',
      }}>
        WebGPU required — open in Chrome or Edge
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onClick={e => follow && sceneRef.current?.toggleFixed?.(e.clientX, e.clientY)}
      style={{
        width: '100%', height: 'auto', display: 'block',
        aspectRatio: `${width} / ${height}`,
        borderRadius: 10,
        cursor: follow ? 'crosshair' : 'default',
        // Transparent without a photo, so the page shows through
        background: 'transparent',
      }}
    />
  )
}
