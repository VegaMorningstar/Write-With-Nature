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
      document.addEventListener = _origAdd  // restore before any app code runs
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
