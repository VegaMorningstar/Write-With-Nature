/**
 * The render button on the compose card.
 *
 * Every prop is optional — with none passed it runs the tuned defaults from
 * constants.ts, which is how App.jsx uses it. The tune page at ?tune passes all
 * of them from sliders instead. They are read through refs rather than baked
 * into the effect deps, so retuning is a uniform write and never tears down the
 * WebGPU device, which is far too expensive to rebuild on a slider drag.
 *
 * WebGPU is Chrome and Edge only, so this renders a plain .render-btn wherever
 * navigator.gpu is missing. GPU init is deferred to requestIdleCallback so a
 * button can never delay first paint.
 */
import { useRef, useEffect } from 'react'

const gpuSupported = typeof navigator !== 'undefined' && !!navigator.gpu

// Yellow-green: green leads, red follows well behind it, blue near zero. The
// shader absorbs (1 - colour), so the low blue is what pulls the body warm.
const JELLY_COLOR = [0.55, 0.83, 0.14]

// How long the jelly is left to wobble before the page moves to the collage.
// TypeGPU's spring tuning settles in ~0.8s, so anything much longer is dead air.
const JIGGLE_MS = 1100

// Pointer-response tuning. Exported so the tune page can drive it live â€” pass a
// partial `hover` prop and anything missing falls back to these.
export const HOVER_DEFAULTS = {
  // How far from the canvas the jelly still reacts, in CSS pixels
  radius: 510,
  // Ceiling on the hover impulse, as a fraction of a full nudge
  strength: 1.15,
  // Pointer travel in pixels that produces a full-scale impulse. Lower is
  // twitchier; this is the sensitivity dial.
  sensitivity: 45,
  // Impulse into the rocking spring, from horizontal travel
  rockGain: 1.8,
  // Impulse into the squash springs, from total travel
  squashGain: 0.9,
  // Long enough that a fast sweep does not stack impulses, short enough that the
  // wobble stays continuous while the pointer is moving
  throttleMs: 70,
  // One-off kick when the cursor crosses onto the canvas
  enterImpulse: 0.18,
}

export default function JellyWireframeButton({
  onClick,
  color = JELLY_COLOR,
  label = 'RENDER',
  hover,
  springs,
  material,
  camera,
  light,
  impulses,
  quality,
  jiggleMs = JIGGLE_MS,
}) {
  const canvasRef  = useRef(null)
  const sceneRef   = useRef(null)
  const cleanupRef = useRef(null)
  const timersRef  = useRef([])

  // Read through refs so the tune page can retune live without tearing down the
  // WebGPU scene, which is expensive to rebuild.
  const hoverRef   = useRef({ ...HOVER_DEFAULTS })
  const springsRef = useRef(springs)

  useEffect(() => {
    hoverRef.current = { ...HOVER_DEFAULTS, ...hover }
  }, [hover])

  useEffect(() => {
    springsRef.current = springs
    if (springs) sceneRef.current?.switchBehavior.setSpringProperties(springs)
  }, [springs])

  // Everything the scene exposes as a live setter, applied the same way: kept in
  // a ref so init can replay it, and pushed straight through on change.
  const materialRef = useRef(material)
  useEffect(() => {
    materialRef.current = material
    if (material && sceneRef.current) sceneRef.current.material = material
  }, [material])

  const cameraRef = useRef(camera)
  useEffect(() => {
    cameraRef.current = camera
    if (camera && sceneRef.current) sceneRef.current.camera = camera
  }, [camera])

  const lightRef = useRef(light)
  useEffect(() => {
    lightRef.current = light
    if (light && sceneRef.current) sceneRef.current.light = light
  }, [light])

  const impulsesRef = useRef(impulses)
  useEffect(() => {
    impulsesRef.current = impulses
    if (impulses) sceneRef.current?.switchBehavior.setImpulses(impulses)
  }, [impulses])

  const qualityRef = useRef(quality)
  useEffect(() => {
    qualityRef.current = quality
    if (quality && sceneRef.current) sceneRef.current.qualityScale = quality
  }, [quality])

  const jiggleMsRef = useRef(jiggleMs)
  useEffect(() => { jiggleMsRef.current = jiggleMs }, [jiggleMs])

  // Pointer proximity: the blob stirs as the cursor comes near, not only once it
  // is over the canvas, so it reads as aware of the pointer before you arrive.
  useEffect(() => {
    if (!gpuSupported) return

    let lastX = null
    let lastY = null
    let lastAt = 0

    const onPointerMove = e => {
      const scene = sceneRef.current
      const canvas = canvasRef.current
      if (!scene || !canvas) return
      const h = hoverRef.current

      // Throttle before measuring, so a fast sweep neither stacks impulses nor
      // forces a layout read on every single move event.
      const now = performance.now()
      if (now - lastAt < h.throttleMs) return
      lastAt = now

      const rect = canvas.getBoundingClientRect()
      // Distance from the pointer to the canvas rect â€” zero anywhere inside it
      const gapX = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right)
      const gapY = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom)
      const distance = Math.hypot(gapX, gapY)

      const dx = lastX === null ? 0 : e.clientX - lastX
      const dy = lastY === null ? 0 : e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      if (distance > h.radius) return

      // Squared falloff: barely a stir at the edge of the radius, a real jostle
      // once the cursor is over the blob.
      const proximity = 1 - distance / h.radius
      scene.switchBehavior.nudge(dx, dy, {
        strength: proximity * proximity * h.strength,
        sensitivity: h.sensitivity,
        rockGain: h.rockGain,
        squashGain: h.squashGain,
      })
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

        if (springsRef.current) scene.switchBehavior.setSpringProperties(springsRef.current)
        if (impulsesRef.current) scene.switchBehavior.setImpulses(impulsesRef.current)
        if (materialRef.current) scene.material = materialRef.current
        if (cameraRef.current) scene.camera = cameraRef.current
        if (lightRef.current) scene.light = lightRef.current
        if (qualityRef.current) scene.qualityScale = qualityRef.current

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
    timersRef.current = [setTimeout(() => onClick?.(), jiggleMsRef.current)]
  }

  if (!gpuSupported) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button className="render-btn" onClick={onClick}>
          Render<small>âŒ˜ â†µ</small>
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
        onMouseEnter={() => sceneRef.current?.switchBehavior.jiggle(hoverRef.current.enterImpulse)}
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
        âŒ˜ â†µ
      </span>
    </div>
  )
}

