import { useEffect, useRef } from 'react'
import { liquidGlass } from '../lib/liquid-glass'

export default function useLiquidGlass(ref, opts = {}) {
  const optsRef = useRef(opts)
  const cleanupRef = useRef(null)
  optsRef.current = opts

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let rafId = requestAnimationFrame(() => {
      const glass = liquidGlass(el, optsRef.current)
      cleanupRef.current = () => glass.destroy()
    })
    return () => {
      cancelAnimationFrame(rafId)
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [ref])
}
