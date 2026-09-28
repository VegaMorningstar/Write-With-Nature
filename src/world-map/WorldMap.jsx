import { useEffect, useRef, useState } from 'react'
import { LETTERS } from '../data/letters'
import { theme, onThemeChange } from '../theme'
import { mapStyle, landColour } from './basemap'
import usePanelGlass, { glassSupported } from '../hooks/usePanelGlass'
import LiquidGlassPanel from '../ui-elements/liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from '../ui-elements/liquid-glass/panelPreset'

/**
 * Every Landsat scene, on the ground it was taken from.
 *
 * The alphabet is made of real places, and until now the page said so without
 * showing it. Each marker is the scene itself rather than a pin, so the map
 * reads as the library laid out over the Earth.
 *
 * MapLibre rather than Google Maps. Google needs an API key, which on a static
 * site ships inside the bundle for anyone to read, and bills per map load;
 * more to the point it will not let a map be both themed from code and given
 * custom markers — its own docs say inline styles are "not available when
 * using a map ID", and a map ID is what advanced markers require. Themed from
 * code is the half that matters here, because the theme has to turn over when
 * the jelly is pressed.
 */

/** Marker size on screen, zoomed in. The thumbnails are encoded at 96px,
 *  so this stays sharp on a retina screen up to PIN. */
const PIN = 44
/** And zoomed out, where they have to share the room. */
const PIN_MIN = 26

/**
 * One marker per place, not per scene.
 *
 * 36 of the 120 scenes share a coordinate with another — the false-colour
 * renderings of one piece of ground, and the handful of letters cut from the
 * same picture. Drawn per scene, those stack into an unreadable pile that
 * looks like a rendering bug. Grouped, a place is one marker that knows it has
 * several scenes behind it.
 */
function placesFrom(letters) {
  const byPoint = new Map()
  for (const [ch, scenes] of Object.entries(letters)) {
    for (const scene of scenes) {
      if (!scene.coords) continue
      const { lat, lng } = scene.coords
      const key = `${lat},${lng}`
      if (!byPoint.has(key)) {
        byPoint.set(key, { key, lat, lng, place: scene.coords.place, map: scene.coords.map, dms: scene.coords.dms, scenes: [] })
      }
      byPoint.get(key).scenes.push({ ...scene, ch })
    }
  }
  return [...byPoint.values()]
}

/** images/A/a-3-Foo.webp -> map-thumbs/A__a-3-Foo.webp, as written by
 *  scripts/make-map-thumbs.mjs. */
function thumbFor(scene, base) {
  const prefix = `${base}images/`
  if (!scene.url.startsWith(prefix)) return scene.url
  const stem = scene.url.slice(prefix.length).replace(/\.webp$/, '')
  return `${base}map-thumbs/${stem.replace('/', '__')}.webp`
}

/**
 * Fetch the map library, at most once.
 *
 * Split from building the map so the download can start when the panel comes
 * near while the map itself waits to be asked for. The scroll takes about a
 * second to open, which is usually enough to cover the rest.
 */
