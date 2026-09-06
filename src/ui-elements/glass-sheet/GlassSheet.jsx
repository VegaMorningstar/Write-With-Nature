/**
 * A sheet of liquid glass over the page.
 *
 * The same surface the compose card, board and colophon wear — LiquidGlassPanel
 * fitted to this element — but floating above everything rather than sitting in
 * the flow. Used to show every Landsat scene behind one character when its tile
 * is clicked.
 *
 * Three ways out, because a thing that covers the page has to be easy to
 * dismiss: Escape, the close button, or the scrim around it. The scrim listens
 * on pointerdown rather than click so a drag that starts inside the sheet and
 * ends outside it does not count as clicking away — selecting a caption should
 * not close the thing you were reading.
 *
 * The glass refracts the page's reconstructed background, not the DOM under it,
 * so the scrim does the work of separating sheet from page. That is also why the
 * scrim carries its own blur: without it the sheet reads as inline rather than
 * on top, since the shader has no way to see the content it covers.
 */
import { useEffect, useRef, useCallback, forwardRef } from 'react'
import { createPortal } from 'react-dom'
import LiquidGlassPanel from '../liquid-glass/LiquidGlassPanel'
import { PANEL_GLASS } from '../liquid-glass/panelPreset'
import { glassSupported } from '../../hooks/usePanelGlass'

/** Red-tinted twin of the panel preset, for the close button. */
export const CLOSE_GLASS = {
  ...PANEL_GLASS,
  tintStrength: 0.22,
  tintR: 0.95,
  tintG: 0.22,
  tintB: 0.24,
}

