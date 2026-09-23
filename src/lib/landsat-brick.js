/**
 * landsat-brick — turn a NASA Landsat letter tile into a 3D geological block.
 *
 * The Landsat scene is the block's top face, displaced into real relief by its
 * own luminance: the water that draws the letter sinks into a carved channel,
 * and the land around it rises into ridges. The letter stays exactly where
 * NASA photographed it — nothing is regenerated, redrawn, or recoloured.
 *
 * Nothing is laid over the top face either. No glass, no water sheet: on flat
 * ground the rendered pixel is the satellite pixel, and shading only departs
 * from that where the ground actually slopes. Below the surface the block is a
 * core sample — laminated sediment, its beds wandering as they run around the
 * corners.
 */

import * as THREE from 'three'
import { columnFor, MAX_BEDS } from './strata'

const DEFAULTS = {
  gridW: 150, // plan resolution across the short axis
  relief: 0.13, // land height above the channel floor, in short-axis units
  depth: 0.68, // how deep the block goes, in short-axis units
  smooth: 16, // blur passes for the water mask, at gridW 128
  crisp: 6, // blur passes for the ridge detail — low enough to keep ridges
  //           sharp, high enough that snow and sandbar speckle is not terrain
  bankSoftness: 18, // blur passes over the water mask — how gently banks slope
  waterLo: 0.42, // luminance where the bank starts
  waterHi: 0.66, // luminance where it is fully water
  detail: 0.45, // how much of the relief budget land texture may claim
  // Measured across the library: a braided floodplain of snow and sandbars
  // sits near 0.45, forested mountains near 0.73, a glacier near 0.93.
  flat: 0.44, // structure below this is speckle — give the land no relief
  rugged: 0.80, // structure above this is real landform — give it all of it
  flatRelief: 0.36, // share of the relief a wholly flat scene still gets
  invert: 'auto', // 'auto' | true (water is dark) | false (water is bright)
  rim: 0.022, // fraction of the short axis flattened at the border — narrow,
  //            so the lip seen edge-on from a low camera stays a thin line
  shade: 0.6, // how strongly slopes depart from the true satellite colour
  laminae: 34, // beds per unit height
  round: 0.035, // fillet radius on the top and bottom edges, in short-axis units
  corner: 0.07, // plan radius on the four vertical corners
  letter: null, // the character to cut into the front face, or null for none
  etchSize: 0.6, // glyph height as a share of the cut's height
  etchDepth: 0.82, // how dark the groove reads
  // Where the sun is. The same vector lights the block and, in the scene
  // around it, throws its shadow — so the two agree. Pointing it away from the
  // camera in z puts that shadow where the camera can see it instead of
  // hiding it behind the block.
  light: [0.62, 1.0, -0.42],
}

