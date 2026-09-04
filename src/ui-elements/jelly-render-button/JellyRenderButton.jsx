import { useRef, useEffect } from 'react'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

// Yellow-green: green leads, red follows well behind it, blue near zero. The
// shader absorbs (1 - colour), so the low blue is what pulls the body warm.
const JELLY_COLOR = [0.55, 0.83, 0.14]

// How long the jelly is left to wobble before the page moves to the collage.
// TypeGPU's spring tuning settles in ~0.8s, so anything much longer is dead air.
const JIGGLE_MS = 1100

// How far from the canvas the jelly still reacts to the pointer, in CSS pixels
const HOVER_RADIUS = 220
// Ceiling on the hover impulse, as a fraction of a full nudge
const HOVER_STRENGTH = 0.55
// Long enough that a fast sweep does not stack impulses, short enough that the
// wobble stays continuous while the pointer is moving
const HOVER_THROTTLE_MS = 70

export default function JellyRenderButton({ onClick, color = JELLY_COLOR, label = 'RENDER' }) {
  const canvasRef  = useRef(null)
  const sceneRef   = useRef(null)
  const cleanupRef = useRef(null)
  const timersRef  = useRef([])

  // Pointer proximity: the blob stirs as the cursor comes near, not only once it
  // is over the canvas, so it reads as aware of the pointer before you arrive.
  useEffect(() => {
    if (!gpuSupported) return

    let lastX = null
    let lastAt = 0

    const onPointerMove = e => {
      const scene = sceneRef.current
      const canvas = canvasRef.current
      if (!scene || !canvas) return

      // Throttle before measuring, so a fast sweep neither stacks impulses nor
      // forces a layout read on every single move event.
      const now = performance.now()
      if (now - lastAt < HOVER_THROTTLE_MS) return
      lastAt = now

      const rect = canvas.getBoundingClientRect()
      // Distance from the pointer to the canvas rect — zero anywhere inside it
      const gapX = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right)
      const gapY = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom)
      const distance = Math.hypot(gapX, gapY)

      const travelled = lastX === null ? 0 : e.clientX - lastX
      lastX = e.clientX

      if (distance > HOVER_RADIUS) return

      // Squared falloff: barely a stir at the edge of the radius, a real jostle
      // once the cursor is over the blob.
      const proximity = 1 - distance / HOVER_RADIUS
      scene.switchBehavior.nudge(travelled, proximity * proximity * HOVER_STRENGTH)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [])

  // Releasing outside the canvas must still clear the press, or the anticipation
  // impulse keeps charging every frame and the blob stays squashed.
  useEffect(() => {
    const releasePress = () => {
      if (sceneRef.current) sceneRef.current.switchBehavior.pressed = false
    }
    window.addEventListener('mouseup', releasePress)
    window.addEventListener('touchend', releasePress)
    window.addEventListener('blur', releasePress)
    return () => {
      window.removeEventListener('mouseup', releasePress)
      window.removeEventListener('touchend', releasePress)
      window.removeEventListener('blur', releasePress)
    }
  }, [])

  useEffect(() => {
    if (!gpuSupported) return
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false

    async function init() {
      try {
        const { tgpu, d }    = await import('typegpu')
        const { setupScene } = await import('./scene.ts')
        if (cancelled) return

        const root    = await tgpu.init({ device: { optionalFeatures: ['timestamp-query'] } })
        const context = root.configureContext({ canvas, alphaMode: 'premultiplied' })
        const scene   = await setupScene(root, context, { label })
        if (cancelled) { scene.onCleanup(); root.destroy(); return }

        scene.jellyColor = d.vec4f(color[0], color[1], color[2], 1.0)
        scene.darkMode   = false

        sceneRef.current   = scene
        cleanupRef.current = () => { scene.onCleanup(); root.destroy() }
      } catch (e) {
        console.warn('[JellySwitch] WebGPU init failed:', e)
      }
    }

    // Defer GPU init until the browser is idle so it never blocks page load
    let handle
    if (typeof requestIdleCallback !== 'undefined') {
      handle = requestIdleCallback(() => { if (!cancelled) init() }, { timeout: 3000 })
    } else {
      handle = setTimeout(() => { if (!cancelled) init() }, 200)
    }

    return () => {
      cancelled = true
      if (typeof requestIdleCallback !== 'undefined') cancelIdleCallback(handle)
      else clearTimeout(handle)
      timersRef.current.forEach(clearTimeout)
      timersRef.current = []
      cleanupRef.current?.()
      cleanupRef.current = null
      sceneRef.current   = null
    }
  }, []) // eslint-disable-line

  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  function press() {
    if (!sceneRef.current) return
    clearTimers()
    sceneRef.current.switchBehavior.pressed = true
  }

  function release(triggerClick) {
    const scene = sceneRef.current
    if (scene) {
      scene.switchBehavior.pressed = false
      // The springs carry the whole response and return to rest on their own,
      // so there is nothing to reset afterwards.
      scene.switchBehavior.jiggle()
    }
    if (!triggerClick) return

    clearTimers()
    timersRef.current = [setTimeout(() => onClick?.(), JIGGLE_MS)]
  }

  if (!gpuSupported) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button className="render-btn" onClick={onClick}>
          Render<small>⌘ ↵</small>
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <canvas
        ref={canvasRef}
        width={480}
        height={220}
        onMouseDown={press}
        onMouseUp={() => release(true)}
        onMouseEnter={() => sceneRef.current?.switchBehavior.jiggle(0.18)}
        onMouseLeave={() => {
          if (sceneRef.current) sceneRef.current.switchBehavior.pressed = false
        }}
        onTouchStart={e => { e.preventDefault(); press() }}
        onTouchEnd={e => { e.preventDefault(); release(true) }}
        style={{
          cursor: 'pointer',
          borderRadius: 16,
          display: 'block',
          width: '100%',
          maxWidth: 480,
          height: 'auto',
          aspectRatio: '480 / 220',
          background: 'transparent',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      />
      {/* The word itself lives in the scene now, under the jelly */}
      <span style={{
        fontSize: '0.66rem',
        letterSpacing: '0.14em',
        opacity: 0.35,
        userSelect: 'none',
      }}>
        ⌘ ↵
      </span>
    </div>
  )
}
