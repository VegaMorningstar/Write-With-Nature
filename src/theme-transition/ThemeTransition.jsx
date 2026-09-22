/**
 * The sky that covers the page while the theme changes.
 *
 * Two layers: a gradient whose leading edge travels across the screen, and the
 * star field masked so it arrives and leaves in a direction. The timeline
 * comes from transition.js and the appearance from sky.js; this only paints.
 *
 * It writes styles onto refs inside the frame callback rather than through
 * React state. The transition is five seconds, which is around three hundred
 * frames, and three hundred re-renders of a component that owns two divs and a
 * canvas is a great deal of reconciliation for something that is only ever
 * setting a background string. React is used for mounting and unmounting,
 * which happens twice.
 */
import { useEffect, useRef, useState } from 'react'
import { onTransitionFrame } from './transition.js'
import { skyGradient, starMask } from './sky.js'
import { drawStars } from '../night-sky/stars.js'

export default function ThemeTransition() {
  const [running, setRunning] = useState(false)
  const skyRef = useRef(null)
  const starRef = useRef(null)

  useEffect(() => onTransitionFrame(frame => {
    // The cursor creatures are fixed to the viewport outside .page, so the sky
    // cannot cover them from in here — and they are the one thing that would
    // otherwise be seen changing species mid-sunset. Taken out with the rest
    // of the page and brought back with it.
    const creatures = document.getElementById('cursor-butterflies-canvas')

    if (!frame) {
      if (creatures) creatures.style.opacity = ''
      setRunning(false)
      return
    }
    if (creatures) creatures.style.opacity = (1 - frame.sky).toFixed(3)
    setRunning(true)

    const sky = skyRef.current
    if (sky) {
      sky.style.opacity = String(frame.sky)
      sky.style.background = skyGradient(frame.toDark, frame)
    }

    const canvas = starRef.current
    if (!canvas) return

    // Under the sky's own opacity as well as the mask: stars should not be
    // brighter than the sky they are in while it is still fading up.
    canvas.style.opacity = String(frame.sky)
    // Fully masked out at both ends of its own ramp — no point drawing a
    // field that is about to be erased to nothing.
    const spent = frame.toDark ? frame.stars <= 0.001 : frame.stars >= 0.999
    if (frame.sky <= 0.002 || spent) {
      const ctx0 = canvas.getContext('2d')
      if (ctx0) ctx0.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    const w = Math.max(1, window.innerWidth)
    const h = Math.max(1, window.innerHeight)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const cw = Math.round(w * dpr)
    const ch = Math.round(h * dpr)
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, w, h)

    // The same field the night theme shows, so the stars that fade up here are
    // already in the positions they will still be in when the overlay clears.
    drawStars(ctx, w, h)

    // And again, added on top of itself. These stars are tuned to be read
    // against the night theme's near-black; during the transition they have to
    // come up over a blue that is still lit, where a single pass is invisible.
    // Drawing twice additively roughly doubles each star's contribution
    // without touching the field the night theme uses.
    ctx.globalCompositeOperation = 'lighter'
    drawStars(ctx, w, h)
    ctx.globalCompositeOperation = 'source-over'

    // Then cut them back to the part of the sky they belong in. destination-in
    // keeps what the gradient covers and discards the rest, which turns a
    // vertical alpha ramp into a front sweeping across the field — stars
    // filling in from the top at dusk, erased from the bottom at dawn.
    // Masking beats fading the whole field: a uniform fade is every star
    // getting dimmer at once, which reads as the layer's opacity changing
    // rather than as night arriving.
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    for (const [pos, alpha] of starMask(frame.toDark, frame)) {
      grad.addColorStop(Math.max(0, Math.min(1, pos)), `rgba(255,255,255,${alpha})`)
    }
    ctx.globalCompositeOperation = 'destination-in'
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }), [])

  if (!running) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        // Above the cursor creatures at 100000, not merely above the page.
        // They are the one thing that outranks everything else, and left
        // underneath the sky they would have gone on fluttering over the
        // sunset and then popped from butterflies to fireflies mid-scene, in
        // full view. Behind the sky they simply leave with the rest of the
        // page and come back as whatever the new theme flies.
        //
        // Swallows pointer events for the duration: the sky is not something
        // you can click through, and a second press on a jelly you cannot see
        // would only be refused anyway.
        zIndex: 100001,
        pointerEvents: 'auto',
      }}
    >
      <div ref={skyRef} style={{ position: 'absolute', inset: 0, opacity: 0 }} />
      <canvas
        ref={starRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0 }}
      />
    </div>
  )
}
