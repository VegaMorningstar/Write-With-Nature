import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { LETTERS } from './data/letters'
import { BRICK_ADVANCE, BRICK_WIDTH } from './lib/brickAssets'
import Header from './components/Header'
import Board from './components/Board'
import Colophon from './components/Colophon'
import { downloadCollage } from './utils/collage'
import usePanelGlass, { glassSupported } from './hooks/usePanelGlass'
import LiquidGlassPanel from './ui-elements/liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from './ui-elements/liquid-glass/panelPreset'
import FluidCursor from './components/FluidCursor'
import NightSky from './night-sky/NightSky'
import ThemeTransition from './theme-transition/ThemeTransition'
import GlassButtons from './ui-elements/glass-buttons/GlassButtons'
import { RENDER_MATERIAL, RENDER_WIDTH } from './ui-elements/glass-buttons/constants.ts'
import { ButterflyLoader } from './butterflies/react'
import { CursorButterflies } from './cursor-butterflies/react'

function parseLines(rawText) {
  return rawText.split('\n').map((line, lineIdx) => {
    // Digits are kept as well as letters — NASA's gallery gained numerals in its
    // 2026 refresh, so a year or a house number has scenes behind it now.
    const cleaned = line.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/ {2,}/g, ' ').trim()
    if (!cleaned) return { type: 'break', lineIdx }
    const chars = cleaned.split('').map((ch, charIdx) => ({
      ch,
      type: ch === ' ' ? 'space' : 'letter',
      key: `${lineIdx}-${charIdx}-${ch}`,
    }))
    return { type: 'row', lineIdx, chars }
  })
}

/** How large a letter may be drawn, in pixels. Blocks want the room. */
const MAX_TILE = 190
const MIN_TILE = 84

/**
 * The largest letter size whose longest row still fits the board.
 *
 * Blocks and flat tiles take different amounts of room for the same letter:
 * blocks overlap their neighbours and are narrower than they are tall, while a
 * flat tile is a square that touches the next one. Sizing both the same way
 * either overflows the panel or shrinks for space nothing is using.
 */
function computeTileW(lines, boardEl, blocks) {
  if (!boardEl) return MAX_TILE
  const availW = boardEl.clientWidth - 56
  if (availW <= 0) return MAX_TILE
  let size = MAX_TILE
  const gap = 6
  for (const line of lines) {
    if (line.type !== 'row') continue
    const letters = line.chars.filter(c => c.type === 'letter' && LETTERS[c.ch]).length
    const spaces  = line.chars.filter(c => c.type === 'space').length
    const n = letters + spaces
    if (n < 2) continue
    // Blocks overlap, so each costs less room than its own width — except the
    // last one in the row, which has nothing to tuck under and pays in full.
    // A flat tile is simply a square.
    const run = !blocks
      ? letters
      : letters > 0
        ? (letters - 1) * BRICK_ADVANCE + BRICK_WIDTH
        : 0
    const fit = (availW - (n - 1) * gap) / (run + spaces * 0.37)
    if (fit > 0) size = Math.min(size, fit)
  }
  return Math.max(MIN_TILE, Math.floor(size))
}

