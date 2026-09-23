import { forwardRef, useMemo } from 'react'
import Tile from './Tile'
import Tile3D from './Tile3D'
import FlockLayer from './FlockLayer'
import usePanelGlass, { glassSupported } from '../hooks/usePanelGlass'
import LiquidGlassPanel from '../ui-elements/liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from '../ui-elements/liquid-glass/panelPreset'
import GlassButtons from '../ui-elements/glass-buttons/GlassButtons'
import { WIDE_WIDTH, INSTALL_WIDTH, SAVE_TINT } from '../ui-elements/glass-buttons/constants.ts'

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
    { key: 'clear', label: '✕', title: 'Clear', onClick: onClear, fallbackClass: 'icon-btn' },
    { key: 'save', label: 'Save', title: 'Save as PNG', onClick: onSave, width: WIDE_WIDTH, tint: SAVE_TINT, fallbackClass: 'save-btn' },
  ], [blocks, onToggleDisplay, onShuffle, onResize, onClear, onSave])

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

      <div className="board" id="collage" ref={ref}>
        {glassSupported && <LiquidGlassPanel params={PANEL_GLASS} />}
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
                      style={{ width: Math.round(tileW * 0.37) }}
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
                    tileW={tileW}
                    onCycle={onCycleVariant}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </section>
  )
})

export default Board
