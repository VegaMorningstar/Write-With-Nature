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
import GlassCelestial from '../ui-elements/glass-celestial/GlassCelestial'

export default function Header() {
  return (
    <header className="masthead">
      <span className="over">NASA Landsat · Satellite Imagery Collage</span>

      <GlassTitle />

      <p className="sub">Rivers, glaciers &amp; coastlines — shaped into letters from orbit</p>

      <div className="ornament">
        <div className="ornament-rule" />
        {/* The ornament, as a jelly of liquid glass. It toggles its own shape
            and nothing else — the page theme is not wired to it. */}
        <GlassCelestial size={40} defaultValue="sun" />
        <div className="ornament-rule" />
      </div>
    </header>
  )
}