export default function App() {
  const [text,          setText]          = useState('')
  const [renderedLines, setRenderedLines] = useState([])
  const [tileW,         setTileW]         = useState(MAX_TILE)
  const [vs,            setVs]            = useState({})
  const [toastMsg,      setToastMsg]      = useState('')
  const [toastVisible,  setToastVisible]  = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installVisible,setInstallVisible]= useState(false)

  /** 'brick' shows each letter as a 3D block; 'tile' is the flat scene. */
  const [display, setDisplay] = useState(() => {
    try { return localStorage.getItem('wwn-display') === 'tile' ? 'tile' : 'brick' }
    catch { return 'brick' }
  })
  const toggleDisplay = useCallback(() => {
    setDisplay(prev => {
      const next = prev === 'brick' ? 'tile' : 'brick'
      try { localStorage.setItem('wwn-display', next) } catch { /* private mode */ }
      return next
    })
  }, [])

  // Blocks and flat tiles take different room, so the letter size has to be
  // worked out again whenever the board switches between them.
  useEffect(() => {
    if (!renderedLines.length) return
    setTileW(computeTileW(renderedLines, boardRef.current, display === 'brick'))
  }, [display, renderedLines])

  // Whether the composer holds something not yet on the board. Drives the
  // RENDER button's glow, so it is obvious there is a step left to take.
  const [rendered, setRendered] = useState('')
  const pending = text.trim().length > 0 && text !== rendered
  const [jiggle, setJiggle] = useState(false)

  // Butterfly loading screen. What covers the page is the cluster itself —
  // the butterflies and the shadows they cast — so the page is revealed as
  // they scatter and those shadows lift, rather than by a curtain coming up.
  // Once the field hands over, whatever is left of it fades out.
  const [loadPhase, setLoadPhase] = useState('load') // 'load' | 'fade' | 'done'

  useEffect(() => {
    document.body.style.overflow = loadPhase === 'load' ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [loadPhase])

  const boardRef      = useRef(null)
  const composeRef    = useRef(null)
  const exportCanvasRef = useRef(null)
  const toastTimer    = useRef(null)

  usePanelGlass(composeRef, { scale: -80, chroma: 5, blur: 2.5, saturate: 1.3, mode: 'standard', aberrationIntensity: 6, elasticity: 0 })

  const showToast = useCallback((msg, ms = 2500) => {
    setToastMsg(msg)
    setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), ms)
  }, [])

  const handleRender = useCallback(() => {
    if (!text.trim()) {
      showToast('Type something first — a word, a line, a whole poem')
      composeRef.current?.querySelector('textarea')?.focus()
      return
    }
    setJiggle(true)
    setTimeout(() => setJiggle(false), 600)
    setRendered(text)
    const lines = parseLines(text)
    setTileW(computeTileW(lines, boardRef.current, display === 'brick'))
    const newVs = {}
    lines.forEach(line => {
      if (line.type !== 'row') return
      line.chars.forEach(({ ch, key, type }) => {
        if (type === 'letter' && LETTERS[ch]) {
          newVs[key] = Math.floor(Math.random() * LETTERS[ch].length)
        }
      })
    })
    setVs(newVs)
    setRenderedLines(lines)
    setTimeout(() => boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [text, display, showToast])

  const handleShuffleAll = useCallback(() => {
    setVs(prev => {
      const next = {}
      Object.keys(prev).forEach(key => {
        const ch = key.split('-')[2]
        if (LETTERS[ch]) next[key] = Math.floor(Math.random() * LETTERS[ch].length)
      })
      return next
    })
    showToast('All scenes shuffled')
  }, [showToast])

  const handleCycleVariant = useCallback((key, ch) => {
    setVs(prev => {
      const newIdx = ((prev[key] || 0) + 1) % (LETTERS[ch]?.length || 1)
      showToast(`${ch} · ${LETTERS[ch]?.[newIdx]?.label || ''}`)
      return { ...prev, [key]: newIdx }
    })
  }, [showToast])

  const renderButton = useMemo(() => [
    { key: 'render', label: 'RENDER', title: 'Render the collage', onClick: handleRender, width: RENDER_WIDTH, fallbackClass: 'render-btn' },
  ], [handleRender])

  const handleResizeTiles = useCallback(delta => {
    setTileW(prev => Math.max(32, Math.min(200, prev + delta)))
  }, [])

  const handleClearAll = useCallback(() => {
    setText('')
    setRendered('')
    setRenderedLines([])
    setVs({})
  }, [])

  const handleSave = useCallback(() => {
    downloadCollage(exportCanvasRef.current, showToast)
  }, [showToast])

  const handleInstall = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOS) { showToast('Tap the Share icon ↑ then "Add to Home Screen"', 4000); return }
    if (!installPrompt) { showToast('Open in Chrome or Edge to install'); return }
    installPrompt.prompt()
    installPrompt.userChoice.then(c => {
      if (c.outcome === 'accepted') showToast('Installing…')
      setInstallPrompt(null)
    })
  }, [installPrompt, showToast])

  // Cmd/Ctrl + Enter renders from anywhere on the page. Plain Enter does it
  // from inside the composer — see onKeyDown on the textarea, where Shift
  // still has to mean a new line, because a poem needs them.
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); handleRender() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleRender])

  // PWA install prompt
  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setInstallPrompt(e); setInstallVisible(true) }
    const onInstalled = () => {
      setInstallPrompt(null); setInstallVisible(false)
      showToast('App installed. Find it on your home screen')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOS && !window.matchMedia('(display-mode: standalone)').matches) setInstallVisible(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [showToast])

  // Service worker
  //
  // Production only. sw.js caches './' and './index.html' in its shell, so in
  // dev it serves yesterday's HTML over today's — which silently undoes any
  // edit to index.html and leaves the dev server looking broken while what it
  // actually sends is correct. That cost a real debugging session: the theme
  // attribute is set by an inline script in index.html, so a stale shell meant
  // no attribute, and the page fell back to light no matter what was changed.
  //
  // Dev also tears down anything a previous build registered, because a worker
  // already installed keeps serving that shell long after this guard is added
  // and there is nothing in the app to undo it otherwise.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations()
        .then(rs => rs.forEach(r => r.unregister()))
        .catch(() => {})
      globalThis.caches?.keys()
        .then(keys => keys.filter(k => k.startsWith('wwn-')).forEach(k => caches.delete(k)))
        .catch(() => {})
      return
    }

    window.addEventListener('load', () =>
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(e => console.warn('[WWN] SW failed:', e))
    )
  }, [])

  return (
    <>
      <NightSky />
      <FluidCursor />
      {/* Only once the field has handed over — they belong to the page, not
          to the loading screen sitting on top of it. */}
      {loadPhase === 'done' && <CursorButterflies />}
<canvas ref={exportCanvasRef} id="c" style={{ display: 'none' }} />

      {/* SVG glass filter for small elements (buttons, inputs, alpha-cells) */}
      <svg style={{ display: 'none', position: 'absolute' }} xmlns="http://www.w3.org/2000/svg">
        <filter id="glass-element" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" seed="47" result="noise"/>
          <feGaussianBlur in="noise" stdDeviation="2" result="softMap"/>
          <feSpecularLighting in="softMap" surfaceScale="6" specularConstant="1" specularExponent="140" lightingColor="white" result="specLight">
            <fePointLight x="-200" y="-200" z="300"/>
          </feSpecularLighting>
          <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specClipped"/>
          <feComposite in="SourceGraphic" in2="specClipped" operator="arithmetic" k1="0" k2="1" k3="0.5" k4="0" result="litSrc"/>
          <feDisplacementMap in="litSrc" in2="softMap" scale="28" xChannelSelector="R" yChannelSelector="G"/>
        </filter>

        {/* Micro-roughness for the compose input. Fine turbulence displacing the
            backdrop a couple of pixels — the refractive half of frost, as
            distinct from the speckle painted on the fill. Separate from
            #glass-element, which displaces at 28: that is a warp of the whole
            surface rather than a roughness of it. */}
        <filter id="frost-scatter" x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="9" result="rough"/>
          <feDisplacementMap in="SourceGraphic" in2="rough" scale="2" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </svg>

      <div className="page">
        {/* Inside .page on purpose: that element sets z-index 20, which makes
            it a stacking context, so anything it contains is sealed under 20
            no matter how large its own z-index is. The sinking jelly lives in
            here, so the sky it has to rise above has to live in here too. */}
        <ThemeTransition />
        <Header />

        <svg className="vine" viewBox="0 0 960 24" fill="none">
          <path d="M0 12 Q80 3 160 12 Q240 21 320 12 Q400 3 480 12 Q560 21 640 12 Q720 3 800 12 Q880 21 960 12" stroke="rgba(74,124,63,0.18)" strokeWidth="1.2" fill="none"/>
          <ellipse cx="160" cy="6"  rx="6" ry="3" fill="rgba(74,124,63,0.18)" transform="rotate(-25 160 6)"/>
          <ellipse cx="320" cy="18" rx="6" ry="3" fill="rgba(74,124,63,0.15)" transform="rotate(25 320 18)"/>
          <ellipse cx="480" cy="6"  rx="6" ry="3" fill="rgba(74,124,63,0.18)" transform="rotate(-25 480 6)"/>
          <ellipse cx="640" cy="18" rx="6" ry="3" fill="rgba(74,124,63,0.15)" transform="rotate(25 640 18)"/>
          <ellipse cx="800" cy="6"  rx="6" ry="3" fill="rgba(74,124,63,0.18)" transform="rotate(-25 800 6)"/>
          <circle cx="80"  cy="12" r="2" fill="rgba(74,124,63,0.2)"/>
          <circle cx="240" cy="12" r="2" fill="rgba(74,124,63,0.2)"/>
          <circle cx="400" cy="12" r="2" fill="rgba(74,124,63,0.2)"/>
          <circle cx="560" cy="12" r="2" fill="rgba(74,124,63,0.2)"/>
          <circle cx="720" cy="12" r="2" fill="rgba(74,124,63,0.2)"/>
          <circle cx="880" cy="12" r="2" fill="rgba(74,124,63,0.2)"/>
        </svg>

        <section className="section">
          <div className="section-label">Compose</div>
          <div className="compose-card" ref={composeRef}>
            {glassSupported && <LiquidGlassPanel params={PANEL_GLASS} />}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                // Enter renders. Shift+Enter is the new line, as it is
                // everywhere else that sends on Enter.
                if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault()
                  handleRender()
                }
              }}
              placeholder={'Paste a poem, a sentence, a whole essay…\nEnter renders it; Shift+Enter starts a new line.\nPunctuation and numbers are stripped automatically.'}
              rows={4}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              {/* The same lens the alphabet is made of, one tile of it, with
                  the body's dispersion turned up so RENDER splits into colour
                  where it is read through the edges. Falls back to a plain
                  .render-btn where the glass cannot start.

                  The WebGPU jelly this replaced is still here, in
                  ui-elements/jelly-wireframe-button, and still driven by ?ui,
                  ?tune and ?preview — it is off the live page, not gone. */}
              <div
                className={`render-cta${pending ? ' urging' : ''}${jiggle ? ' jiggled' : ''}`}
              >
                <GlassButtons items={renderButton} material={RENDER_MATERIAL} />
              </div>
            </div>
            <p className="compose-note">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="7" cy="7" r="6" stroke="rgba(28,26,16,0.25)" strokeWidth="1"/>
                <path d="M7 6v4M7 4.5v.5" stroke="rgba(28,26,16,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Punctuation and numbers are stripped automatically. Only letters and spaces pass through.
              Press Enter to render, Shift+Enter for a new line; blank lines add a stanza break.
              Click any letter to cycle its satellite scene.
            </p>
          </div>
        </section>

        <Board
          ref={boardRef}
          renderedLines={renderedLines}
          tileW={tileW}
          vs={vs}
          display={display}
          onToggleDisplay={toggleDisplay}
          onShuffle={handleShuffleAll}
          onResize={handleResizeTiles}
          onClear={handleClearAll}
          onCycleVariant={handleCycleVariant}
          onSave={handleSave}
          onInstall={handleInstall}
          installVisible={installVisible}
        />

        <svg className="vine" viewBox="0 0 960 20" fill="none" style={{ marginTop: '3rem' }}>
          <path d="M0 10 Q60 2 120 10 Q180 18 240 10 Q300 2 360 10 Q420 18 480 10 Q540 2 600 10 Q660 18 720 10 Q780 2 840 10 Q900 18 960 10" stroke="rgba(74,124,63,0.14)" strokeWidth="1" fill="none"/>
        </svg>

        <Colophon />
      </div>

      <div className={`toast${toastVisible ? ' show' : ''}`}>{toastMsg}</div>

      {loadPhase !== 'done' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            // No background on purpose. The cluster is what hides the page,
            // so a solid colour here would sit behind every gap the
            // butterflies leave and there would be nothing to reveal. This
            // div is only a positioning box for the loader.
            opacity: loadPhase === 'fade' ? 0 : 1,
            transition: 'opacity 0.6s ease',
            pointerEvents: loadPhase === 'fade' ? 'none' : 'auto',
          }}
        >
          <ButterflyLoader
            invite="Tap or click anywhere to release"
            onReveal={() => {
              setLoadPhase('fade')
              window.setTimeout(() => setLoadPhase('done'), 940)
            }}
          />
        </div>
      )}
    </>
  )
}
