/**
 * Hands a panel's surface to the liquid glass shader, or leaves it on the CSS
 * glass where WebGPU is unavailable.
 *
 * Pair it with a <LiquidGlassPanel> inside the same element — this only clears
 * the way. Each panel in index.css paints its own background, a 1px white
 * border and an outer white glow, and those sit outside the canvas (which
 * covers the padding box), so they would show as a second edge beside the glass
 * one. The inset highlights need no handling; they paint under the element's
 * children, so the canvas already covers them.
 *
 * Without WebGPU — Safari, Firefox, iOS — nothing is stripped and the shipped
 * CSS glass runs exactly as before.
 */
import { useEffect } from 'react'
import { liquidGlass } from '../lib/liquid-glass'

export const glassSupported = typeof navigator !== 'undefined' && !!navigator.gpu

export default function usePanelGlass(ref, fallbackOpts) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (!glassSupported) {
      const glass = liquidGlass(el, fallbackOpts)
      return () => glass.destroy()
    }

    const prev = {
      backdropFilter: el.style.backdropFilter,
      webkitBackdropFilter: el.style.webkitBackdropFilter,
      background: el.style.background,
      border: el.style.border,
      boxShadow: el.style.boxShadow,
    }

    el.style.backdropFilter = el.style.webkitBackdropFilter = 'none'
    el.style.background = 'transparent'
    el.style.border = 'none'
    el.style.boxShadow = 'none'

    return () => Object.assign(el.style, prev)
  }, [ref])
}
