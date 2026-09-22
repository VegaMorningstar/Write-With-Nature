import { useEffect, useState } from 'react'
import { tokens, onThemeChange } from '../theme.js'
import { withFluidHue, installLoopGuard, capture } from './fluidHue.js'

let _booted = false

/**
 * The blend decides whether CSS glass on the page can see the fluid.
 *
 * An element with mix-blend-mode forms its own backdrop root, and Chrome will
 * not let a backdrop-filter sample blended content — so under any blend the
 * fluid stains the page and is invisible to every CSS-frosted surface, which
 * is left refracting a smooth gradient and reads as flat white.
 *
 * The WebGPU glass is not affected either way: it cannot sample the DOM at all,
 * so it rebuilds the page into a texture and reads this canvas directly.
 *
 * Which blend comes from the theme, because it cannot be the same in both:
 * multiply is backdrop x source, so on beige paper the fluid reads as pigment
 * soaking in, while on black it is multiplication by zero and the colour is
 * annihilated rather than dimmed. Screen is its dual and reduces to the source
 * on black. See src/theme.js; the two backdrop painters read the same token so
 * the glass refracts the fluid that is actually on screen.
 *
 * Passing `blend` explicitly overrides the theme, which the tune page uses.
 */
export default function FluidCursor({ blend }) {
  // Unlike the backdrops, this one is not repainted every frame, so it has to
  // be told when the theme changes rather than noticing on its own.
  const [themeBlend, setThemeBlend] = useState(() => tokens().fluidBlend)
  useEffect(() => onThemeChange(() => setThemeBlend(tokens().fluidBlend)), [])
  const activeBlend = blend ?? themeBlend
  useEffect(() => {
    if (_booted) return
    _booted = true

    import('smokey-fluid-cursor').then(({ initFluid }) => {
      // The library registers
      //   window.addEventListener('touchmove', h, { passive: false })
      // and calls preventDefault() unconditionally inside h, which cancels
      // native scrolling everywhere on the page. Browsers normally force touch
      // listeners on window/document/body to be passive to stop exactly this,
      // but passing passive:false explicitly opts back out of that.
      //
      // So force it back on the way in. A passive listener's preventDefault()
      // is a silent no-op while the rest of the handler still runs, so the
      // splat happens and the page still scrolls.
      //
      // It has to be window, not document — the library binds there, and
      // patching the document instance leaves window's inherited method alone.
      // And it has to wrap the initFluid call, not the import: the listeners
      // are registered inside initFluid, not when the module loads.
      const originalAdd = window.addEventListener
      window.addEventListener = function (type, listener, options) {
        if (type === 'touchstart' || type === 'touchmove') {
          options = typeof options === 'object' && options !== null
            ? { ...options, passive: true }
            : { passive: true }
        }
        // Every listener registered inside initFluid is the library's, and the
        // press handlers pick a fresh colour — so they need the hue guard just
        // as much as the animation loop does. Wrapping here rather than
        // globally is what keeps the patch off everyone else's Math.random.
        //
        // Note this registers a wrapper, not the library's own function, so a
        // removeEventListener with the original reference would not match and
        // the listener would stay attached. Harmless as things stand: the
        // _booted guard means this runs once and never tears down. It would
        // stop being harmless the day this component needs to unmount.
        const guarded = typeof listener === 'function'
          ? function (ev) { return withFluidHue(() => listener.call(this, ev)) }
          : listener
        return originalAdd.call(this, type, guarded, options)
      }

      installLoopGuard()

      // Do NOT force preserveDrawingBuffer here. It looks like the obvious way
      // to make this canvas readable by the collage export and by the liquid
      // glass backdrop, and it does — but the library's on-screen pass blends
      // with ONE / ONE_MINUS_SRC_ALPHA and never clears the default framebuffer,
      // relying on the browser to clear it between frames. Preserve the buffer
      // and every frame blends onto the last, so colour accumulates and the
      // dissipation settings stop meaning anything.
      //
      // To read this canvas, draw from it inside a rAF registered after the
      // library's own, while the buffer is still valid for the current frame.
      try {
        // capture() marks the window in which the library's animation loop can
        // be recognised: it registers that loop synchronously inside initFluid.
        capture(() => initFluid({
          transparent: true,
          // Slower dissipation → trails linger on the background like paint drying
          densityDissipation: 1.2,
          velocityDissipation: 1.6,
          curl: 24,
          splatRadius: 0.30,
          splatForce: 5500,
          shading: true,
          colorUpdateSpeed: 6,
          id: 'fluid-cursor-canvas',
        }))
      } finally {
        window.addEventListener = originalAdd
      }
    })
  }, [])

  return (
    <canvas
      id="fluid-cursor-canvas"
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        // z-index 5: same layer as the old watercolor canvas — behind glass panels (z:20)
        zIndex: 5,
        mixBlendMode: activeBlend,
      }}
    />
  )
}
