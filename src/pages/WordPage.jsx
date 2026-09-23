import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { LETTERS } from '../data/letters'
import { makeBrick } from '../lib/landsat-brick'
import { makeWordVolume } from '../lib/word-volume'

/**
 * ?word — a whole word as a row of blocks, in one scene.
 *
 * One scene rather than the board's offscreen renderer, because the blocks
 * have to sit close enough to read as a word: they share a camera, they cast
 * shadows on each other, and the row is framed as a single object.
 *
 * Each block carries its own character cut into the face that looks towards
 * the camera, so a block still says which letter it is once the scene on top
 * has stopped looking like one.
 */

// Coarser than a single block's default. A word is a dozen height fields, and
// every one of them is fifty blur passes over the grid.
const GRID = 118

function Slider({ label, value, set, min, max, step = 1, suffix = '' }) {
  return (
    <label style={{ display: 'grid', gap: 2, fontSize: 12, color: '#5a5647' }}>
      <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label} <b style={{ color: '#2d2a1f' }}>{value}{suffix}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value}
             onChange={e => set(+e.target.value)} />
    </label>
  )
}

function loadImage(url) {
  return new Promise((res, rej) => {
    const i = new Image()
    i.crossOrigin = 'anonymous'
    i.onload = () => res(i)
    i.onerror = () => rej(new Error(url))
    i.src = url
  })
}

// Initial state comes from the query string, so a particular arrangement can
// be linked to and screenshotted without clicking anything.
const Q = new URLSearchParams(window.location.search)
const q = (k, d) => (Q.get(k) === null ? d : +Q.get(k))