let libraryPromise = null
function warmLibrary() {
  if (!libraryPromise) {
    libraryPromise = Promise.all([
      import('maplibre-gl'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ]).then(([lib]) => lib)
    // A failed warm-up must not be cached as a permanent failure; the next
    // attempt should be allowed to try the network again.
    libraryPromise.catch(() => { libraryPromise = null })
  }
  return libraryPromise
}

export default function WorldMap() {
  const panelRef = useRef(null)
  usePanelGlass(panelRef, { scale: -80, chroma: 5, blur: 2.5, saturate: 1.3, mode: 'polar', aberrationIntensity: 5, elasticity: 0 })

  const holder = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [open, setOpen] = useState(null)   // the place whose scenes are on show
  const [failed, setFailed] = useState(null)

  // Rolled up to start. The panel is a scroll an explorer opens, and it also
  // means the map is not the first thing competing for attention at the foot
  // of the page.
  const [unrolled, setUnrolled] = useState(false)
  const rollRef = useRef(null)

  useEffect(() => {
    const el = holder.current
    if (!el || mapRef.current) return
    const base = import.meta.env.BASE_URL
    const places = placesFrom(LETTERS)
    let dead = false
    let map = null

    const build = async () => {
      // MapLibre is about a megabyte, and this panel is at the foot of a page
      // whose whole first screen is a place to type. Loaded statically it went
      // into the main chunk and doubled it, so everyone paid for the map on
      // first paint whether they ever scrolled to it.
      //
      // warmLibrary() below starts the download when the panel comes near, so
      // by the time the scroll is opened it is usually already in cache; this
      // awaits whatever that started, or starts it now.
      let MapLibreMap, Marker, NavigationControl
      try {
        ;({ Map: MapLibreMap, Marker, NavigationControl } = await warmLibrary())
      } catch {
        if (!dead) setFailed('The map library could not be loaded.')
        return
      }
      if (dead) return

      let style
      try {
        style = await mapStyle(theme())
      } catch (e) {
        // The basemap is a third party. If it is down the panel says so rather
        // than leaving an empty rectangle that looks like a broken build.
        if (!dead) setFailed('The basemap could not be reached.')
        return
      }
      if (dead) return

      // Framed to the scenes rather than to a guessed centre and zoom. The
      // library reaches from Deception Island to the Greenland fjords, and a
      // hand-picked view cut both ends off; asking the data where it is means
      // the panel opens showing all of it whatever is added later.
      const lngs = places.map(p => p.lng)
      const lats = places.map(p => p.lat)
      const bounds = [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ]

      map = new MapLibreMap({
        container: el,
        style,
        bounds,
        // Room for the markers, which stand on their point and are drawn well
        // outside it — fitting the coordinates alone clips the outermost
        // thumbnails against the edge of the panel.
        fitBoundsOptions: { padding: PIN, maxZoom: 3 },
        attributionControl: { compact: true },
        // One Earth. By default MapLibre repeats the world sideways forever,
        // which at this zoom puts a second Canada and a third Philippines in
        // the same frame and reads as a rendering fault rather than as a
        // globe. There is also nothing here that needs to cross the date line.
        renderWorldCopies: false,
        // The scenes are places, not a route; tilting and spinning the globe
        // adds nothing to read and a lot to get lost in.
        pitchWithRotate: false,
        dragRotate: false,
        touchZoomRotate: false,
        // The page scrolls through this panel. A map that swallowed the wheel
        // would trap the reader in it, so zooming is by the buttons, a pinch,
        // or a double click.
        scrollZoom: false,
      })
      mapRef.current = map
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right')

      // MapLibre reports a bad style, a refused tile or a lost context as an
      // `error` event, not as a thrown exception, so without this a broken map
      // is a silent blank rectangle.
      map.on('error', e => {
        // eslint-disable-next-line no-console
        console.warn('[world-map]', e?.error?.message ?? e)
      })
      // A handle for the dev server only, so the map can be asked what it
      // thinks it is drawing. Stripped from the production build.
      if (import.meta.env.DEV) window.__wwnMap = map

      // Smaller markers when the whole world is in frame, larger as you go in.
      // At one size they either crowd into an unreadable heap at world zoom —
      // the Amazon alone has eight scenes within a few degrees — or are too
      // small to make out once you are over a single country.
      const sizePins = () => {
        const z = map.getZoom()
        const t = Math.min(1, Math.max(0, (z - 1) / 4))   // 0 at z1, 1 at z5
        el.style.setProperty('--wm-pin', `${Math.round(PIN_MIN + (PIN - PIN_MIN) * t)}px`)
      }
      sizePins()
      map.on('zoom', sizePins)

      for (const place of places) {
        const node = document.createElement('button')
        node.type = 'button'
        node.className = 'wm-pin'
        node.title = place.place
        node.setAttribute('aria-label',
          `${place.place} — ${place.scenes.length} Landsat ${place.scenes.length === 1 ? 'scene' : 'scenes'}`)

        const img = document.createElement('img')
        img.src = thumbFor(place.scenes[0], base)
        img.alt = ''
        img.loading = 'lazy'
        img.decoding = 'async'
        node.appendChild(img)

        // The letters this place spells, so a marker says what it is for.
        const tag = document.createElement('span')
        tag.className = 'wm-pin-chars'
        tag.textContent = [...new Set(place.scenes.map(s => s.ch))].join('')
        node.appendChild(tag)

        node.addEventListener('click', e => {
          e.stopPropagation()
          setOpen(place)
          map.easeTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 4), duration: 700 })
        })

        markersRef.current.push(
          new Marker({ element: node }).setLngLat([place.lng, place.lat]).addTo(map)
        )
      }
    }

    // Built when the panel comes near, and deliberately not when the scroll
    // is opened.
    //
    // Building it costs a library, a GL context and 84 marker nodes, and the
    // height of the scroll animates on the main thread. Doing both at once
    // starved the animation completely: measured, the sheet sat at 0 for the
    // first 300ms and then jumped to full. Built in advance, the click has
    // nothing left to do but let the transition run.
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      io.disconnect()
      build()
    }, { rootMargin: '600px' })
    io.observe(el)

    return () => { dead = true; io.disconnect() }
  }, [])

  // Everything the map holds, released when the panel itself goes.
  useEffect(() => () => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    mapRef.current?.remove()
    mapRef.current = null
  }, [])

  // The map follows the page. Its own style is swapped rather than the map
  // rebuilt, so the view the reader had chosen is still there afterwards, and
  // the markers — which are DOM, not style — are untouched by it.
  useEffect(() => onThemeChange(async next => {
    const map = mapRef.current
    if (!map) return
    try {
      map.setStyle(await mapStyle(next), { diff: false })
    } catch {
      /* the previous style stays up, which is the right failure */
    }
  }), [])

  /**
   * A rolled map holds nothing open and catches no keyboard.
   *
   * The detail panel hangs below the scroll, so leaving it up under a rolled
   * map reads as a caption with nothing above it. And a clipped map is still
   * in the document: without `inert` its zoom buttons and all 84 markers stay
   * tabbable, so a keyboard would disappear into a map nobody can see.
   */
  useEffect(() => {
    if (!unrolled) setOpen(null)
    const el = rollRef.current
    if (!el) return
    // Set as an attribute rather than a prop: React 18 does not pass `inert`
    // through, and this works the same either way.
    if (unrolled) el.removeAttribute('inert')
    else el.setAttribute('inert', '')
  }, [unrolled])

  /** Start pulling the library down as the panel comes into view. */
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return
      io.disconnect()
      warmLibrary().catch(() => { /* build() reports it if it matters */ })
    }, { rootMargin: '600px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  /**
   * Nudge the map when the scroll opens, and again once it has settled.
   *
   * Precautionary rather than a fix for anything observed. The map is built
   * behind the closed scroll and comes up correctly on reveal — a clipped
   * container still has its full layout size, so MapLibre measures it right.
   * What this covers is the window being resized while the map was shut,
   * which changes --wm-height without the map hearing about it. resize()
   * re-reads the container and costs nothing when nothing has changed.
   */
  useEffect(() => {
    if (!unrolled) return
    const el = rollRef.current
    if (!el) return
    const settle = () => {
      const m = mapRef.current
      if (!m) return
      m.resize()
      m.triggerRepaint()
    }
    settle()                                  // as it starts to open
    el.addEventListener('transitionend', settle)   // and once it has
    return () => el.removeEventListener('transitionend', settle)
  }, [unrolled])

  const count = placesFrom(LETTERS).length

  return (
    <section className="world-map" ref={panelRef} aria-labelledby="world-map-title">
      {glassSupported && <LiquidGlassPanel params={PANEL_GLASS} />}
      <div className="world-map-text">
        <h3 id="world-map-title">Where the letters are</h3>
        <p>
          Every scene in the alphabet, on the ground it was photographed from — {count} places
          across the Earth. Pick one to see the letters cut from it.
        </p>
        <button
          type="button"
          className="world-map-latch"
          onClick={() => setUnrolled(u => !u)}
          aria-expanded={unrolled}
          aria-controls="world-map-roll"
        >
          {unrolled ? 'Roll it up' : 'Unroll the map'}
        </button>
      </div>

      {/* The scroll: a clipping box whose height is the thing that animates,
          and a rod below it in normal flow.

          The rod sits outside the clip on purpose. Inside it, a rolled-up map
          would clip the rod away too and leave nothing on the page to say a
          map was ever there. Left in flow rather than positioned, so growing
          the box carries the rod down with the leading edge on its own. */}
      <div
        className="world-map-roll"
        id="world-map-roll"
        ref={rollRef}
        data-unrolled={unrolled ? 'true' : 'false'}
      >
        <div className="world-map-canvas" style={{ background: landColour(theme()) }}>
          <div ref={holder} className="world-map-gl" />
          {failed && <p className="world-map-failed">{failed}</p>}
        </div>
      </div>
      <div className="world-map-dowel" aria-hidden="true" />

      {open && (
        <div className="world-map-detail">
          <div className="world-map-detail-head">
            <h4>{open.place}</h4>
            <button type="button" onClick={() => setOpen(null)} aria-label="Close">✕</button>
          </div>
          {open.map
            ? <a className="world-map-dms" href={open.map} target="_blank" rel="noreferrer">{open.dms}</a>
            : <span className="world-map-dms">{open.dms}</span>}
          <div className="world-map-scenes">
            {open.scenes.map(s => (
              <figure key={s.url}>
                <img src={s.url} alt={s.label} loading="lazy" />
                <figcaption><b>{s.ch}</b> {s.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
