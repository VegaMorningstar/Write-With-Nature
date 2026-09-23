/**
 * One WebGL context for the whole board.
 *
 * A collage can be a hundred tiles, and a hundred WebGL contexts is not a
 * thing a browser will give you — they cap out somewhere near sixteen and
 * start dropping the oldest. But a brick never moves: it is built once and
 * then it is a still life. So a single offscreen renderer draws each brick in
 * turn and hands back a picture, and the tiles are ordinary <img>s.
 *
 * Renders are queued one at a time and cached by (scene url × size), so a word
 * that uses the same letter twice pays for it once.
 */

import * as THREE from 'three'
import { makeBrick } from './landsat-brick'

const AZIMUTH = 32 // degrees — the diorama three-quarter view
const ELEVATION = 46 // high enough that the letter on the top face still reads
const PAD = 1.04 // room for the contact shadow

let renderer = null
let scene = null
let camera = null
let floor = null

function init() {
  if (renderer) return

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(1) // the drawing buffer is sized in pixels here
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true

  scene = new THREE.Scene()

  // The block lights itself in its own shaders and ignores scene lights, so
  // this one only throws the contact shadow. It points the same way the
  // shaders do, or the shadow would fall against the block's own shading.
  const key = new THREE.DirectionalLight(0xffffff, 1)
  key.position.set(0.62, 1.0, -0.42).setLength(9)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  const sc = key.shadow.camera
  sc.left = -2.5
  sc.right = 2.5
  sc.top = 2.5
  sc.bottom = -2.5
  sc.near = 0.1
  sc.far = 30
  scene.add(key)

  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12).rotateX(-Math.PI / 2),
    new THREE.ShadowMaterial({ opacity: 0.18 })
  )
  floor.receiveShadow = true
  scene.add(floor)

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 60)
}

function placeCamera() {
  const az = THREE.MathUtils.degToRad(AZIMUTH)
  const el = THREE.MathUtils.degToRad(ELEVATION)
  const r = 14
  camera.position.set(
    r * Math.cos(el) * Math.sin(az),
    r * Math.sin(el),
    r * Math.cos(el) * Math.cos(az)
  )
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld(true)
}

/** What the camera actually sees of this object, in camera-space units. */
function projectedExtent(object) {
  const box = new THREE.Box3().setFromObject(object)
  const inv = camera.matrixWorldInverse
  const v = new THREE.Vector3()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (let i = 0; i < 8; i++) {
    v.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z
    ).applyMatrix4(inv)
    minX = Math.min(minX, v.x)
    maxX = Math.max(maxX, v.x)
    minY = Math.min(minY, v.y)
    maxY = Math.max(maxY, v.y)
  }
  return { minX, maxX, minY, maxY }
}

function disposeTree(object) {
  object.traverse(o => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach(m => m.dispose())
    }
  })
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`brick: could not load ${url}`))
    img.src = url
  })
}

function draw(image, size, opts) {
  init()

  const brick = makeBrick(
    Object.assign(new THREE.Texture(image), { needsUpdate: true }),
    image,
    opts
  )
  brick.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  floor.position.y = brick.userData.bottomY - 0.001
  scene.add(brick)

  // Measure first, then size the canvas to the brick — rather than fitting the
  // brick into a guessed aspect and letterboxing whatever is left over.
  placeCamera()
  const e = projectedExtent(brick)
  const halfW = ((e.maxX - e.minX) / 2) * PAD
  const halfH = ((e.maxY - e.minY) / 2) * PAD
  const cx = (e.minX + e.maxX) / 2
  const cy = (e.minY + e.maxY) / 2

  const h = size
  const w = Math.max(1, Math.round(size * (halfW / halfH)))
  renderer.setSize(w, h, false)
  camera.left = cx - halfW
  camera.right = cx + halfW
  camera.top = cy + halfH
  camera.bottom = cy - halfH
  camera.updateProjectionMatrix()

  renderer.render(scene, camera)
  const src = renderer.domElement.toDataURL('image/png')

  scene.remove(brick)
  disposeTree(brick)
  return { src, width: w, height: h, aspect: w / h }
}

const cache = new Map()
let queue = Promise.resolve()

/**
 * Render one Landsat scene as a brick.
 *
 * Resolves to `{ src, width, height, aspect }`. `src` is a data URL, not a
 * canvas element: two tiles showing the same scene share the cache entry, and
 * a shared DOM node would be moved out of the first tile into the second.
 *
 * @param {string} url   the scene
 * @param {number} size  the output height, in device pixels
 */
export function renderBrick(url, size = 320, opts = {}) {
  // The options change what is drawn, so they belong in the key — two scenes
  // sharing a URL but not a place would otherwise share one render.
  const key = `${url}@${size}@${JSON.stringify(opts)}`
  if (cache.has(key)) return cache.get(key)

  // Serialised: every call shares one renderer, so two at once would fight
  // over its drawing buffer.
  const job = queue.then(async () => {
    const image = await loadImage(url)
    return draw(image, size, opts)
  })
  queue = job.catch(() => {})
  cache.set(key, job)
  return job
}