export default function WordPage() {
  const mount = useRef(null)
  const eng = useRef(null)

  const [text, setText] = useState(Q.get('w') || 'RIVERS')
  const [elev, setElev] = useState(q('elev', 42))
  const [azi, setAzi] = useState(q('azi', 20))
  const [gap, setGap] = useState(q('gap', 0.2))
  const [relief, setRelief] = useState(q('relief', 0.13))
  const [depth, setDepth] = useState(q('depth', 0.68))
  const [level, setLevel] = useState(Q.get('level') !== '0')
  const [sky, setSky] = useState(Q.get('sky') !== '0')
  const [showVol, setShowVol] = useState(Q.get('vol') === '1')

  // The row is built asynchronously, so the sky and the cage are created after
  // the effect that would have set their visibility has already run. They read
  // it from here instead of from a stale closure.
  const flags = useRef({ sky: true, showVol: false })
  flags.current = { sky, showVol }
  const [busy, setBusy] = useState(true)

  const word = text.toUpperCase().replace(/[^A-Z0-9 ]/g, '')

  // ── renderer, once ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.style.cssText = 'display:block;width:100%;height:100%'
    mount.current.appendChild(canvas)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xeceded)

    // The blocks shade themselves; this only casts their shadows, pointed the
    // same way their shaders are lit from.
    const key = new THREE.DirectionalLight(0xffffff, 1)
    key.position.set(0.62, 1.0, -0.42).setLength(24)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, {
      left: -9, right: 9, top: 5, bottom: -5, near: 0.1, far: 60,
    })
    scene.add(key)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ opacity: 0.2 })
    )
    floor.receiveShadow = true
    scene.add(floor)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 200)
    eng.current = { renderer, scene, camera, floor, canvas, row: null }

    const onResize = () => eng.current?.draw?.()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      canvas.remove()
    }
  }, [])

  // ── build the row ───────────────────────────────────────────────────────
  useEffect(() => {
    const e = eng.current
    if (!e) return
    let live = true
    setBusy(true)

    const chars = [...word]
    const wanted = chars.filter(c => c !== ' ' && LETTERS[c])

    Promise.all(wanted.map(c => loadImage(LETTERS[c][0].url)))
      .then(images => {
        if (!live) return
        if (e.row) {
          e.scene.remove(e.row)
          e.row.traverse(o => {
            if (o.geometry) o.geometry.dispose()
            if (o.material) [].concat(o.material).forEach(m => m.dispose())
          })
        }

        const row = new THREE.Group()
        let x = 0
        let bottom = 0
        let i = 0
        for (const c of chars) {
          if (c === ' ') {
            x += 0.45
            continue
          }
          if (!LETTERS[c]) continue
          const img = images[i++]
          const tex = new THREE.Texture(img)
          tex.needsUpdate = true
          const block = makeBrick(tex, img, {
            gridW: GRID, relief, depth, letter: c,
            place: LETTERS[c][0].label,
          })
          const w = block.userData.W
          block.position.x = x + w / 2
          bottom = block.userData.bottomY
          x += w + gap
          block.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
          row.add(block)
        }
        row.position.x = -(x - gap) / 2
        e.floor.position.y = bottom - 0.001
        e.scene.add(row)
        e.row = row

        // The blocks together occupy one larger cuboid; that volume is its own
        // object, and it owns the weather inside it.
        if (e.volume) {
          e.scene.remove(e.volume)
          e.volume.traverse(o => {
            if (o.geometry) o.geometry.dispose()
            if (o.material) [].concat(o.material).forEach(m => m.dispose())
          })
        }
        const volume = makeWordVolume(row)
        volume.visible = flags.current.sky
        e.scene.add(volume)
        e.volume = volume

        if (e.cage) { e.scene.remove(e.cage); e.cage.geometry.dispose(); e.cage.material.dispose() }
        const b = volume.userData.bounds
        const cage = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(
            b.max.x - b.min.x, b.ceiling - b.min.y, b.max.z - b.min.z
          )),
          new THREE.LineBasicMaterial({ color: 0x8fa0ad, transparent: true, opacity: 0.5 })
        )
        cage.position.set(
          (b.min.x + b.max.x) / 2,
          (b.min.y + b.ceiling) / 2,
          (b.min.z + b.max.z) / 2
        )
        cage.visible = flags.current.showVol
        e.scene.add(cage)
        e.cage = cage

        setBusy(false)
        e.draw?.()
      })
      .catch(() => live && setBusy(false))

    return () => { live = false }
  }, [word, gap, relief, depth])

  // ── camera ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const e = eng.current
    if (!e) return

    e.draw = () => {
      const { renderer, scene, camera, canvas, row } = e
      if (!row) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)

      const az = THREE.MathUtils.degToRad(azi)
      const el = THREE.MathUtils.degToRad(elev)
      const r = 60
      camera.position.set(
        r * Math.cos(el) * Math.sin(az),
        r * Math.sin(el),
        r * Math.cos(el) * Math.cos(az)
      )
      // Rolling the camera about its own view axis until world +X — the line
      // the blocks are laid along — lands flat on screen. The blocks stay
      // flush against each other and each is still seen from the same azimuth
      // and elevation; only the picture turns. Laying the row along the screen
      // instead would have staggered every block backwards in depth.
      if (level) {
        const fwd = new THREE.Vector3(0, 0, 0).sub(camera.position).normalize()
        const along = new THREE.Vector3(1, 0, 0)
        along.addScaledVector(fwd, -along.dot(fwd)).normalize()
        const up = new THREE.Vector3().crossVectors(fwd.clone().negate(), along)
        if (up.y < 0) up.negate()
        camera.up.copy(up.normalize())
      } else {
        camera.up.set(0, 1, 0)
      }
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld(true)

      // A row of blocks lies diagonally under this camera, so its screen
      // footprint has little to do with its width in world x. Measure it — and
      // frame the airspace, not just the blocks, or the clouds sit outside the
      // picture.
      const box = new THREE.Box3().setFromObject(row)
      const vb = e.volume?.userData.bounds
      if (vb && e.volume.visible) box.max.y = Math.max(box.max.y, vb.ceiling)
      const inv = camera.matrixWorldInverse
      const v = new THREE.Vector3()
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (let i = 0; i < 8; i++) {
        v.set(
          i & 1 ? box.max.x : box.min.x,
          i & 2 ? box.max.y : box.min.y,
          i & 4 ? box.max.z : box.min.z
        ).applyMatrix4(inv)
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x)
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y)
      }

      const pad = 1.1
      const a = w / h
      const half = Math.max(((maxY - minY) / 2) * pad, (((maxX - minX) / 2) * pad) / a)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      camera.left = -half * a + cx
      camera.right = half * a + cx
      camera.top = half + cy
      camera.bottom = -half + cy
      camera.updateProjectionMatrix()

      renderer.render(scene, camera)
      window.__wordReady = true
    }
    e.draw()
  }, [elev, azi, gap, relief, depth, level, word])

  // ── the sky, and the frames it needs ────────────────────────────────────
  useEffect(() => {
    const e = eng.current
    if (!e) return
    if (e.volume) e.volume.visible = sky
    if (e.cage) e.cage.visible = showVol

    // Everything else in this scene is still life, so there is nothing to
    // animate unless the sky is on — then, and only then, take over the frame.
    if (!sky) {
      e.draw?.()
      return
    }
    let raf = 0
    let last = performance.now()
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      e.volume?.userData.update(dt)
      e.draw?.()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [sky, showVol, word, gap, relief, depth, elev, azi, level])

  return (
    <div style={{ padding: '1.2rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400, margin: '0 0 .2rem' }}>
        Written in Landsat
      </h1>
      <p style={{ margin: '0 0 .9rem', color: '#5a5647', maxWidth: 700, lineHeight: 1.5 }}>
        One block per letter, each a real place on Earth, with its character cut
        into the face. Together they occupy one cuboid, and the flocks migrate
        inside it. {busy && <b>building…</b>}
      </p>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 12 }}>
        <input value={text} onChange={e => setText(e.target.value)}
               style={{ padding: '7px 11px', fontSize: 16, width: 220 }} />
        <Slider label="elevation" value={elev} set={setElev} min={14} max={80} suffix="°" />
        <Slider label="azimuth" value={azi} set={setAzi} min={0} max={90} suffix="°" />
        <Slider label="gap" value={gap} set={setGap} min={0} max={0.4} step={0.01} />
        <Slider label="relief" value={relief} set={setRelief} min={0.02} max={0.3} step={0.005} />
        <Slider label="depth" value={depth} set={setDepth} min={0.1} max={1} step={0.02} />
        <label style={{ fontSize: 12, color: '#5a5647', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={level} onChange={e => setLevel(e.target.checked)} />
          level row
        </label>
        <label style={{ fontSize: 12, color: '#5a5647', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={sky} onChange={e => setSky(e.target.checked)} />
          sky
        </label>
        <label style={{ fontSize: 12, color: '#5a5647', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={showVol} onChange={e => setShowVol(e.target.checked)} />
          show volume
        </label>
      </div>

      <div ref={mount} style={{ width: '100%', height: '70vh', minHeight: 420 }} />
    </div>
  )
}
