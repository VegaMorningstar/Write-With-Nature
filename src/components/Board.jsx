import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Tile from './Tile'
import Tile3D from './Tile3D'
import FlockLayer from './FlockLayer'
import usePanelGlass, { glassSupported } from '../hooks/usePanelGlass'
import LiquidGlassPanel from '../ui-elements/liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from '../ui-elements/liquid-glass/panelPreset'
import GlassButtons from '../ui-elements/glass-buttons/GlassButtons'
import { WIDE_WIDTH, INSTALL_WIDTH, SAVE_TINT } from '../ui-elements/glass-buttons/constants.ts'

/**
 * How the board behaves when the collage is wider than it is — the two
 * approaches, side by side, so they can be compared on the same page:
 *
 *   ?fit=scroll   keep the tiles at their size and scroll (the default)
 *   ?fit=shrink   shrink the tiles until the line fits, and never scroll
 *
 * A URL switch rather than a setting because this is here to be chosen
 * between. Whichever wins, the other goes.
 */
const FIT = (() => {
  if (typeof location === 'undefined') return 'scroll'
  return new URLSearchParams(location.search).get('fit') === 'shrink' ? 'shrink' : 'scroll'
})()

/**
 * Floor on the shrunk tile. Past this a Landsat scene is a smudge and the
 * letter cut into it is unreadable, so it is better to let it scroll — which
 * it still can, because overflow-x is untouched.
 */
const FIT_TILE_MIN = 26

/**
 * Splits a row's characters into words and the spaces between them.
 *
 * The row used to be a flat run of tiles, which is all it needed to be while
 * nothing belonged to anything. A word now has a caption under it and lights
 * up as a unit, so the word has to exist as an element rather than as a
 * stretch of siblings that happen to have no space among them.
 */
function toWords(chars) {
  const out = []
  let current = null
  for (const c of chars) {
    if (c.type === 'space') {
      current = null
      out.push({ kind: 'space', key: c.key })
      continue
    }
    if (!current) {
      current = { kind: 'word', key: c.key, chars: [] }
      out.push(current)
    }
    current.chars.push(c)
  }
  return out
}

/** Breathing room around the collage when it fills the screen. */
const FULL_PADDING = 40
/** Kept clear at the top for the close control and a hovered block's label. */
const FULL_HEADROOM = 64
/**
 * Bounds on the fitted tile, so one letter does not become the whole screen.
 *
 * The floor is deliberately far below anything a real collage reaches. Full
 * screen does not scroll — the whole point of it is seeing the collage at once
 * — so the fit has to be free to shrink until it fits. A floor set where the
 * blocks stay comfortably readable would be the one thing stopping it, and a
 * long line on a narrow window would hit that floor and overflow a box that
 * cannot scroll, which clips the end of the writing off the screen. Small is
 * recoverable; cut off is not.
 */
const FULL_TILE_MIN = 8
const FULL_TILE_MAX = 340
/** Passes the fit is allowed. Two or three is the usual answer; the rest is
 *  headroom for a pass that can only take a pixel off. */
