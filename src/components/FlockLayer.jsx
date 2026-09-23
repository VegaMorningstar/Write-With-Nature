import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { makeFlocks } from '../lib/flocks'

/**
 * Flamingos over the collage panel.
 *
 * A transparent canvas laid over the board, with its own small scene: the
 * tiles are pre-rendered images, so there is no 3D space to join. The camera
 * matches the one the blocks were rendered from — the same elevation, azimuth
 * and levelling roll — so a skein crossing the panel is seen from the angle
 * the ground below it was.
 *
 * The field spans the panel rather than the word, so the birds cross the whole
 * board whatever is written on it.
 */

// The angles the bricks are baked at. Kept in step with BRICK_VIEW so the
// birds and the ground agree about where the camera is.
import { BRICK_VIEW } from '../lib/brickAssets'

const DEPTH = 2.4 // how deep the airspace is, in panel heights
const HEIGHT = 1.0

export default function FlockLayer({ count = 3, className = 'flock-layer' }) {
  const holder = useRef(null)

  useEffect(() => {
    const el = holder.current
    if (!el) return

    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%'
    el.appendChild(canvas)

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // the panel's own paper shows through
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200)

    let field = null
    let width = 1

    /**
     * Rebuild the field for the panel's current shape, and frame it.
     *
     * The field is as wide as the panel is, in units where the panel is one
     * high, so the birds keep a constant size on screen however the board is
     * resized rather than being scaled with it.
     */
    const layout = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)

      const aspect = w / h
      const next = Math.max(1, aspect * 1.6)
      if (!field || Math.abs(next - width) > 0.15) {
        width = next
        if (field) {
          scene.remove(field)
          field.traverse(o => {
            if (o.material) [].concat(o.material).forEach(m => m.dispose())
          })
        }
        field = makeFlocks(
          { x0: 0, x1: width, y0: 0, y1: HEIGHT, z0: -DEPTH / 2, z1: DEPTH / 2 },
          { flocks: count, size: 0.075, speed: 0.5, seed: 20260923 }
        )
        scene.add(field)
      }

      const az = THREE.MathUtils.degToRad(BRICK_VIEW.azimuth)
      const el3 = THREE.MathUtils.degToRad(BRICK_VIEW.elevation)
      const r = 60
      camera.position.set(
        width / 2 + r * Math.cos(el3) * Math.sin(az),
        r * Math.sin(el3),
        r * Math.cos(el3) * Math.cos(az)
      )

      // The same roll the blocks are rendered with: world +X lands flat on
      // screen, so the flyway runs level across the panel rather than downhill.
      const target = new THREE.Vector3(width / 2, HEIGHT / 2, 0)
      const fwd = target.clone().sub(camera.position).normalize()
      const along = new THREE.Vector3(1, 0, 0)
      along.addScaledVector(fwd, -along.dot(fwd)).normalize()
      const up = new THREE.Vector3().crossVectors(fwd.clone().negate(), along)
      if (up.y < 0) up.negate()
      camera.up.copy(up.normalize())
      camera.lookAt(target)

      const half = width / (2 * aspect)
      camera.left = -width / 2
      camera.right = width / 2
      camera.top = half
      camera.bottom = -half
      camera.updateProjectionMatrix()
    }

    layout()

    // Only animate while the panel is actually on screen and the tab is in
    // front. A canvas of birds nobody is looking at is pure battery.
    let raf = 0
    let last = performance.now()
    let visible = true

    const tick = now => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!visible || document.hidden || !field) return
      field.userData.update(dt)
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    const io = new IntersectionObserver(
      entries => {
        visible = entries[0]?.isIntersecting ?? true
        last = performance.now()
      },
      { threshold: 0 }
    )
    io.observe(el)

    const ro = new ResizeObserver(() => {
      layout()
      last = performance.now()
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      renderer.dispose()
      canvas.remove()
    }
  }, [count])

  return <div ref={holder} className={className} aria-hidden="true" />
}
