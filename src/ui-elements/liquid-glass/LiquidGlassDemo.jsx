/**
 * TypeGPU's liquid-glass example running in this app, unchanged.
 *
 * Their demo is a photograph with a glass lozenge that follows the cursor, so
 * that is what this is — only the photo is one of ours instead of their plums.
 * Move the pointer over it; click to pin the lozenge in place.
 *
 * This exists to judge the effect itself. It is not yet wired to the compose,
 * board or colophon panels, and that is a genuinely different problem: a shader
 * needs its backdrop as a texture, and those panels have live DOM behind them.
 */
import { useRef, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL
const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

export default function LiquidGlassDemo({
  params,
  image = `${BASE}images/A/a-1-FarmIsland-Maine.webp`,
  width = 900,
  height = 520,
}) {
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

    async function init() {
      try {
        const { tgpu } = await import('typegpu')
        const { setupLiquidGlass } = await import('./scene.ts')

        const response = await fetch(image)
        if (!response.ok) throw new Error(`image ${response.status}`)
        const bitmap = await createImageBitmap(await response.blob())
        if (cancelled) return

        const root = await tgpu.init()
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene = await setupLiquidGlass(root, context, bitmap)
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        if (paramsRef.current) scene.setParams(paramsRef.current)

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
  }, [image])

  // They listen on window, so the lozenge keeps tracking past the canvas edge
  useEffect(() => {
    const onMove = e => sceneRef.current?.updatePosition(e.clientX, e.clientY)
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

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
      onClick={e => sceneRef.current?.toggleFixed(e.clientX, e.clientY)}
      style={{
        width: '100%', height: 'auto', display: 'block',
        aspectRatio: `${width} / ${height}`,
        borderRadius: 10, cursor: 'crosshair',
      }}
    />
  )
}
