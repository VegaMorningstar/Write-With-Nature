/**
 * flocks — migrating flamingos, over whatever you put them over.
 *
 * The flocks do not wander. Each holds a skein, keeps one heading for the
 * whole crossing, and re-enters upwind when it leaves, the way a flyway works.
 * The wingbeat is phase-shifted down the formation so it ripples back from the
 * leader, which is what a flock of big birds actually looks like.
 *
 * Bounds are passed in rather than derived, so the same field can fly over a
 * single word, over a whole collage panel, or over nothing at all. Nothing
 * here reads scene lights: the birds are flat colour, to sit on a page whose
 * lighting is baked into its images.
 *
 *   const field = makeFlocks({ x0, x1, y0, y1, z0, z1 })
 *   scene.add(field)
 *   field.userData.update(dt)   // each frame
 */

import * as THREE from 'three'

export const FLOCK_DEFAULTS = {
  flocks: 3,
  flockMin: 6,
  flockMax: 12,
  size: 0.085, // bird length, in the same units as the bounds
  speed: 0.42, // units per second
  migration: 0.12, // heading of the flyway, radians from +x
  spread: 0.22, // how far each flock may differ from that heading
  margin: 1.2, // how far past the wall a skein flies before it is put back
}

/* ── the bird ─────────────────────────────────────────────────────────────
   A long neck out front and legs trailing behind: the flamingo silhouette is
   a cross, not a dart, and at this size the outline is all of it. Colours are
   per-vertex so the flight feathers can be dark without a second material. */
const CORAL = [1.0, 0.46, 0.56]
const DEEP = [0.85, 0.24, 0.38]
const TIP = [0.29, 0.13, 0.22]

let geometry = null
function birdGeometry() {
  if (geometry) return geometry

  const body = new THREE.BufferGeometry()
  body.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [1.45, 0, 0, -1.25, 0, 0, 0.1, 0, 0.13, 0.1, 0, -0.13],
      3
    )
  )
  body.setAttribute(
    'color',
    new THREE.Float32BufferAttribute([...CORAL, ...DEEP, ...CORAL, ...CORAL], 3)
  )
  body.setIndex([0, 2, 1, 0, 1, 3])

  const wing = new THREE.BufferGeometry()
  wing.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 0, 0, -0.75, 0, 1.15, 0.3, 0, 0.2], 3)
  )
  wing.setAttribute(
    'color',
    new THREE.Float32BufferAttribute([...CORAL, ...TIP, ...DEEP], 3)
  )

  geometry = { body, wing }
  return geometry
}

function makeBird(size) {
  const { body, wing } = birdGeometry()
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
  })

  const bird = new THREE.Group()
  bird.add(new THREE.Mesh(body, material))
  const left = new THREE.Mesh(wing, material)
  const right = new THREE.Mesh(wing, material)
  right.scale.z = -1
  bird.add(left, right)
  bird.scale.setScalar(size)
  bird.userData.wings = [left, right]
  return bird
}

/** One skein: a trailing V, tight enough to read as a single formation. */
function makeFlock(rnd, o) {
  const group = new THREE.Group()
  const n = o.flockMin + Math.floor(rnd() * (o.flockMax - o.flockMin + 1))
  const size = o.size * (0.85 + rnd() * 0.35)

  // In bird lengths, and deliberately small. Spaced any wider, the tail of a
  // twelve-bird skein ends up further back than the space it is flying over,
  // and one formation reads as a dozen scattered singles.
  const gapAlong = size * 3.1
  const gapSide = size * 2.3

  const birds = []
  for (let i = 0; i < n; i++) {
    const bird = makeBird(size * (0.9 + rnd() * 0.2))
    const rank = Math.floor((i + 1) / 2)
    const side = i === 0 ? 0 : i % 2 === 1 ? 1 : -1
    bird.position.set(
      -rank * gapAlong * (0.85 + rnd() * 0.3),
      (rnd() - 0.5) * size * 0.8,
      side * rank * gapSide * (0.85 + rnd() * 0.3)
    )
    bird.userData.phase = -rank * 0.5 + rnd() * 0.15
    group.add(bird)
    birds.push(bird)
  }

  group.userData = {
    birds,
    beat: rnd() * Math.PI * 2,
    beatRate: 5.5 + rnd() * 2.5,
    speed: o.speed * (0.85 + rnd() * 0.3),
    bob: rnd() * Math.PI * 2,
  }
  return group
}

/**
 * Build a flock field inside the given box.
 *
 * @param {{x0:number,x1:number,y0:number,y1:number,z0:number,z1:number}} bounds
 * @param {object} [opts] overrides for FLOCK_DEFAULTS, plus `seed`
 * @returns {THREE.Group} with `update(dt)` on userData
 */
export function makeFlocks(bounds, opts = {}) {
  const o = { ...FLOCK_DEFAULTS, ...opts }
  const { x0, x1, y0, y1, z0, z1 } = bounds
  const group = new THREE.Group()

  // Deterministic, so redrawing the same scene does not reshuffle the sky
  // under you while a slider is moving.
  let seed = (opts.seed ?? Math.round((x1 - x0) * 9973)) >>> 0
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  const spanX = Math.max(1e-3, x1 - x0)
  const spanZ = Math.max(1e-3, z1 - z0)

  /** Put a skein back at the upwind edge, on a fresh line. */
  const place = (flock, spreadAlongX) => {
    const d = flock.userData
    d.heading = o.migration + (rnd() - 0.5) * o.spread
    flock.rotation.y = -d.heading
    flock.position.set(
      x0 - o.margin + (spanX + o.margin * 2) * (spreadAlongX ? rnd() : 0),
      y0 + rnd() * Math.max(0.01, y1 - y0),
      z0 + rnd() * spanZ
    )
  }

  const flocks = []
  for (let i = 0; i < o.flocks; i++) {
    const flock = makeFlock(rnd, o)
    place(flock, true)
    group.add(flock)
    flocks.push(flock)
  }

  let t = 0
  group.userData.bounds = bounds
  group.userData.update = dt => {
    t += dt
    for (const flock of flocks) {
      const d = flock.userData
      const step = d.speed * dt
      flock.position.x += Math.cos(d.heading) * step
      flock.position.z += Math.sin(d.heading) * step
      flock.position.y += Math.sin(t * 0.5 + d.bob) * 0.0025

      // Clear of the wall by a whole formation length before it is moved, so
      // nobody ever sees a skein blink out mid-air.
      if (flock.position.x > x1 + o.margin) place(flock, false)
      if (flock.position.z < z0 - o.margin) flock.position.z = z1 + o.margin
      if (flock.position.z > z1 + o.margin) flock.position.z = z0 - o.margin

      d.beat += d.beatRate * dt
      for (const bird of d.birds) {
        const flap = Math.sin(d.beat + bird.userData.phase) * 0.8
        bird.userData.wings[0].rotation.x = flap
        bird.userData.wings[1].rotation.x = -flap
      }
    }
  }

  return group
}
