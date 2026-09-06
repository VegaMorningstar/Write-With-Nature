import { useRef, useMemo, useState } from 'react'
import { LETTERS } from '../data/letters'
import usePanelGlass, { glassSupported } from '../hooks/usePanelGlass'
import LiquidGlassPanel from '../ui-elements/liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from '../ui-elements/liquid-glass/panelPreset'
import GlassAlphabet from '../ui-elements/glass-alphabet/GlassAlphabet'
import GlassSheet from '../ui-elements/glass-sheet/GlassSheet'
import { LETTERS as ALPHABET } from '../ui-elements/glass-alphabet/constants.ts'

export default function Colophon() {
  const colophonRef = useRef(null)
  usePanelGlass(colophonRef, { scale: -80, chroma: 5, blur: 2.5, saturate: 1.3, mode: 'polar', aberrationIntensity: 5, elasticity: 0 })

  // Which letters have scenes behind them. The tiles for the rest stay in the
  // grid but sit disabled, so the alphabet reads as an alphabet rather than a
  // gappy subset of one.
  const available = useMemo(() => new Set(Object.keys(LETTERS)), [])

  // Which character's scenes are on show. null is closed.
  const [openChar, setOpenChar] = useState(null)
  const scenes = openChar ? LETTERS[openChar] ?? [] : []

  return (
    <footer className="colophon" ref={colophonRef}>
      {glassSupported && <LiquidGlassPanel params={PANEL_GLASS} />}
      <div className="colophon-text">
        <h3>About this tool</h3>
        <p>
          All imagery from NASA's public domain{' '}
          <a href="https://science.nasa.gov/mission/landsat/outreach/your-name-in-landsat/" target="_blank" rel="noreferrer">
            Your Name in Landsat
          </a>{' '}
          project — real Landsat 8 &amp; 9 satellite scenes where Earth's surface naturally
          resembles alphabet letters. Visit the{' '}
          <a href="https://science.nasa.gov/gallery/your-name-in-landsat-gallery/" target="_blank" rel="noreferrer">
            image gallery
          </a>{' '}
          to find all available filenames and add more variants.
        </p>
      </div>
      {/* Twenty-six lenses of liquid glass, each a real button. Clicking one
          opens every Landsat scene mapped to that character. */}
      <GlassAlphabet available={available} onSelect={setOpenChar} />

      <GlassSheet
        open={openChar !== null}
        title={openChar ? `The letter ${openChar}` : ''}
        subtitle={`${scenes.length} Landsat ${scenes.length === 1 ? 'scene' : 'scenes'}`}
        items={scenes}
        onClose={() => setOpenChar(null)}
        sequence={ALPHABET}
        current={openChar}
        onNavigate={setOpenChar}
      />
    </footer>
  )
}
