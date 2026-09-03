import { useState, useRef, useCallback, useEffect } from 'react'
import { LETTERS } from './data/letters'
import Header from './components/Header'
import Board from './components/Board'
import Colophon from './components/Colophon'
import WatercolorCanvas from './components/WatercolorCanvas'
import { downloadCollage } from './utils/collage'

function parseLines(rawText) {
  return rawText.split('\n').map((line, lineIdx) => {
    const cleaned = line.toUpperCase().replace(/[^A-Z ]/g, '').replace(/ {2,}/g, ' ').trim()
    if (!cleaned) return { type: 'break', lineIdx }
    const chars = cleaned.split('').map((ch, charIdx) => ({
      ch,
      type: ch === ' ' ? 'space' : 'letter',
      key: `${lineIdx}-${charIdx}-${ch}`,
    }))
    return { type: 'row', lineIdx, chars }
  })
}

function computeTileW(lines, boardEl) {
  if (!boardEl) return 118
  const availW = boardEl.clientWidth - 56
  if (availW <= 0) return 118
  let size = 118
  const gap = 6
  for (const line of lines) {
    if (line.type !== 'row') continue
    const letters = line.chars.filter(c => c.type === 'letter' && LETTERS[c.ch]).length
    const spaces  = line.chars.filter(c => c.type === 'space').length
    const n = letters + spaces
    if (n < 2) continue
    const fit = (availW - (n - 1) * gap) / (letters + spaces * 0.37)
    if (fit > 0) size = Math.min(size, fit)
  }
  return Math.max(72, Math.floor(size))
}

export default function App() {
  const [text,          setText]          = useState('')
  const [renderedLines, setRenderedLines] = useState([])
  const [tileW,         setTileW]         = useState(118)
  const [vs,            setVs]            = useState({})
  const [toastMsg,      setToastMsg]      = useState('')
  const [toastVisible,  setToastVisible]  = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installVisible,setInstallVisible]= useState(false)

  const boardRef      = useRef(null)
  const exportCanvasRef = useRef(null)
  const toastTimer    = useRef(null)

  const showToast = useCallback((msg, ms = 2500) => {
    setToastMsg(msg)
    setToastVisible(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), ms)
  }, [])

  const handleRender = useCallback(() => {
    const lines = parseLines(text)
    const newTileW = computeTileW(lines, boardRef.current)
    setTileW(newTileW)
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
  }, [text])

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

  const handleResizeTiles = useCallback(delta => {
    setTileW(prev => Math.max(32, Math.min(200, prev + delta)))
  }, [])

  const handleClearAll = useCallback(() => {
    setText('')
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

  // Keyboard shortcut: Cmd/Ctrl + Enter → render
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
      showToast('App installed — find it on your home screen')
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
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () =>
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
          .catch(e => console.warn('[WWN] SW failed:', e))
      )
    }
  }, [])

  return (
    <>
      <WatercolorCanvas />
      <canvas ref={exportCanvasRef} id="c" style={{ display: 'none' }} />

      {/* Inline SVG glass filters — referenced by backdrop-filter: url(#...) in CSS */}
      <svg style={{ display: 'none', position: 'absolute' }} xmlns="http://www.w3.org/2000/svg">
        <filter id="glass-surface" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.008" numOctaves="2" seed="92" result="noise"/>
          <feGaussianBlur in="noise" stdDeviation="3" result="softMap"/>
          <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="0.8" specularExponent="120" lightingColor="white" result="specLight">
            <fePointLight x="-300" y="-300" z="400"/>
          </feSpecularLighting>
          <feComposite in="specLight" in2="SourceAlpha" operator="in" result="specClipped"/>
          <feComposite in="SourceGraphic" in2="specClipped" operator="arithmetic" k1="0" k2="1" k3="0.4" k4="0" result="litSrc"/>
          <feDisplacementMap in="litSrc" in2="softMap" scale="18" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
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
      </svg>

      <div className="page">
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
          <div className="compose-card">
            <div className="textarea-row">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={'Paste a poem, a sentence, a whole essay…\nPunctuation & numbers are stripped automatically.\nEach line becomes its own row of satellite tiles.'}
                rows={4}
              />
              <button className="render-btn" onClick={handleRender}>
                Render
                <small>⌘ ↵</small>
              </button>
            </div>
            <p className="compose-note">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="7" cy="7" r="6" stroke="rgba(28,26,16,0.25)" strokeWidth="1"/>
                <path d="M7 6v4M7 4.5v.5" stroke="rgba(28,26,16,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Punctuation and numbers are stripped automatically — only letters and spaces pass through.
              Each line becomes a row; blank lines add a stanza break. Click any tile to cycle its satellite scene.
            </p>
          </div>
        </section>

        <Board
          ref={boardRef}
          renderedLines={renderedLines}
          tileW={tileW}
          vs={vs}
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
    </>
  )
}
