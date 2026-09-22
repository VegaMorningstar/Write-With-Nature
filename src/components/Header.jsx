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
import { useEffect, useRef, useState } from 'react'
import GlassTitle from '../ui-elements/glass-title/GlassTitle'
import GlassCelestial from '../ui-elements/glass-celestial/GlassCelestial'
import { theme, onThemeChange } from '../theme.js'
import { runThemeTransition, onTransitionFrame } from '../theme-transition/transition.js'

export default function Header() {
  // The ornament is the theme switch. It is a controlled component here rather
  // than left to its own state, so the shape always tells the truth about the
  // page: a theme changed from anywhere else — devtools, ?theme=, a future
  // control — moves the jelly too, instead of leaving a sun over a night sky.
  const [mode, setMode] = useState(() => theme())
  useEffect(() => onThemeChange(setMode), [])

  // The body that sets and rises. Driven straight from the transition's frame
  // callback onto the node, not through state: this moves every frame for
  // three seconds, and re-rendering the masthead that often to change a
  // transform would be re-laying out the glass title along with it.
  const bodyRef = useRef(null)
  useEffect(() => onTransitionFrame(frame => {
    const el = bodyRef.current
    if (!el) return
    if (!frame) {
      el.style.transform = ''
      el.style.opacity = ''
      el.style.zIndex = ''
      return
    }
    el.style.transform = `translateY(${frame.drop.toFixed(1)}px)`
    el.style.opacity = frame.bodyAlpha.toFixed(3)
    // One above the sky, so the body is the last thing still visible as the
    // page disappears underneath it — and the first thing back.
    el.style.zIndex = '100002'
  }), [])

  return (
    <header className="masthead">
      <span className="over">NASA Landsat · Satellite Imagery Collage</span>

      <GlassTitle />

      <p className="sub">Rivers, glaciers &amp; coastlines, shaped into letters from orbit</p>

      <div className="ornament">
        <div className="ornament-rule" />
        {/* The ornament, as a jelly of liquid glass, and the page's theme
            switch. Sun is the paper theme, moon the night sky — the shape it
            morphs to is the theme it selects, so it reads as what it does.

            The wrapper exists to be moved: transforming the component's own
            host would fight the shader, which measures that element every
            frame to size its canvas and place its lens. */}
        <div ref={bodyRef} style={{ position: 'relative', willChange: 'transform, opacity' }}>
          <GlassCelestial
            size={40}
            value={mode === 'dark' ? 'moon' : 'sun'}
            onChange={next => runThemeTransition(next === 'moon' ? 'dark' : 'light')}
          />
        </div>
        <div className="ornament-rule" />
      </div>
    </header>
  )
}