const FULL_FIT_PASSES = 6

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
  // The size the fit last applied, read back by the next pass. A ref rather
  // than the state because a pass runs before React has re-rendered with it.
  const appliedFull = useRef(null)

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
   * Measured repeatedly rather than once. A single pass would be enough if the
   * collage scaled linearly with the tile, and it very nearly does — but the
   * captions have a minimum font size, so below a certain tile they stop
   * shrinking and start setting the width themselves. One pass past that point
   * lands short. Each pass measures what is actually drawn and rescales from
   * there, so the error shrinks every time; it stops as soon as a pass asks for
   * no real change, which for an ordinary collage is the second one.
   */
  useLayoutEffect(() => {
    if (!expanded) {
      appliedFull.current = null
      setFullTileW(null)
      return
    }
    let raf = 0

    /** One measure-and-rescale. Returns whether it moved the tile at all. */
    const fit = () => {
      const el = rowsRef.current
      if (!el) return false
      // The widest row, not the wrapper. The wrapper is a flex item and
      // stretches to the board's full width, so measuring it measures the
      // screen and the scale comes out as 1 — which is exactly what happened:
      // the tiles grew from 133px to 135.
      let w = 0
      let overhang = 0
      for (const row of el.querySelectorAll('.collage-row')) {
        w = Math.max(w, row.scrollWidth)
        // How far the blocks are painted past the box the line is laid out in.
        // They are drawn wider than their tile and overlap their neighbours, so
        // the last one in a line sticks out to the right — and only to the
        // right, while the line itself is centred on its layout width. That
        // makes the ink off-centre by half the overhang, and a collage fitted
        // exactly hangs over the right edge by that much. Budgeted for below.
        overhang = Math.max(overhang, row.scrollWidth - row.clientWidth)
      }
      const h = el.scrollHeight
      if (!w || !h) return false
      // The board's own content box, not the window less the padding this file
      // thinks the board has. Those are not the same number — measured, the
      // window gave 722px of room where the box actually had 700 — and fitting
      // to the larger one leaves the collage over the edge of the smaller.
      // Asking the element keeps the fit honest if the padding ever changes
      // too, since these constants exist only as a fallback now.
      const box = el.parentElement
      let availW = window.innerWidth - FULL_PADDING * 2
      let availH = window.innerHeight - FULL_PADDING * 2 - FULL_HEADROOM
      if (box) {
        const cs = getComputedStyle(box)
        availW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      }
      // Taking the overhang off the budget is what centres the ink rather than
      // the layout. With a line of layout width L and overhang v inside a box
      // of width A, the painted right edge sits at (A - L) / 2 + L + v, which
      // stays inside A exactly when L + v — the scrollWidth measured above —
      // is at most A - v. Off both axes, since a block is taller than its tile
      // as well as wider.
      availW -= overhang
      availH -= overhang
      const k = Math.min(Math.max(120, availW) / w, Math.max(120, availH) / h)
      // Scaled from the size the rows were just measured at, which is the last
      // size this effect applied — not from the page's tile size. Rescaling a
      // measurement of one size by a ratio taken at another is how a fit walks
      // away from the answer instead of towards it.
      const base = appliedFull.current ?? tileW
      // Floored, not rounded. The tile is whole pixels and the collage is tens
      // of them wide, so rounding the last fraction up multiplies into a row a
      // few pixels over the window — which is exactly where this landed: 738px
      // of writing in 722px of window, at a tile of 37 where 36 fits.
      let next = Math.floor(Math.min(FULL_TILE_MAX, base * k))
      // A pass that still does not fit must move. Once the tile is small the
      // ratio can be close enough to one that the floor gives back the size we
      // came in with, and the fit would sit there a pixel over for good.
      if (k < 1 && next >= base) next = base - 1
      next = Math.max(FULL_TILE_MIN, next)
      if (next === appliedFull.current) return false
      appliedFull.current = next
      setFullTileW(next)
      return true
    }

    const refine = passes => {
      if (!fit() || passes + 1 >= FULL_FIT_PASSES) return
      // The next frame, so the rows have been re-laid-out at the size just set
      // and the following pass measures that rather than the previous one.
      raf = requestAnimationFrame(() => refine(passes + 1))
    }
    const run = () => {
      cancelAnimationFrame(raf)
      refine(0)
    }

    run()
    window.addEventListener('resize', run)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', run)
    }
  }, [expanded, tileW, renderedLines, display])

  /**
   * ?fit=shrink — the tile size that makes the longest line fit the board.
   *
   * Converges in one pass and then holds still, which is the only reason this
   * is safe to run from a ResizeObserver on the thing it resizes. Tile width
   * and line width are proportional, so `line / tile` is a constant for a
   * given piece of text: measure it once at whatever size the rows happen to
   * be drawn at, and the size that fits is `available / that`. Applying it
   * changes both numbers and leaves the ratio alone, so the next measurement
   * agrees with the last and nothing oscillates.
   *
   * The observer also ignores anything but a width change. Shrinking the tiles
   * changes the board's height, which would otherwise call this straight back.
   */
  const appliedFit = useRef(null)
  const lastBoardW = useRef(0)
  const [fitTileW, setFitTileW] = useState(null)

  useLayoutEffect(() => {
    if (FIT !== 'shrink' || expanded) {
      appliedFit.current = null
      setFitTileW(null)
      return
    }
    const rows = rowsRef.current
    if (!rows) return

    const measure = () => {
      // The wrapper is the scroll container now, so its own client width is
      // the space a line has. Reading the board's would include its padding
      // and overstate it.
      const avail = rows.clientWidth
      let line = 0
      for (const row of rows.querySelectorAll('.collage-row')) {
        line = Math.max(line, row.scrollWidth)
      }
      if (!line || avail <= 0) return
      const perTile = line / (appliedFit.current ?? tileW)
      const next = Math.min(tileW, Math.max(FIT_TILE_MIN, Math.floor(avail / perTile)))
      if (next === appliedFit.current) return
      appliedFit.current = next
      setFitTileW(next)
    }

    measure()
    const ro = new ResizeObserver(entries => {
      const w = Math.round(entries[0].contentRect.width)
      if (w === lastBoardW.current) return
      lastBoardW.current = w
      measure()
    })
    ro.observe(rows)
    return () => ro.disconnect()
  }, [expanded, tileW, renderedLines, display])

  // Falls back to the page's own size until a measurement lands, which is one
  // frame, so the collage never renders at nothing.
  const shownTileW = expanded
    ? (fullTileW || tileW)
    : (FIT === 'shrink' && fitTileW ? fitTileW : tileW)

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
                {toWords(line.chars).map(group => {
                  if (group.kind === 'space') {
                    return (
                      <div
                        key={group.key}
                        className="tile-space"
                        style={{ width: Math.round(shownTileW * 0.37) }}
                      />
                    )
                  }
                  const Cell = blocks ? Tile3D : Tile
                  return (
                    <div key={group.key} className="word">
                      <div className="word-tiles">
                        {group.chars.map(({ ch, key }) => (
                          <Cell
                            key={key}
                            ch={ch}
                            tileKey={key}
                            variantIdx={vs[key] || 0}
                            tileW={shownTileW}
                            onCycle={onCycleVariant}
                          />
                        ))}
                      </div>
                      {/* Sized from the tile rather than fixed, so the caption
                          stays in proportion whether the collage has been
                          shrunk to a narrow screen or blown up full screen —
                          and never ends up wider than the word it names. */}
                      <span
                        className="word-label"
                        style={{ fontSize: Math.max(9, Math.round(shownTileW * 0.13)) }}
                      >
                        {group.chars.map(c => c.ch).join('')}
                      </span>
                    </div>
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
