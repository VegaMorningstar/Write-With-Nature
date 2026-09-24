import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Tile from './Tile'
import Tile3D from './Tile3D'
import FlockLayer from './FlockLayer'
import usePanelGlass, { glassSupported } from '../hooks/usePanelGlass'
import LiquidGlassPanel from '../ui-elements/liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from '../ui-elements/liquid-glass/panelPreset'
import GlassButtons from '../ui-elements/glass-buttons/GlassButtons'
import { WIDE_WIDTH, INSTALL_WIDTH, SAVE_TINT } from '../ui-elements/glass-buttons/constants.ts'

/** Breathing room around the collage when it fills the screen. */
const FULL_PADDING = 40
/** Kept clear at the top for the close control and a hovered block's label. */
const FULL_HEADROOM = 64
/** Bounds on the fitted tile, so one letter does not become the whole screen. */
const FULL_TILE_MIN = 44
const FULL_TILE_MAX = 340

const Board = forwardRef(function Board(
  {
    renderedLines, tileW, vs,
    display = 'brick', onToggleDisplay,
    onShuffle, onResize, onClear, onCycleVariant, onSave, onInstall, installVisible,
  },
  ref
) {
  usePanelGlass(ref, { scale: -60, chroma: 4, blur: 2.5, saturate: 1.3, mode: 'prominent', aberrationIntensity: 8, elasticity: 0 })

  const hasContent = renderedLines.some(l => l.type === 'row')

  const letterCount = renderedLines.flatMap(l => l.type === 'row' ? l.chars.filter(c => c.type === 'letter') : []).length
  const lineCount   = renderedLines.filter(l => l.type === 'row').length

  // One lens each, in one canvas. `fallbackClass` is what they wear if the
  // glass never starts — the buttons these were before it existed.
  const blocks = display === 'brick'

  const toolbar = useMemo(() => [
    {
      key: 'display',
      label: blocks ? '◨' : '▦',
      title: blocks ? 'Show flat scenes instead of blocks' : 'Show 3D blocks instead of flat scenes',
      onClick: onToggleDisplay,
      fallbackClass: 'icon-btn',
    },
    { key: 'shuffle', label: '⇌', title: 'Shuffle all tiles', onClick: onShuffle, fallbackClass: 'icon-btn' },
    // Off the bar for now, pending a decision on how tile size gets changed.
    // Everything behind them is still wired: onResize is still passed in, and
    // App still clamps and holds tileW — these two lines are the whole of it.
    // { key: 'smaller', label: '−', title: 'Smaller tiles', onClick: () => onResize(-16), fallbackClass: 'icon-btn' },
    // { key: 'larger', label: '+', title: 'Larger tiles', onClick: () => onResize(16), fallbackClass: 'icon-btn' },
    // Only ever enters. Once it has, the bar is behind the board, so leaving
    // is the close control inside it, or Escape.
    {
      key: 'full',
      label: '⛶',
      title: 'Show the collage full screen',
      onClick: () => setExpanded(true),
      fallbackClass: 'icon-btn',
    },
    { key: 'clear', label: '✕', title: 'Clear', onClick: onClear, fallbackClass: 'icon-btn' },
    { key: 'save', label: 'Save', title: 'Save as PNG', onClick: onSave, width: WIDE_WIDTH, tint: SAVE_TINT, fallbackClass: 'save-btn' },
  ], [blocks, onToggleDisplay, onShuffle, onResize, onClear, onSave])

  // ── Full screen ───────────────────────────────────────────────────────────
  //
  // A CSS class on the board itself, not the Fullscreen API and not a portal.
  //
  // Not the Fullscreen API because iPhone Safari does not implement it for
  // arbitrary elements, and this app is installed to home screens — the one
  // platform where it would silently do nothing is a platform it is aimed at.
  //
  // Not a portal because moving the board would remount it, and the board owns
  // a WebGPU canvas and a three.js canvas per block. Those would be torn down
  // and rebuilt on the way in and again on the way out. Restyling in place
  // keeps every context alive, and the glass re-measures its element each
  // frame, so it fills the new size on its own.
  const [expanded, setExpanded] = useState(false)
  const rowsRef = useRef(null)
  const [fullTileW, setFullTileW] = useState(null)

  const collapse = useCallback(() => setExpanded(false), [])

  useEffect(() => {
    if (!expanded) return
    const onKey = e => {
      if (e.key !== 'Escape') return
      // Stopped here so the glass sheet's own Escape handler, which is also on
      // the document in capture, does not act on the same press.
      e.stopPropagation()
      collapse()
    }
    document.addEventListener('keydown', onKey, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prev
    }
  }, [expanded, collapse])

  /**
   * The tile size that makes the collage fill the screen.
   *
   * Measured rather than derived. Working it out from the character count
   * would mean modelling the blocks' geometry — they are wider than a tile,
   * overlap their neighbours by a pitch that varies per glyph, and differ in
   * height with their terrain — and that arithmetic would have to be kept in
   * step with landsat-brick.js forever. Asking the laid-out rows how big they
   * are is exact and stays exact.
   *
   * One pass is enough because the relationship is linear: the rows are
   * measured at the size they are currently drawn, and the tile size is scaled
   * by how far that is from fitting.
   */
  useLayoutEffect(() => {
    if (!expanded) {
      setFullTileW(null)
      return
    }
    const fit = () => {
      const el = rowsRef.current
      if (!el) return
      // The widest row, not the wrapper. The wrapper is a flex item and
      // stretches to the board's full width, so measuring it measures the
      // screen and the scale comes out as 1 — which is exactly what happened:
      // the tiles grew from 133px to 135.
      let w = 0
      for (const row of el.querySelectorAll('.collage-row')) {
        w = Math.max(w, row.scrollWidth)
      }
      const h = el.scrollHeight
      if (!w || !h) return
      const availW = Math.max(120, window.innerWidth - FULL_PADDING * 2)
      const availH = Math.max(120, window.innerHeight - FULL_PADDING * 2 - FULL_HEADROOM)
      const k = Math.min(availW / w, availH / h)
      setFullTileW(Math.round(Math.max(FULL_TILE_MIN, Math.min(FULL_TILE_MAX, tileW * k))))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [expanded, tileW, renderedLines, display])

  // Falls back to the page's own size until the measurement lands, which is
  // one frame, so the collage never renders at nothing.
  const shownTileW = expanded && fullTileW ? fullTileW : tileW

  const installButton = useMemo(() => [
    { key: 'install', label: 'Install App', title: 'Install this app', onClick: onInstall, width: INSTALL_WIDTH, fallbackClass: 'install-btn visible' },
  ], [onInstall])

  return (
    <section className="section" style={{ marginTop: '2rem' }}>
      <div className="collage-bar">
        <div className="section-label" id="collage-meta" style={{ marginBottom: 0 }}>
          {hasContent
            ? `${lineCount} line${lineCount !== 1 ? 's' : ''} · ${letterCount} letter${letterCount !== 1 ? 's' : ''}`
            : 'Collage'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <GlassButtons items={toolbar} />
          {/* Its own canvas rather than a sixth item in the toolbar's: the
              shader's tile count is fixed when the scene is built, so adding
              one would tear the whole bar down and rebuild it at whatever
              moment the install prompt happened to fire. */}
          {installVisible && <GlassButtons items={installButton} />}
        </div>
      </div>

      <div
        className={expanded ? 'board is-full' : 'board'}
        id="collage"
        ref={ref}
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded ? 'true' : undefined}
        aria-label={expanded ? 'Collage, full screen' : undefined}
      >
        {glassSupported && <LiquidGlassPanel params={PANEL_GLASS} />}

        {/* An opaque floor under the glass, and the only way to get one.
            usePanelGlass writes `background: transparent` as an INLINE style on
            this element so the shader can be the surface instead of CSS, and an
            inline style beats any stylesheet rule — so a background on
            .board.is-full is simply ignored while the glass is running. Without
            this the full-screen board is transparent and the page it is
            covering reads straight through it.

            z-index -2 puts it below the glass canvas at -1 rather than over it,
            so the panel still looks like glass; it just has something to be
            glass against. Fixed rather than absolute because the board scrolls,
            and `contain: layout` above makes the board the containing block for
            fixed children, so this stays put over exactly the board. */}
        {expanded && <div className="board-floor" aria-hidden="true" />}

        {expanded && (
          <button
            type="button"
            className="board-exit"
            onClick={collapse}
            title="Close full screen (Esc)"
            aria-label="Close full screen"
            autoFocus
          >
            ✕
          </button>
        )}
        {!hasContent && (
          <div className="board-empty">
            <svg width="54" height="54" viewBox="0 0 54 54" fill="none">
              <circle cx="27" cy="27" r="6.5" stroke="rgba(28,26,16,0.18)" strokeWidth="1.5"/>
              <rect x="9" y="24" width="11" height="6" rx="2" stroke="rgba(28,26,16,0.14)" strokeWidth="1.2"/>
              <rect x="34" y="24" width="11" height="6" rx="2" stroke="rgba(28,26,16,0.14)" strokeWidth="1.2"/>
              <line x1="20" y1="27" x2="23" y2="27" stroke="rgba(28,26,16,0.14)" strokeWidth="1.2"/>
              <line x1="31" y1="27" x2="34" y2="27" stroke="rgba(28,26,16,0.14)" strokeWidth="1.2"/>
              <path d="M12 40 Q27 46 42 40" stroke="rgba(42,107,94,0.18)" strokeWidth="1" strokeDasharray="2 3" fill="none"/>
              <path d="M12 14 Q27 8 42 14" stroke="rgba(42,107,94,0.18)" strokeWidth="1" strokeDasharray="2 3" fill="none"/>
            </svg>
            <p>Your satellite collage awaits</p>
            <small>compose something above</small>
          </div>
        )}

        {/* Flamingos cross the whole panel, not the word — the flyway belongs
            to the board, so it reads the same whatever is written on it. They
            fly over the blocks, which share their camera; over flat scenes
            there is no ground for them to be above. */}
        {hasContent && blocks && <FlockLayer />}

        {/* Wrapped so the rows can be measured as one block when fitting them
            to the screen. It is `display: contents` normally, so it changes
            nothing about the layout it is wrapping. */}
        <div className="collage-rows" ref={rowsRef}>
          {renderedLines.map((line, idx) => {
            if (line.type === 'break') {
              return <div key={`break-${idx}`} className="stanza-break" />
            }
            return (
              <div key={`row-${idx}`} className="collage-row">
                {line.chars.map(({ ch, type, key }) => {
                  if (type === 'space') {
                    return (
                      <div
                        key={key}
                        className="tile-space"
                        style={{ width: Math.round(shownTileW * 0.37) }}
                      />
                    )
                  }
                  const Cell = blocks ? Tile3D : Tile
                  return (
                    <Cell
                      key={key}
                      ch={ch}
                      tileKey={key}
                      variantIdx={vs[key] || 0}
                      tileW={shownTileW}
                      onCycle={onCycleVariant}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
})

export default Board
