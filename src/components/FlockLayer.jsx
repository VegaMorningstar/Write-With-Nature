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
import { BRICK_VIEW } from '../lib/brickView'

const DEPTH = 2.4 // how deep the airspace is, in panel heights
const HEIGHT = 1.0

/**
 * How long a bird is on screen, in CSS pixels.
 *
 * In pixels rather than in world units, and that is the whole point. The
 * field is built in units where the camera's vertical span is fixed, so a
 * size given in those units is a fraction of the panel's HEIGHT — the birds
 * were about 13px over the board and about 36px with the board full screen,
 * nearly three times the size, which is what made them crowd the collage
 * there. Deriving the world size from a pixel size each time the panel is laid
 * out keeps them the same bird at any panel size.
 */
const BIRD_PX = 13
/** Bounds on the derived world size, so an extreme panel cannot produce an
 *  extreme bird. */
const BIRD_MIN = 0.02
const BIRD_MAX = 0.14

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
    let builtSize = 0.075

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

      // World units per panel height, which is what the camera below frames.
      // BIRD_PX divided by the panel's pixel height gives the fraction of the
      // panel a bird should occupy; multiplying by the span converts that
      // fraction into the units the field is built in.
      const span = next / aspect
      const size = Math.min(BIRD_MAX, Math.max(BIRD_MIN, (BIRD_PX / h) * span))

      // Rebuilt when the shape changes, and now also when the size does. Going
      // full screen can leave the aspect close enough to slip under the first
      // test while the height has more than doubled, which would keep the old,
      // too-large birds.
      const reshaped = Math.abs(next - width) > 0.15
      const resized = Math.abs(size - builtSize) > builtSize * 0.1
      if (!field || reshaped || resized) {
        width = next
        builtSize = size
        if (field) {
          scene.remove(field)
          field.traverse(o => {
            if (o.material) [].concat(o.material).forEach(m => m.dispose())
          })
        }
        field = makeFlocks(
          { x0: 0, x1: width, y0: 0, y1: HEIGHT, z0: -DEPTH / 2, z1: DEPTH / 2 },
          { flocks: count, size, speed: 0.5, seed: 20260923 }
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
