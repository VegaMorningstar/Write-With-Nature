/**
 * The masthead.
 *
 * WRITE WITH NATURE used to be laid out here as a flex collage of .title-tile
 * divs, with its own tile sizing, variant state and hover CSS. All of that moved
 * into GlassTitle, which needs to own the layout anyway: the glass is drawn on a
 * canvas from box positions in its own coordinate space, so the DOM and the
 * shader cannot each compute the layout separately without drifting apart.
 *
 * Without WebGPU it falls back to the same images in the same places, so the
 * masthead still reads as it always did.
 */
import GlassTitle from '../ui-elements/glass-title/GlassTitle'

export default function Header() {
  return (
    <header className="masthead">
      <span className="over">NASA Landsat · Satellite Imagery Collage</span>

      <GlassTitle />

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
