import { useState, useEffect, useCallback, useRef } from 'react'
import { LETTERS, TITLE_LINES } from '../data/letters'

const SP_RATIO = 0.5
const GAP = 4

function titleTileSize(container) {
  if (!container) return 64
  const availW = container.clientWidth
  if (availW <= 0) return 64
  let minFit = 64
  TITLE_LINES.forEach(line => {
    const letters = [...line].filter(c => c !== ' ' && LETTERS[c]).length
    const spaces  = [...line].filter(c => c === ' ').length
    const n = letters + spaces
    if (n < 1) return
    const fit = (availW - (n - 1) * GAP) / (letters + spaces * SP_RATIO)
    if (fit > 0) minFit = Math.min(minFit, fit)
  })
  return Math.max(36, Math.min(84, Math.floor(minFit)))
}

function initTitleVs() {
  const vs = {}
  TITLE_LINES.forEach((line, li) => {
    ;[...line].forEach((ch, i) => {
      if (ch !== ' ' && LETTERS[ch]) {
        const key = `title-${li}-${i}-${ch}`
        vs[key] = Math.floor(Math.random() * LETTERS[ch].length)
      }
    })
  })
  return vs
}

export default function Header() {
  const containerRef = useRef(null)
  const [tSize, setTSize] = useState(84)
  const [vs, setVs] = useState(initTitleVs)

  const recalcSize = useCallback(() => {
    setTSize(titleTileSize(containerRef.current))
  }, [])

  useEffect(() => {
    recalcSize()
    let timer
    const handler = () => { clearTimeout(timer); timer = setTimeout(recalcSize, 80) }
    window.addEventListener('resize', handler)
    return () => { window.removeEventListener('resize', handler); clearTimeout(timer) }
  }, [recalcSize])

  function cycleTitle(key, ch) {
    setVs(prev => ({
      ...prev,
      [key]: ((prev[key] || 0) + 1) % LETTERS[ch].length
    }))
  }

  return (
    <header className="masthead">
      <span className="over">NASA Landsat · Satellite Imagery Collage</span>

      <div className="title-collage" ref={containerRef}>
        {TITLE_LINES.map((line, li) => (
          <div key={li} className="title-row">
            {[...line].map((ch, i) => {
              if (ch === ' ') {
                return (
                  <div
                    key={`sp-${li}-${i}`}
                    style={{ width: Math.round(tSize * SP_RATIO), flexShrink: 0 }}
                  />
                )
              }
              const variants = LETTERS[ch]
              if (!variants) return null
              const key = `title-${li}-${i}-${ch}`
              const vi  = (vs[key] || 0) % variants.length
              const { url, label } = variants[vi]
              return (
                <TitleTile
                  key={key}
                  tileKey={key}
                  ch={ch}
                  url={url}
                  label={label}
                  tSize={tSize}
                  onClick={() => cycleTitle(key, ch)}
                />
              )
            })}
          </div>
        ))}
      </div>

      <p className="sub">Rivers, glaciers &amp; coastlines — shaped into letters from orbit</p>

      <div className="ornament">
        <div className="ornament-rule" />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5.5" fill="currentColor" opacity="0.65"/>
          <line x1="12" y1="1"    x2="12" y2="4.5"  stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="12" y1="19.5" x2="12" y2="23"   stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="1"  y1="12"   x2="4.5"  y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="19.5" y1="12" x2="23" y2="12"   stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          <line x1="3.5" y1="3.5" x2="6"    y2="6"    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="18"  y1="18"  x2="20.5" y2="20.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="20.5" y1="3.5" x2="18" y2="6"    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <line x1="6"   y1="18"  x2="3.5"  y2="20.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <div className="ornament-rule" />
      </div>
    </header>
  )
}

function TitleTile({ ch, url, label, tSize, onClick }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div
      className="title-tile"
      style={{ width: tSize, height: tSize }}
      onClick={onClick}
    >
      <img
        src={url}
        alt={`${ch} — ${label}`}
        className={loaded ? '' : 'loading'}
        onLoad={() => setLoaded(true)}
      />
      <div className="t-wash" />
      <div className="t-char">{ch}</div>
      <div className="t-tip">{label}</div>
    </div>
  )
}
