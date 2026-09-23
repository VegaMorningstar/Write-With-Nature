/**
 * word-volume — the airspace over a row of Landsat blocks.
 *
 * Laid side by side, the letter blocks occupy one larger cuboid. This treats
 * that cuboid as a thing in its own right: it takes the row's bounding box,
 * raises a ceiling over it, and puts weather in the space.
 *
 * What lives in it: migrating flocks, which do not wander — they hold a skein,
 * keep one heading across the whole word, and re-enter upwind when they leave,
 * the way a flyway works. Cumulus is built and ready but switched off (see
 * `clouds` below); nothing is created while the count is zero.
 *
 * Everything here is unlit by the scene: the blocks shade themselves, and
 * anything responding to the shadow-casting light would not match them.
 */

import * as THREE from 'three'
import { makeFlocks } from './flocks'

// The same direction the blocks are lit from, so the clouds agree with them.
const SUN = new THREE.Vector3(0.62, 1.0, -0.42).normalize()

const DEFAULTS = {
  sky: 1.4, // ceiling above the highest ground, in block widths
  cloudFloor: 0.72, // lowest a cloud base may sit above that ground
  clouds: 0, // off for now — set a count to bring the cumulus back
  cloudScale: 0.62,
  wind: 0.05, // cloud drift, block widths per second

  flocks: 3,
  flockMin: 6,
  flockMax: 12,
  birdSize: 0.085,
  birdSpeed: 0.42,
  migration: 0.12, // heading of the flyway, radians about +x
  spread: 0.22, // how much each flock may differ from it
  flyLow: 0.3, // lowest a flock may fly above the ground
}

/* ── cloud puffs ──────────────────────────────────────────────────────────
   A radial gradient makes a perfectly round blob, and a cloud built from
   round blobs reads as a cartoon. These are radial falloff roughened by a
   couple of octaves of value noise, so every puff has a ragged edge, and four
   of them are baked so neighbouring puffs are not identical. */
function noiseField(seed) {
  const g = new Uint8Array(256)
  let s = seed
  for (let i = 0; i < 256; i++) {
    s = (s * 1664525 + 1013904223) % 4294967296
    g[i] = s >>> 24
  }
  const at = (x, y) => g[(x & 15) + ((y & 15) << 4)] / 255
  const smooth = t => t * t * (3 - 2 * t)
  return (x, y) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const fx = smooth(x - xi)
    const fy = smooth(y - yi)
    const a = at(xi, yi)
    const b = at(xi + 1, yi)
    const c = at(xi, yi + 1)
    const d = at(xi + 1, yi + 1)
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
  }
}

function puffTexture(seed) {
  const S = 96
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')
  const img = ctx.createImageData(S, S)
  const n = noiseField(seed)

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S - 0.5
      const v = (y + 0.5) / S - 0.5
      const r = Math.hypot(u, v) * 2 // 0 at centre, 1 at the inscribed edge

      let f = 0
      let amp = 0.55
      let frq = 3.4
      for (let o = 0; o < 4; o++) {
        f += n((x / S) * frq, (y / S) * frq) * amp
        amp *= 0.5
        frq *= 2.1
      }

      // Density is mostly the noise, only shaped by the radial falloff. Let
      // the falloff dominate and every puff comes out a solid round disc —
      // a sky full of bokeh rather than cloud.
      const edge = 1 - Math.min(1, Math.max(0, (r - 0.12) / 0.88))
      let a = edge * (0.42 + f * 1.2)
      a = Math.min(1, Math.max(0, (a - 0.32) * 1.75))

      const i = (y * S + x) * 4
      img.data[i] = 255
      img.data[i + 1] = 255
      img.data[i + 2] = 255
      img.data[i + 3] = Math.round(a * 255)
    }
  }
  ctx.putImageData(img, 0, 0)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

let puffTextures = null
function puffs() {
  if (!puffTextures) {
    puffTextures = [1, 2, 3, 4].map(i => puffTexture(i * 7919 + 13))
  }
  return puffTextures
}

const LIT = new THREE.Color(0xffffff)
const SHADE = new THREE.Color(0x93a7bb)

/**
 * A cumulus: a wide base of large puffs with smaller ones piled above, each
 * tinted by which way it faces the sun. Uniform white has no form; it is the
 * lit tops against the cool undersides that makes it read as a cloud.
 */
