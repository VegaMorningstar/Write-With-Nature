import { useEffect } from 'react'

let _booted = false

export default function FluidCursor() {
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

      // The library asks for preserveDrawingBuffer: false, which lets the
      // browser throw the WebGL buffer away as soon as it has been composited.
      // Anything that later reads this canvas — drawImage into the collage
      // export, or into the backdrop the liquid glass refracts — then gets an
      // empty frame. Forcing it true keeps the pixels readable. It costs the
      // driver an optimisation, which is the price of the canvas being legible
      // to the rest of the app.
      const originalGetContext = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, attrs) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          attrs = { ...(attrs || {}), preserveDrawingBuffer: true }
        }
        return originalGetContext.call(this, type, attrs)
      }

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
        HTMLCanvasElement.prototype.getContext = originalGetContext
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
        // multiply blend makes the fluid color stain the paper background
        // rather than sit as a floating overlay above it
        mixBlendMode: 'multiply',
      }}
    />
  )
}
