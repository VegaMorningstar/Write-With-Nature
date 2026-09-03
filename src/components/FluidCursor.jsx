import { useEffect } from 'react'

// Singleton guard — smokey-fluid-cursor runs its own RAF loop forever;
// calling initFluid() twice would spawn two overlapping simulations.
let _booted = false

export default function FluidCursor() {
  useEffect(() => {
    if (_booted) return
    _booted = true

    import('smokey-fluid-cursor').then(({ initFluid }) => {
      initFluid({
        transparent: true,
        densityDissipation: 3.5,   // how fast the colour fades
        velocityDissipation: 2,    // how fast the flow decays
        curl: 28,                  // vorticity — higher = more swirling smoke
        splatRadius: 0.26,         // Gaussian splat size
        splatForce: 6000,
        shading: true,             // fake 3D lighting on fluid surface
        colorUpdateSpeed: 8,
        id: 'fluid-cursor-canvas',
      })

      // Place above the watercolor canvas (zIndex 5) but below page panels (zIndex 20)
      requestAnimationFrame(() => {
        const canvas = document.getElementById('fluid-cursor-canvas')
        if (canvas) canvas.style.zIndex = '6'
      })
    })
  }, [])

  return null
}
