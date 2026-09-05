import { useEffect } from 'react'

let _booted = false

/**
 * `blend` decides whether the glass on the page can see the fluid at all.
 *
 * An element with mix-blend-mode forms its own backdrop root, and Chrome will
 * not let a backdrop-filter sample blended content. Under 'multiply' the fluid
 * stains the paper beautifully and is invisible to every frosted panel in the
 * app — those panels refract the background gradient alone, which is smooth,
 * so they have nothing to bend and read as flat white.
 *
 * 'normal' is the default because the glass is the point: the fluid is the only
 * thing on the page with enough structure to refract. The cost is that the
 * colour now sits over the paper rather than sinking into it.
 */
export default function FluidCursor({ blend = 'normal' }) {
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
        return originalAdd.call(this, type, listener, options)
      }

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
        initFluid({
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
        })
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
        mixBlendMode: blend,
      }}
    />
  )
}
