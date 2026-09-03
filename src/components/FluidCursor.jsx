import { useEffect } from 'react'

let _booted = false

export default function FluidCursor() {
  useEffect(() => {
    if (_booted) return
    _booted = true

    import('smokey-fluid-cursor').then(({ initFluid }) => {
      // Canvas is already in the DOM (rendered below), so getElementById finds it.
      // The library injects its own <style> that sets position/size/pointer-events.
      // Our inline zIndex 6 on the canvas overrides the library's z-index: -9999.
      initFluid({
        transparent: true,
        densityDissipation: 3.5,
        velocityDissipation: 2,
        curl: 28,
        splatRadius: 0.26,
        splatForce: 6000,
        shading: true,
        colorUpdateSpeed: 8,
        id: 'fluid-cursor-canvas',
      })
    })
  }, [])

  // Canvas must be in the DOM before initFluid is called.
  // The library styles position/size via an injected <style>;
  // inline zIndex overrides the library's z-index: -9999.
  return (
    <canvas
      id="fluid-cursor-canvas"
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 6,
      }}
    />
  )
}