/* ── height field ────────────────────────────────────────────────────────── */
function heightFieldFrom(image, nx, nz, o) {
  const c = document.createElement('canvas')
  c.width = nx
  c.height = nz
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(image, 0, 0, nx, nz)
  const px = ctx.getImageData(0, 0, nx, nz).data

  const blur = (src, passes) => {
    let a = src
    for (let p = 0; p < passes; p++) {
      const out = new Float32Array(nx * nz)
      for (let z = 0; z < nz; z++) {
        for (let x = 0; x < nx; x++) {
          let sum = 0
          let n = 0
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              const sx = x + dx
              const sz = z + dz
              if (sx < 0 || sx >= nx || sz < 0 || sz >= nz) continue
              sum += a[sz * nx + sx]
              n++
            }
          }
          out[z * nx + x] = sum / n
        }
      }
      a = out
    }
    return a
  }

  const norm = a => {
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < a.length; i++) {
      if (a[i] < lo) lo = a[i]
      if (a[i] > hi) hi = a[i]
    }
    const span = hi - lo || 1
    for (let i = 0; i < a.length; i++) a[i] = (a[i] - lo) / span
    return a
  }

  const raw = new Float32Array(nx * nz)
  let ice = 0
  let arid = 0
  let green = 0
  for (let i = 0; i < nx * nz; i++) {
    const r = px[i * 4] / 255
    const g = px[i * 4 + 1] / 255
    const b = px[i * 4 + 2] / 255
    raw[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b

    // Ice and snow: bright and almost colourless. Arid ground: warm, with red
    // clearly above blue and not dark. Both are read here rather than guessed
    // from the place name, because false-colour scenes lie about the name.
    const mx = Math.max(r, g, b)
    const mn = Math.min(r, g, b)
    if (mx > 0.72 && mx - mn < 0.12) ice++
    // A playa is only faintly warm — Black Rock reads barely ten points of red
    // over blue — so the test is loose, and vegetation is counted separately
    // to keep a green floodplain from passing it.
    if (r - b > 0.05 && r >= g && mx > 0.3) arid++
    if (g > r && g > b) green++
  }
  const n = nx * nz

  const scale = f => Math.max(1, Math.round((f * nx) / 128))

  // Two different blurs, because the two jobs want opposite things. Finding
  // the river means erasing everything narrower than it. Carving ridges means
  // keeping exactly that detail. Blurring once for both gave a clean channel
  // through mush.
  const coarseRaw = blur(Float32Array.from(raw), scale(o.smooth))
  const fineRaw = blur(Float32Array.from(raw), scale(o.crisp))

  // How much of the scene's contrast survives a heavy blur — that is, how much
  // of it is real landform rather than speckle. A mountain range keeps most of
  // it; a braided floodplain of snow and sandbars keeps almost none, because
  // its brightness is texture, not terrain. Scaling the land relief by this is
  // what stops a flat river plain being embossed into a mountain range.
  const std = a => {
    let m = 0
    for (let i = 0; i < a.length; i++) m += a[i]
    m /= a.length
    let v = 0
    for (let i = 0; i < a.length; i++) v += (a[i] - m) * (a[i] - m)
    return Math.sqrt(v / a.length)
  }
  const structure = std(coarseRaw) / (std(raw) || 1)

  const coarse = norm(coarseRaw)
  const fine = norm(fineRaw)

  const smoothstep = (a, b, v) => {
    const t = Math.min(1, Math.max(0, (v - a) / (b - a || 1)))
    return t * t * (3 - 2 * t)
  }

  // Which end of the histogram is the water? Most natural-colour scenes have
  // dark water, but the false-colour renderings and the ice-choked rivers have
  // bright water, and getting it backwards turns the letter into a ridge
  // instead of a channel. Water is smooth and land is textured — but only at
  // pixel scale, so the test runs on the raw luminance, never the blurred one.
  let invert = o.invert
  if (invert === 'auto') {
    const grad = new Float32Array(nx * nz)
    for (let z = 1; z < nz - 1; z++) {
      for (let x = 1; x < nx - 1; x++) {
        const i = z * nx + x
        grad[i] =
          Math.abs(raw[i + 1] - raw[i - 1]) + Math.abs(raw[i + nx] - raw[i - nx])
      }
    }
    const sorted = Float32Array.from(raw).sort()
    const p20 = sorted[Math.floor(sorted.length * 0.2)]
    const p80 = sorted[Math.floor(sorted.length * 0.8)]
    let darkG = 0
    let darkN = 0
    let brightG = 0
    let brightN = 0
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] <= p20) {
        darkG += grad[i]
        darkN++
      } else if (raw[i] >= p80) {
        brightG += grad[i]
        brightN++
      }
    }
    invert = darkG / (darkN || 1) < brightG / (brightN || 1)
  }

  const wetOf = v => (invert ? 1 - v : v)

  let mask = new Float32Array(nx * nz)
  for (let i = 0; i < mask.length; i++) {
    mask[i] = smoothstep(o.waterLo, o.waterHi, wetOf(coarse[i]))
  }
  mask = blur(mask, scale(o.bankSoftness)) // banks slope instead of falling off a cliff

  const landform = smoothstep(o.flat, o.rugged, structure)
  const detail = o.detail * landform
  const h = new Float32Array(nx * nz)
  for (let i = 0; i < nx * nz; i++) {
    const land = 1 - mask[i]
    h[i] = land * (1 - detail + (1 - wetOf(fine[i])) * detail)
  }

  const preRim = Float32Array.from(h)

  // Settle the border to a constant height. Left alone the terrain runs
  // straight off the edge and the block's silhouette comes out sawtoothed,
  // which reads as a rendering fault rather than as landscape. A flat rim
  // gives it the clean cut edge of a core sample.
  if (o.rim > 0) {
    let mean = 0
    for (let i = 0; i < h.length; i++) mean += h[i]
    mean /= h.length

    // Wide enough to cover the fillet, or the lip would be rolled out of
    // sloping ground and come out wavy instead of clean.
    const m = Math.max(1, Math.max(o.rim, o.round * 1.6) * nx)
    for (let z = 0; z < nz; z++) {
      for (let x = 0; x < nx; x++) {
        const t = Math.min(Math.min(x, nx - 1 - x) / m, Math.min(z, nz - 1 - z) / m)
        const i = z * nx + x
        h[i] = mean + (h[i] - mean) * smoothstep(0, 1, Math.min(1, t))
      }
    }
  }

  // A flat river plain gets a shallow channel in a low block; a mountain range
  // gets the full relief budget. Carving both to the same depth turned the
  // floodplain's sandbars into a crag field.
  // The un-flattened field, kept so the cut faces can arch to follow the
  // ground above them; the rim flattening is only there to give the block a
  // clean edge and would tell the beds nothing.
  return {
    h,
    surface: Float32Array.from(preRim),
    reliefScale: o.flatRelief + (1 - o.flatRelief) * landform,
    stats: {
      water: mask.reduce((a, b) => a + b, 0) / n,
      ice: ice / n,
      arid: arid / n,
      green: green / n,
      structure,
    },
  }
}

