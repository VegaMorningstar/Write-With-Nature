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
import { useEffect, useState } from 'react'
import GlassTitle from '../ui-elements/glass-title/GlassTitle'
import GlassCelestial from '../ui-elements/glass-celestial/GlassCelestial'
import { theme, setTheme, onThemeChange } from '../theme.js'

export default function Header() {
  // The ornament is the theme switch. It is a controlled component here rather
  // than left to its own state, so the shape always tells the truth about the
  // page: a theme changed from anywhere else — devtools, ?theme=, a future
  // control — moves the jelly too, instead of leaving a sun over a night sky.
  const [mode, setMode] = useState(() => theme())
  useEffect(() => onThemeChange(setMode), [])

  return (
    <header className="masthead">
      <span className="over">NASA Landsat · Satellite Imagery Collage</span>

      <GlassTitle />

      <p className="sub">Rivers, glaciers &amp; coastlines, shaped into letters from orbit</p>

      <div className="ornament">
        <div className="ornament-rule" />
        {/* The ornament, as a jelly of liquid glass, and the page's theme
            switch. Sun is the paper theme, moon the night sky — the shape it
            morphs to is the theme it selects, so it reads as what it does. */}
        <GlassCelestial
          size={40}
          value={mode === 'dark' ? 'moon' : 'sun'}
          onChange={next => setTheme(next === 'moon' ? 'dark' : 'light')}
        />
        <div className="ornament-rule" />
      </div>
    </header>
  )
}
