import { useEffect } from 'react'

let _booted = false

export default function FluidCursor() {
  useEffect(() => {
    if (_booted) return
    _booted = true

    // Force the library's document-level touch listeners to be passive so
    // calling preventDefault() inside them doesn't block native page scroll.
    const _origAdd = document.addEventListener.bind(document)
    document.addEventListener = (type, fn, opts) => {
      if (type === 'touchstart' || type === 'touchmove') {
        opts = typeof opts === 'object' ? { ...opts, passive: true } : { passive: true }
      }
      _origAdd(type, fn, opts)
    }

    import('smokey-fluid-cursor').then(({ initFluid }) => {
      document.addEventListener = _origAdd  // restore touch listener override

      // Force preserveDrawingBuffer:true so the WebGL canvas stays readable
      // after each frame — required to drawImage() it into the PNG export.
      // initFluid() creates the WebGL context synchronously, so we intercept
      // getContext only for the duration of that call, then restore.
      const _origGetCtx = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, opts) {
        if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
          opts = { ...(opts || {}), preserveDrawingBuffer: true }
        }
        return _origGetCtx.call(this, type, opts)
      }
      initFluid({
        transparent: true,
        densityDissipation: 1.2,
        velocityDissipation: 1.6,
        curl: 24,
        splatRadius: 0.30,
        splatForce: 5500,
        shading: true,
        colorUpdateSpeed: 6,
        id: 'fluid-cursor-canvas',
      })
      HTMLCanvasElement.prototype.getContext = _origGetCtx  // restore
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