export default function GlassSheet({
  open,
  title,
  subtitle,
  items = [],
  onClose,
  labelledBy = 'glass-sheet-title',
}) {
  const sheetRef = useRef(null)
  const closeRef = useRef(null)
  const restoreRef = useRef(null)
  // Whether the gesture that is ending began on the scrim. A pointerdown inside
  // the sheet that drifts out must not dismiss it.
  const downOnScrim = useRef(false)

  const close = useCallback(() => onClose?.(), [onClose])

  useEffect(() => {
    if (!open) return

    restoreRef.current = document.activeElement
    // The close button, not the sheet: it is the action a keyboard user most
    // likely wants, and it gives Escape something to have moved focus from.
    closeRef.current?.focus()

    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
        return
      }
      // Keep Tab inside the sheet. Without this, tabbing walks into the page
      // behind and a screen reader loses the thread of what is on top.
      if (e.key !== 'Tab') return
      const focusables = sheetRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      // Put the caret back where it was, so dismissing does not dump the user
      // at the top of the document.
      const el = restoreRef.current
      if (el && typeof el.focus === 'function') el.focus()
    }
  }, [open, close])

  if (!open) return null

  // Portalled to the body, and not as a nicety. The colophon that opens this
  // sets `contain: layout`, which makes it the containing block for fixed
  // descendants — rendered in place, the overlay would be pinned to the footer
  // instead of the viewport. A portal makes the component safe to mount
  // anywhere, rather than making every caller remember that.
  return createPortal(
    <div
      onPointerDown={e => { downOnScrim.current = e.target === e.currentTarget }}
      onPointerUp={e => {
        if (downOnScrim.current && e.target === e.currentTarget) close()
        downOnScrim.current = false
      }}
      style={{
        // Above the tune pages' control panel at 9999, so the demo is not
        // half-covered by the thing tuning it.
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3vh 4vw',
        background: 'rgba(28,26,16,0.34)',
        // The shader cannot see the DOM it covers, so the separation between
        // sheet and page has to come from here.
        backdropFilter: 'blur(7px) saturate(115%)',
        WebkitBackdropFilter: 'blur(7px) saturate(115%)',
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{
          position: 'relative',
          isolation: 'isolate',        // keeps LiquidGlassPanel's canvas behind the content, not the page
          width: 'min(920px, 100%)',
          maxHeight: '94vh',
          display: 'flex', flexDirection: 'column',
          borderRadius: 24,
          padding: '1.6rem 1.8rem 1.8rem',
          // Only where the shader is not running. With it, this would stack.
          background: glassSupported ? 'transparent' : 'rgba(255,255,255,0.16)',
          backdropFilter: glassSupported ? 'none' : 'blur(18px) saturate(150%)',
          WebkitBackdropFilter: glassSupported ? 'none' : 'blur(18px) saturate(150%)',
          border: '1px solid rgba(255,255,255,0.34)',
          boxShadow: '0 24px 70px rgba(28,26,16,0.34), inset 0 1px 0 rgba(255,255,255,0.42)',
        }}
      >
        {glassSupported && <LiquidGlassPanel params={PANEL_GLASS} />}

        <header style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '1rem', marginBottom: '1.1rem', position: 'relative', zIndex: 1,
        }}>
          <div>
            <h3 id={labelledBy} style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic', fontWeight: 400, fontSize: '1.35rem',
              color: 'var(--moss)', margin: 0,
            }}>
              {title}
            </h3>
            {subtitle && (
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: '0.62rem',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'rgba(28,26,16,0.5)', margin: '0.35rem 0 0',
              }}>
                {subtitle}
              </p>
            )}
          </div>
          <CloseButton ref={closeRef} onClick={close} />
        </header>

        <div style={{
          position: 'relative', zIndex: 1,
          overflowY: 'auto', overscrollBehavior: 'contain',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          gap: '0.9rem',
          paddingRight: 4,
        }}>
          {items.map((item, i) => (
            <figure key={item.url + i} style={{ margin: 0 }}>
              <img
                src={item.url}
                alt={item.label}
                loading="lazy"
                style={{
                  width: '100%', aspectRatio: '1 / 1', objectFit: 'cover',
                  display: 'block', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.32)',
                  boxShadow: '0 6px 18px rgba(28,26,16,0.24)',
                  background: 'rgba(255,255,255,0.10)',
                }}
              />
              <figcaption style={{
                fontFamily: "'DM Mono', monospace", fontSize: '0.58rem',
                lineHeight: 1.5, color: 'rgba(28,26,16,0.62)',
                marginTop: '0.45rem',
              }}>
                {item.label}
              </figcaption>
            </figure>
          ))}
          {items.length === 0 && (
            <p style={{
              fontFamily: "'DM Mono', monospace", fontSize: '0.66rem',
              color: 'rgba(28,26,16,0.5)', gridColumn: '1 / -1', margin: 0,
            }}>
              No scenes mapped to this character yet.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Glass, tinted and lit red. The tint runs far above the panels' 0.05 on
 * purpose: a suggestion of violet is right for a surface you look through, but
 * this one has to say "close" at a glance, and the glow outside it is doing as
 * much of that work as the tint inside.
 */
const CloseButton = forwardRef(function CloseButton({ onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label="Close"
      style={{
        position: 'relative',
        isolation: 'isolate',
        flexShrink: 0,
        width: 38, height: 38,
        borderRadius: 12,
        cursor: 'pointer',
        display: 'grid', placeItems: 'center',
        background: glassSupported ? 'transparent' : 'rgba(232,84,72,0.16)',
        border: '1px solid rgba(255,148,140,0.55)',
        boxShadow: '0 0 18px rgba(226,70,60,0.45), inset 0 1px 0 rgba(255,255,255,0.45)',
        color: 'rgba(120,26,20,0.9)',
        transition: 'box-shadow 0.16s, border-color 0.16s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow =
          '0 0 26px rgba(226,70,60,0.72), inset 0 1px 0 rgba(255,255,255,0.55)'
        e.currentTarget.style.borderColor = 'rgba(255,170,162,0.85)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow =
          '0 0 18px rgba(226,70,60,0.45), inset 0 1px 0 rgba(255,255,255,0.45)'
        e.currentTarget.style.borderColor = 'rgba(255,148,140,0.55)'
      }}
    >
      {glassSupported && <LiquidGlassPanel params={CLOSE_GLASS} />}
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"
        style={{ position: 'relative', zIndex: 1 }}>
        <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor"
          strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </button>
  )
})
