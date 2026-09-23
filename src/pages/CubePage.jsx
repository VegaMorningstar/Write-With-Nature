import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { LETTERS } from '../data/letters'
import { makeBrick } from '../lib/landsat-brick'

/**
 * ?cube — one Landsat scene, one block, live.
 *
 * Its own canvas rather than the board's shared offscreen renderer: this page
 * exists to dial the thing in, so the camera and the model rebuild as you drag.
 */

const CHARS = Object.keys(LETTERS)

function Slider({ label, value, set, min, max, step = 1, suffix = '' }) {
  return (
    <label style={{ display: 'grid', gap: 2, fontSize: 12, color: '#5a5647' }}>
      <span style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label} <b style={{ color: '#2d2a1f' }}>{value}{suffix}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => set(+e.target.value)}
      />
    </label>
  )
}

export default function CubePage() {
  const mount = useRef(null)
  const engine = useRef(null)

  const [ch, setCh] = useState('S')
  const [vi, setVi] = useState(0)
  const [elev, setElev] = useState(42)
  const [azi, setAzi] = useState(38)
  const [relief, setRelief] = useState(0.13)
  const [depth, setDepth] = useState(0.68)
  const [shade, setShade] = useState(0.6)
  const [column, setColumn] = useState(null)

  const variants = LETTERS[ch] || []
  const variant = variants[vi % Math.max(1, variants.length)]

  // ── the renderer, built once ────────────────────────────────────────────
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

    // Nothing in the block reads scene lights — it shades itself — so this is
    // here purely to drop the contact shadow, aimed the way the shaders are.
    const key = new THREE.DirectionalLight(0xffffff, 1)
    key.position.set(0.62, 1.0, -0.42).setLength(9)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, {
      left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 20,
    })
    scene.add(key)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ opacity: 0.2 })
    )
    floor.receiveShadow = true
    scene.add(floor)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 60)
    engine.current = { renderer, scene, camera, floor, canvas, block: null }

    const onResize = () => engine.current?.draw?.()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      canvas.remove()
    }
  }, [])

  // ── rebuild the block when the scene or its shape changes ───────────────
  useEffect(() => {
    if (!variant) return
    const e = engine.current
    if (!e) return
    let live = true

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!live) return
      if (e.block) {
        e.scene.remove(e.block)
        e.block.traverse(o => {
          if (o.geometry) o.geometry.dispose()
          if (o.material) [].concat(o.material).forEach(m => m.dispose())
        })
      }
      const tex = new THREE.Texture(img)
      tex.needsUpdate = true
      const block = makeBrick(tex, img, { relief, depth, shade, place: variant.label })
      block.traverse(o => { if (o.isMesh) o.castShadow = true })
      e.floor.position.y = block.userData.bottomY - 0.001
      e.scene.add(block)
      e.block = block
      setColumn(block.userData.column)
      e.draw?.()
    }
    img.src = variant.url

    return () => { live = false }
  }, [variant?.url, relief, depth, shade])

  // ── camera, redrawn on every change ─────────────────────────────────────
  useEffect(() => {
    const e = engine.current
    if (!e) return

    e.draw = () => {
      const { renderer, scene, camera, canvas, block } = e
      if (!block) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)

      const az = THREE.MathUtils.degToRad(azi)
      const el = THREE.MathUtils.degToRad(elev)
      const r = 16
      camera.position.set(
        r * Math.cos(el) * Math.sin(az),
        r * Math.sin(el),
        r * Math.cos(el) * Math.cos(az)
      )
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld(true)

      // Frame what the camera actually sees of the block — its world size says
      // almost nothing about its footprint on screen at this angle.
      const box = new THREE.Box3().setFromObject(block)
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

      const pad = 1.18 // leaves room for the shadow
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
      window.__cubeReady = true
    }
    e.draw()
  }, [elev, azi, relief, depth, shade, variant?.url])

  return (
    <div style={{ padding: '1.5rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400, margin: '0 0 .3rem' }}>
        Landsat block
      </h1>
      <p style={{ margin: '0 0 1rem', color: '#5a5647', maxWidth: 680, lineHeight: 1.5 }}>
        {variant?.label}. The satellite image is the top face, displaced by its
        own water; on level ground the pixel you see is the pixel NASA shot.
        Below it, the section this place actually has.
      </p>

      {column && (
        <p style={{ margin: '0 0 1rem', color: '#5a5647', fontSize: 13 }}>
          <b style={{ color: '#2d2a1f' }}>{column.kind}</b>
          {column.lith && <> · bedrock <i>{column.lith}</i></>}
          {column.era && <> · {column.era}</>}
          {column.relief !== undefined && <> · {column.relief} m of relief nearby</>}
          {column.elev !== undefined && <> · {column.elev} m</>}
          <> · from {column.source}</>
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        <select value={ch} onChange={e => { setCh(e.target.value); setVi(0) }} style={{ padding: 6, fontSize: 15 }}>
          {CHARS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={() => setVi(v => v + 1)} style={{ padding: '6px 12px', fontSize: 14 }}>
          next scene ({(vi % Math.max(1, variants.length)) + 1}/{variants.length})
        </button>
      </div>

      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 14 }}>
        <Slider label="elevation" value={elev} set={setElev} min={14} max={80} suffix="°" />
        <Slider label="azimuth" value={azi} set={setAzi} min={0} max={90} suffix="°" />
        <Slider label="relief" value={relief} set={setRelief} min={0.02} max={0.3} step={0.005} />
        <Slider label="depth" value={depth} set={setDepth} min={0.1} max={1} step={0.02} />
        <Slider label="slope shading" value={shade} set={setShade} min={0} max={1} step={0.05} />
      </div>

      <div ref={mount} style={{ width: '100%', height: '68vh', minHeight: 420 }} />
    </div>
  )
}