/* ── engraved letter ──────────────────────────────────────────────────────
   The character is drawn to a canvas and used as a mask on the front face,
   which is darkened inside the stroke and given a lit edge along its lower
   right, the way a groove catches light coming from the upper left. */
function glyphTexture(ch) {
  const S = 512
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const g = c.getContext('2d')
  g.clearRect(0, 0, S, S)
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `600 ${Math.round(S * 0.78)}px "Playfair Display", Georgia, serif`
  g.fillText(String(ch), S / 2, S / 2 + S * 0.04)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

const BLANK = (() => {
  let tex = null
  return () => {
    if (!tex) {
      tex = new THREE.DataTexture(new Uint8Array(4), 1, 1)
      tex.needsUpdate = true
    }
    return tex
  }
})()

/* ── shared GLSL ──────────────────────────────────────────────────────────
   The textures carry sRGB values and these are raw ShaderMaterials, so three
   decodes nothing on the way in. Decoding here and letting the renderer encode
   on the way out means an unshaded pixel comes back exactly as it went in. */
const COMMON = /* glsl */ `
  vec3 srgbToLinear(vec3 c){
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
  }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1,0)), c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
`

/* ── top face ─────────────────────────────────────────────────────────────
   Relief shading normalised against flat ground: where the surface is level
   the multiplier is exactly 1, so the satellite pixel survives untouched, and
   only genuine slopes are lit or shadowed. */
const TOP_VERT = /* glsl */ `
  attribute float aLip;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying float vLip;
  void main() {
    vUv = uv;
    vLip = aLip;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`

const TOP_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform vec3 uLightDir;
  uniform vec3 uLip;
  uniform float uShade;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying float vLip;
  ${COMMON}
  void main() {
    vec3 L = normalize(uLightDir);
    float nl    = max(dot(normalize(vNormalW), L), 0.0);
    float level = max(dot(vec3(0.0, 1.0, 0.0), L), 1e-3);
    float shade = clamp(mix(1.0, nl / level, uShade), 0.32, 1.28);

    vec3 col = srgbToLinear(texture2D(uMap, vUv).rgb);

    // The outer half of the rolled lip settles to plain soil. Carrying the
    // scene right over the edge looks better in principle, but the lip is seen
    // almost end-on: there it is a few pixels wide, every pixel spans a long
    // run of texels, and the detail aliases into a comb of stripes. Soil has
    // nothing to alias, and it hands over cleanly to the cut below.
    vec3 lipCol = mix(srgbToLinear(texture2D(uMap, vUv, 5.0).rgb), uLip, 0.55);
    col = mix(col, lipCol, smoothstep(0.18, 0.88, vLip));

    gl_FragColor = vec4(col * shade, 1.0);
    #include <colorspace_fragment>
  }
`

/* ── cut faces ────────────────────────────────────────────────────────────
   Laminated sediment. `aPerim` runs continuously around the block, so a bed
   that dips on one wall keeps dipping around the corner instead of resetting.
   The topmost sliver is sampled from the satellite pixels directly overhead,
   which is what makes the cut belong to the surface above it. */
const WALL_VERT = /* glsl */ `
  attribute float aPerim;
  attribute vec2 aPlanUV;
  attribute vec3 aEtch;
  attribute vec2 aBed;           // x: distance along the dip axis, y: ground above
  varying float vPerim;
  varying vec2  vPlanUV;
  varying vec3  vEtch;
  varying vec2  vBed;
  varying vec3  vWorld;
  varying vec3  vNormalW;
  void main() {
    vPerim   = aPerim;
    vPlanUV  = aPlanUV;
    vEtch    = aEtch;
    vBed     = aBed;
    vec4 wp  = modelMatrix * vec4(position, 1.0);
    vWorld   = wp.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const WALL_FRAG = /* glsl */ `
  precision highp float;
  #define MAX_BEDS 10
  uniform sampler2D uMap;
  uniform vec3  uBedCol[MAX_BEDS];
  uniform float uBedY[MAX_BEDS];
  uniform int   uBedN;
  uniform float uDip, uFold, uConform, uGrain;
  uniform float uTopY, uBottomY;
  uniform vec3  uLightDir;
  uniform sampler2D uEtch;
  uniform float uHasEtch;
  uniform float uEtchDepth;
  varying float vPerim;
  varying vec2  vPlanUV;
  varying vec3  vEtch;
  varying vec2  vBed;
  varying vec3  vWorld;
  varying vec3  vNormalW;
  ${COMMON}

  // Two octaves is enough: a bedding plane should undulate, not fray.
  float wave(float t, float seed){
    return vnoise(vec2(t * 3.2, seed)) * 0.66 + vnoise(vec2(t * 9.0, seed + 31.0)) * 0.34;
  }

  void main() {
    float y = (vWorld.y - uBottomY) / (uTopY - uBottomY);   // 0 at the base, 1 at the surface

    // Every boundary in the stack moves together: a planar dip across the
    // block, a fold that buckles it, and an arch that follows the ground
    // overhead — so the section answers to the landscape on top of it rather
    // than being ruled flat underneath whatever happens to be there.
    // Bounded, both together and per boundary: unclamped, a hard dip plus a
    // deep fold can push a bed clean out of the top or bottom of the block,
    // and the section collapses into two featureless masses.
    float base = clamp(uDip * vBed.x + uConform * (vBed.y - 0.5) * 0.4, -0.2, 0.2);

    vec3 col = uBedCol[0];
    for (int i = 1; i < MAX_BEDS; i++) {
      if (i >= uBedN) break;
      float b = uBedY[i] + base
              + clamp(uFold * (wave(vPerim + float(i) * 0.37, float(i) * 3.0) - 0.5) * 0.3,
                      -0.12, 0.12);
      col = mix(col, uBedCol[i], smoothstep(b - 0.012, b + 0.012, y));
    }

    // Grain along the cut, coarse for till and crystalline rock, fine for mud.
    float g1 = vnoise(vec2(vPerim * 210.0, y * 130.0));
    float g2 = vnoise(vec2(vPerim * 26.0, y * 9.0));
    col *= 1.0 + (g1 - 0.5) * 0.12 * uGrain;
    col *= 0.98 + 0.045 * g2;

    // A soil horizon under the rim, tinted by the ground directly overhead.
    // Sampled from a deliberately blurred mip: at full resolution, adjacent
    // points around the perimeter land on unrelated speckle and the horizon
    // comes out as a comb of vertical stripes. What it wants is the local
    // colour of the ground, not its detail.
    vec3 soil = srgbToLinear(texture2D(uMap, vPlanUV, 5.0).rgb);
    col = mix(col, mix(soil, uBedCol[uBedN - 1] * 0.7, 0.5), smoothstep(0.88, 0.99, y));

    // The letter, cut in. Masked to the flat front face and clamped inside the
    // glyph, so nothing smears around the rounded corners; no branch, because
    // sampling inside one would lose the derivatives the mip needs.
    vec2 e = vEtch.xy;
    float inside = step(0.0, e.x) * step(e.x, 1.0) * step(0.0, e.y) * step(e.y, 1.0);
    float k = vEtch.z * inside * uHasEtch;

    // Three samples make a groove rather than a stencil. The light reaches
    // this face from the upper right, so the wall on that side of the cut is
    // in its own shadow and the wall opposite catches the light; the pair of
    // them is what gives the letter depth against whatever beds run behind it.
    const float STEP = 0.014;
    float gg  = texture2D(uEtch, clamp(e, 0.0, 1.0)).a * k;
    float gUp = texture2D(uEtch, clamp(e + vec2( STEP,  STEP), 0.0, 1.0)).a * k;
    float gDn = texture2D(uEtch, clamp(e + vec2(-STEP, -STEP), 0.0, 1.0)).a * k;
    float shadow = clamp(gg - gUp, 0.0, 1.0);
    float lit    = clamp(gg - gDn, 0.0, 1.0);

    // Darkening alone only reads on pale rock: the section is now whatever the
    // place actually has, and on dark basement a darker groove would vanish.
    // There, the cut barely darkens and the lit wall carries the letter.
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    float dark = smoothstep(0.32, 0.06, lum);
    col *= 1.0 - uEtchDepth * gg * (1.0 - dark * 0.55);
    col *= 1.0 - 0.5 * shadow * (1.0 - dark * 0.5);
    col += (0.3 + dark * 0.55) * lit;

    // Flat matte shading, so the two visible cuts read as different planes.
    float nl = max(dot(normalize(vNormalW), normalize(uLightDir)), 0.0);
    col *= 0.66 + 0.34 * nl;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

function bedColor(column, i) {
  const c = column.beds[Math.min(i, column.beds.length - 1)]
  return new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace)
}

/** GLSL wants the whole array, however few beds this column actually has. */
function padColors(list) {
  const out = []
  for (let i = 0; i < MAX_BEDS; i++) {
    const c = list[Math.min(i, list.length - 1)]
    out.push(new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace))
  }
  return out
}
function padFloats(list) {
  const out = new Float32Array(MAX_BEDS)
  for (let i = 0; i < MAX_BEDS; i++) out[i] = list[Math.min(i, list.length - 1)]
  return out
}
function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Build the block.
 *
 * @param {THREE.Texture} texture  the Landsat scene
 * @param {HTMLImageElement} image the same scene, for reading the height field
 * @returns {THREE.Group} centred on the origin, short axis 1 unit wide
 */
export function makeBrick(texture, image, opts = {}) {
  const o = { ...DEFAULTS, ...opts }
  const group = new THREE.Group()

  // The footprint follows the scene's own aspect, so the whole letter lands on
  // the top face — nothing is cropped away to force a square.
  const aspect = image.width / image.height
  const W = 1
  const D = 1 / aspect
  const nx = o.gridW
  const nz = Math.max(8, Math.round(nx / aspect))

  const field = heightFieldFrom(image, nx, nz, o)
  const h = field.h
  const surface = field.surface

  // What is under this particular place. Real bedrock and relief where the
  // scene could be located, the image's own statistics where it could not.
  const column = o.strata ?? columnFor(o.place ?? '', field.stats)
  const relief = o.relief * field.reliefScale
  const at = (x, z) => h[z * nx + x] * relief

  const topY = relief
  const bottomY = -o.depth

  texture.colorSpace = THREE.NoColorSpace // decoded in the shaders instead
  // Clamped by the renderer to whatever the GPU allows. It matters most at a
  // low camera, where the flat rim is seen almost edge-on and each pixel
  // covers a long run of texels.
  texture.anisotropy = 16

  const lightDir = new THREE.Vector3(...o.light).normalize()

  // ── plan outline ────────────────────────────────────────────────────────
  // The block is a rounded rectangle in plan, and its top and bottom edges are
  // rolled over by a fillet. Everything below is expressed as a distance in
  // from that outline.
  const cr = Math.max(0, Math.min(o.corner, Math.min(W, D) * 0.45))
  const fr = Math.max(0, Math.min(o.round, Math.min(W, D) * 0.2, o.depth * 0.45))
  const bx = W / 2 - cr
  const bz = D / 2 - cr

  const planX = x => -W / 2 + (x / (nx - 1)) * W
  const planZ = z => -D / 2 + (z / (nz - 1)) * D

  // Square to quarter-disc, applied only inside the four corner squares. The
  // straight edges are left exactly where they were, and the mapping meets
  // them continuously, so only the corners actually move.
  const roundPlan = (x, z) => {
    const ax = Math.abs(x)
    const az = Math.abs(z)
    if (cr <= 0 || ax <= bx || az <= bz) return [x, z]
    const u = (ax - bx) / cr
    const v = (az - bz) / cr
    const len = Math.hypot(u, v) || 1
    const k = Math.max(u, v) / len
    return [Math.sign(x) * (bx + u * k * cr), Math.sign(z) * (bz + v * k * cr)]
  }

  // Distance in from the outline, and the outward normal there.
  const inward = (x, z) => {
    const qx = Math.abs(x) - bx
    const qz = Math.abs(z) - bz
    const out = Math.hypot(Math.max(qx, 0), Math.max(qz, 0))
    return -(out + Math.min(Math.max(qx, qz), 0) - cr)
  }
  const planNormal = (x, z) => {
    const qx = Math.abs(x) - bx
    const qz = Math.abs(z) - bz
    if (qx > 0 && qz > 0) {
      const l = Math.hypot(qx, qz) || 1
      return [(qx / l) * Math.sign(x), (qz / l) * Math.sign(z)]
    }
    return qx > qz ? [Math.sign(x), 0] : [0, Math.sign(z)]
  }

  // ── top surface ─────────────────────────────────────────────────────────
  const top = new THREE.PlaneGeometry(W, D, nx - 1, nz - 1)
  top.rotateX(-Math.PI / 2)
  const tpos = top.attributes.position
  const lip = new Float32Array(nx * nz)
  for (let z = 0; z < nz; z++) {
    for (let x = 0; x < nx; x++) {
      let [px, pz] = roundPlan(planX(x), planZ(z))
      let y = at(x, z)

      // The last `fr` of ground rolls over a quarter-circle lip, so the scene
      // wraps around the edge rather than stopping at a right angle. The rim
      // is flat out to at least this far, so the lip is never cut into a slope.
      const d = inward(px, pz)
      if (fr > 0 && d < fr) {
        const th = (1 - Math.max(d, 0) / fr) * (Math.PI / 2)
        const [nxv, nzv] = planNormal(px, pz)
        const shift = d - fr * (1 - Math.sin(th))
        px += nxv * shift
        pz += nzv * shift
        y -= fr * (1 - Math.cos(th))
        lip[z * nx + x] = 1 - Math.max(d, 0) / fr
      }
      tpos.setXYZ(z * nx + x, px, y, pz)
    }
  }
  top.computeVertexNormals()
  top.setAttribute('aLip', new THREE.BufferAttribute(lip, 1))

  group.add(
    new THREE.Mesh(
      top,
      new THREE.ShaderMaterial({
        vertexShader: TOP_VERT,
        fragmentShader: TOP_FRAG,
        uniforms: {
          uMap: { value: texture },
          uLightDir: { value: lightDir },
          // The rolled lip settles to the colour of the uppermost bed, so the
          // edge hands over to the cut face below it rather than to a palette
          // this place may have nothing to do with.
          uLip: { value: bedColor(column, column.beds.length - 1).multiplyScalar(0.92) },
          uShade: { value: o.shade },
        },
      })
    )
  )

  // ── cut faces ───────────────────────────────────────────────────────────
  // One strip per edge, walked as a single loop so `aPerim` is continuous all
  // the way round. Each entry is [gridX, gridZ] along the outside of the plan.
  const ring = []
  for (let x = 0; x < nx; x++) ring.push([x, 0])
  for (let z = 1; z < nz; z++) ring.push([nx - 1, z])
  for (let x = nx - 2; x >= 0; x--) ring.push([x, nz - 1])
  for (let z = nz - 2; z >= 1; z--) ring.push([0, z])
  ring.push(ring[0])

  // The rim is flat, so the ground meets the lip at one height everywhere and
  // the cut below it starts one fillet radius down.
  const rimY = at(0, 0)
  const wallTopY = rimY - fr

  // The vertical profile of the cut: straight down, then tucked under to the
  // base by a second fillet. `off` is how far in from the outline, `tilt` how
  // far the surface has turned from vertical towards facing down.
  const profile = [
    { off: 0, y: wallTopY, tilt: 0 },
    { off: 0, y: bottomY + fr, tilt: 0 },
  ]
  const FILLET_STEPS = fr > 0 ? 7 : 0
  for (let k = 1; k <= FILLET_STEPS; k++) {
    const th = (k / FILLET_STEPS) * (Math.PI / 2)
    profile.push({
      off: fr * (1 - Math.cos(th)),
      y: bottomY + fr - fr * Math.sin(th),
      tilt: th,
    })
  }
  const L = profile.length

  // Outline positions and normals, once.
  const outline = ring.map(([gx, gz]) => {
    const [px, pz] = roundPlan(planX(gx), planZ(gz))
    const [nxv, nzv] = planNormal(px, pz)
    return { px, pz, nxv, nzv, gx, gz, u: gx / (nx - 1), v: gz / (nz - 1) }
  })

  // Arc length round the outline, so the beds keep an even thickness instead
  // of stretching on whichever edge carries fewer samples.
  let total = 0
  const cum = [0]
  for (let i = 1; i < outline.length; i++) {
    total += Math.hypot(
      outline[i].px - outline[i - 1].px,
      outline[i].pz - outline[i - 1].pz
    )
    cum.push(total)
  }

  const pos = []
  const nor = []
  const per = []
  const puv = []
  const etch = []
  const bed = []
  const idx = []

  // The beds dip in one consistent compass direction rather than towards
  // whichever wall you happen to be looking at, so the tilt agrees all the way
  // round the block instead of reversing at every corner.
  const dipAz = ((hashString(o.place ?? '') % 360) * Math.PI) / 180
  const dipCos = Math.cos(dipAz)
  const dipSin = Math.sin(dipAz)
  const halfDiag = Math.hypot(W, D) / 2

  // Ground height a little inside the rim — the rim itself is flattened, so
  // sampling it would tell the beds nothing about the landscape.
  const inset = Math.max(2, Math.round(nx * 0.12))
  const surfAt = (gx, gz) => {
    const x = Math.min(nx - 1 - inset, Math.max(inset, gx))
    const z = Math.min(nz - 1 - inset, Math.max(inset, gz))
    return surface[z * nx + x]
  }

  // The letter is cut into the face that looks towards the camera in a row of
  // blocks: the short one, at +z. Glyph coordinates are worked out in world
  // units and kept square, so the character is never stretched to the face.
  const faceTop = wallTopY
  const faceBottom = bottomY
  const faceMidY = (faceTop + faceBottom) / 2
  const glyph = Math.max(1e-6, (faceTop - faceBottom) * o.etchSize)

  for (let i = 0; i < outline.length; i++) {
    const { px, pz, nxv, nzv, gx, gz, u, v } = outline[i]
    const t = cum[i] / (total || 1)
    for (let j = 0; j < L; j++) {
      const { off, y, tilt } = profile[j]
      pos.push(px - nxv * off, y, pz - nzv * off)
      const c = Math.cos(tilt)
      nor.push(nxv * c, -Math.sin(tilt), nzv * c)
      per.push(t)
      puv.push(u, 1 - v)

      // Masked by how squarely this vertex faces +z, so the glyph lives on the
      // flat face and fades out before the rounded corners rather than being
      // dragged around them.
      const mask = Math.max(0, Math.min(1, (nzv - 0.86) / 0.12))
      etch.push(px / glyph + 0.5, (y - faceMidY) / glyph + 0.5, mask)
      bed.push((px * dipCos + pz * dipSin) / halfDiag, surfAt(gx, gz))
    }
    if (i < outline.length - 1) {
      for (let j = 0; j < L - 1; j++) {
        const a = i * L + j
        const b = (i + 1) * L + j
        idx.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }

  const wall = new THREE.BufferGeometry()
  wall.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  wall.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  wall.setAttribute('aPerim', new THREE.Float32BufferAttribute(per, 1))
  wall.setAttribute('aPlanUV', new THREE.Float32BufferAttribute(puv, 2))
  wall.setAttribute('aEtch', new THREE.Float32BufferAttribute(etch, 3))
  wall.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 2))
  wall.setIndex(idx)

  group.add(
    new THREE.Mesh(
      wall,
      new THREE.ShaderMaterial({
        vertexShader: WALL_VERT,
        fragmentShader: WALL_FRAG,
        uniforms: {
          uMap: { value: texture },
          uBedCol: { value: padColors(column.beds) },
          uBedY: { value: padFloats(column.bounds) },
          uBedN: { value: Math.min(MAX_BEDS, column.beds.length) },
          uDip: { value: column.dip },
          uFold: { value: column.fold },
          uConform: { value: column.conform },
          uGrain: { value: column.grain },
          uTopY: { value: wallTopY },
          uBottomY: { value: bottomY },
          uLightDir: { value: lightDir },
          uEtch: { value: o.letter ? glyphTexture(o.letter) : BLANK() },
          uHasEtch: { value: o.letter ? 1 : 0 },
          uEtchDepth: { value: o.etchDepth },
        },
        // The ring is wound consistently, but the fillet turns the surface
        // through ninety degrees; drawing both sides saves special-casing it.
        side: THREE.DoubleSide,
      })
    )
  )

  // ── base ────────────────────────────────────────────────────────────────
  // A fan over the outline pulled in by the bottom fillet. Barely ever seen,
  // but without it the block is hollow when the camera drops.
  const bpos = [0, bottomY, 0]
  for (let i = 0; i < outline.length; i++) {
    const { px, pz, nxv, nzv } = outline[i]
    bpos.push(px - nxv * fr, bottomY, pz - nzv * fr)
  }
  const bidx = []
  for (let i = 1; i < outline.length; i++) bidx.push(0, i + 1, i)
  const base = new THREE.BufferGeometry()
  base.setAttribute('position', new THREE.Float32BufferAttribute(bpos, 3))
  base.setIndex(bidx)
  base.computeVertexNormals()
  group.add(
    new THREE.Mesh(
      base,
      new THREE.MeshBasicMaterial({
        color: bedColor(column, 0).multiplyScalar(0.62),
        side: THREE.DoubleSide,
      })
    )
  )

  group.userData = { W, D, topY, bottomY, column, stats: field.stats }
  return group
}

/** Load an image and build a block from it in one step. */
export function loadBrick(url, opts) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const tex = new THREE.Texture(img)
      tex.needsUpdate = true
      resolve(makeBrick(tex, img, opts))
    }
    img.onerror = () => reject(new Error(`could not load ${url}`))
    img.src = url
  })
}