function makeCloud(rnd, scale) {
  const g = new THREE.Group()
  const tex = puffs()
  const n = 6 + Math.floor(rnd() * 5)
  const alpha = 0.88 + rnd() * 0.12

  for (let i = 0; i < n; i++) {
    // Base puffs spread wide and flat, later ones pile up and inwards, which
    // gives the flat-bottomed, billowing-topped cumulus silhouette.
    const tier = i / n
    const off = new THREE.Vector3(
      (rnd() - 0.5) * scale * (2.0 - tier * 1.1),
      tier * scale * 0.55 + (rnd() - 0.5) * scale * 0.12,
      (rnd() - 0.5) * scale * (1.1 - tier * 0.5)
    )

    const face = off.clone().normalize()
    const lit = Math.max(0, face.dot(SUN)) * 0.5 + (0.35 + tier * 0.45)
    const col = SHADE.clone().lerp(LIT, Math.min(1, lit))

    const mat = new THREE.SpriteMaterial({
      map: tex[Math.floor(rnd() * tex.length)],
      transparent: true,
      depthWrite: false,
      // Depth-tested, now that the cloud deck sits a clear margin above the
      // highest peak. A sprite is a flat quad held facing the camera, so one
      // hanging low enough to cross the terrain gets sliced along the
      // intersection and the cut shows as a hard straight edge through it.
      opacity: alpha,
      color: col,
    })

    const s = new THREE.Sprite(mat)
    const w = scale * (1.0 - tier * 0.45) * (0.75 + rnd() * 0.5)
    s.scale.set(w, w * (0.62 + rnd() * 0.2), 1)
    s.position.copy(off)
    s.renderOrder = 10 + i
    g.add(s)
  }
  return g
}

/**
 * Build the airspace over a row.
 *
 * @param {THREE.Object3D} row  the blocks, already positioned
 * @returns {THREE.Group} with `update(dt)` and `bounds` on userData
 */
export function makeWordVolume(row, opts = {}) {
  const o = { ...DEFAULTS, ...opts }
  const group = new THREE.Group()

  const box = new THREE.Box3().setFromObject(row)
  const min = box.min.clone()
  const max = box.max.clone()
  const ceiling = max.y + o.sky

  // Deterministic per-word, so re-rendering the same word does not reshuffle
  // the sky under you while you drag a slider.
  let seed = Math.round((max.x - min.x) * 9973) + 12345
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }

  const x0 = min.x
  const x1 = max.x
  const spanX = Math.max(1e-3, x1 - x0)
  const z0 = min.z
  const z1 = max.z
  const spanZ = Math.max(1e-3, z1 - z0)

  // ── clouds ──────────────────────────────────────────────────────────────
  const clouds = []
  const cloudBand = Math.max(0.05, o.sky - o.cloudFloor - 0.12)
  for (let i = 0; i < o.clouds; i++) {
    const c = makeCloud(rnd, o.cloudScale * (0.7 + rnd() * 0.75))
    c.position.set(
      x0 + rnd() * spanX,
      max.y + o.cloudFloor + rnd() * cloudBand,
      z0 + spanZ * (0.18 + rnd() * 0.64)
    )
    c.userData.drift = o.wind * (0.65 + rnd() * 0.7)
    c.userData.bob = rnd() * Math.PI * 2
    group.add(c)
    clouds.push(c)
  }

  // ── flocks ──────────────────────────────────────────────────────────────
  // The flyway is its own module: here it is given the volume's own walls, on
  // the board it is given the panel's. Nothing about a skein depends on what
  // it happens to be flying over.
  const flocks = makeFlocks(
    { x0, x1, y0: max.y + o.flyLow, y1: ceiling - 0.08, z0, z1 },
    { flocks: o.flocks, flockMin: o.flockMin, flockMax: o.flockMax,
      size: o.birdSize, speed: o.birdSpeed, migration: o.migration,
      spread: o.spread, seed }
  )
  group.add(flocks)

  let t = 0
  const wrap = (v, lo, span) => {
    let k = (v - lo) % span
    if (k < 0) k += span
    return lo + k
  }

  group.userData.bounds = { min, max, ceiling, base: max.y + o.flyLow }
  group.userData.update = dt => {
    t += dt

    for (const c of clouds) {
      c.position.x = wrap(c.position.x + c.userData.drift * dt, x0, spanX)
      c.position.y += Math.sin(t * 0.3 + c.userData.bob) * 0.0025
    }

    flocks.userData.update(dt)
  }

  return group
}
