/**
 * Shared controls for the tuning pages.
 *
 * Two pages use these: ?tune for the Write With Nature app itself (fluid, panel
 * glass) and ?ui for the reusable widgets in src/ui-elements. Keeping one copy
 * means a control behaves the same wherever it appears.
 */

export const mono = { fontFamily: 'DM Mono, monospace' }

export function Slider({ label, value, min, max, step = 0.01, fmt, onChange, description }) {
  const display = fmt ? fmt(value) : value.toFixed(step >= 1 ? 0 : 2)
  return (
    <label style={{ display: 'block', marginBottom: description ? 13 : 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ ...mono, fontSize: 10, color: '#4a7c3f', minWidth: 40, textAlign: 'right' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#4a7c3f', cursor: 'pointer', display: 'block' }}
      />
      {description && (
        <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.36)', marginTop: 3, lineHeight: 1.55 }}>
          {description}
        </div>
      )}
    </label>
  )
}

export function Toggle({ label, value, onChange, description }) {
  return (
    <div style={{ marginBottom: description ? 13 : 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: description ? 3 : 0 }}>
        <span style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em' }}>{label}</span>
        <button onClick={() => onChange(!value)} style={{
          ...mono, fontSize: 9, padding: '2px 10px', cursor: 'pointer', borderRadius: 4,
          border: `1px solid ${value ? '#4a7c3f' : 'rgba(0,0,0,0.15)'}`,
          background: value ? 'rgba(74,124,63,0.16)' : 'rgba(255,255,255,0.4)',
          color: value ? '#1a3a0a' : '#999', minWidth: 38, textAlign: 'center',
        }}>{value ? 'ON' : 'OFF'}</button>
      </div>
      {description && (
        <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.36)', lineHeight: 1.55 }}>
          {description}
        </div>
      )}
    </div>
  )
}

export function Chips({ label, value, options, onChange, description }) {
  return (
    <div style={{ marginBottom: description ? 6 : 10 }}>
      <div style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)} style={{
            ...mono, fontSize: 9, padding: '3px 8px', cursor: 'pointer', borderRadius: 4,
            border: `1px solid ${value === opt ? '#4a7c3f' : 'rgba(0,0,0,0.12)'}`,
            background: value === opt ? 'rgba(74,124,63,0.14)' : 'rgba(255,255,255,0.45)',
            color: value === opt ? '#2a4a1a' : '#777',
          }}>{opt}</button>
        ))}
      </div>
      {description && (
        <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.36)', marginTop: 5, lineHeight: 1.55 }}>
          {description}
        </div>
      )}
    </div>
  )
}

export function AccordionSection({ title, open, onToggle, children }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <button onClick={onToggle} style={{
        ...mono, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '5px 8px', marginBottom: open ? 10 : 0,
        background: 'rgba(74,124,63,0.07)', border: 'none', borderRadius: 5,
        cursor: 'pointer', fontSize: 10, letterSpacing: '0.1em', color: '#2a4a1a', textAlign: 'left',
      }}>
        <span>{title}</span>
        <span style={{ opacity: 0.45, fontSize: 8 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ paddingBottom: 4 }}>{children}</div>}
    </div>
  )
}

/** A group heading inside a section. */
export function GroupLabel({ children, first = false }) {
  return (
    <div style={{
      ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', lineHeight: 1.6,
      margin: first ? '0 0 10px' : '6px 0 10px',
      padding: '5px 7px', background: 'rgba(74,124,63,0.05)', borderRadius: 5,
    }}>
      {children}
    </div>
  )
}

/** Plain explanatory prose inside a section. */
export function Note({ children }) {
  return (
    <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.32)', marginBottom: 10, lineHeight: 1.6 }}>
      {children}
    </div>
  )
}

/**
 * Stiffness sets the wobble frequency, damping sets how fast it dies. The pair
 * that matters is the damping ratio, damping / (2 * sqrt(stiffness * mass)):
 * below 1 it oscillates, and the lower it goes the longer the wobble carries.
 */
export function SpringRow({ label, value, onChange, description }) {
  const omega = Math.sqrt(value.stiffness / value.mass)
  const ratio = value.damping / (2 * omega)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...mono, fontSize: 10, color: '#3a4a2a', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
        <span style={{ color: 'rgba(0,0,0,0.34)', letterSpacing: 0 }}>
          {` · ${(omega / (2 * Math.PI)).toFixed(1)} Hz · ζ ${ratio.toFixed(2)}${ratio >= 1 ? ' (no wobble)' : ''}`}
        </span>
      </div>
      <Slider label="Stiffness" value={value.stiffness} min={100} max={2500} step={10}
        fmt={v => v.toFixed(0)} onChange={v => onChange({ ...value, stiffness: v })} />
      <Slider label="Damping" value={value.damping} min={0.5} max={40} step={0.1}
        fmt={v => v.toFixed(1)} onChange={v => onChange({ ...value, damping: v })}
        description={description} />
    </div>
  )
}

export function btnStyle(active, muted = false) {
  return {
    fontFamily: 'DM Mono, monospace', fontSize: 9, cursor: 'pointer', padding: '3px 8px',
    borderRadius: 4, letterSpacing: '0.06em',
    border: `1px solid ${active ? '#4a7c3f' : muted ? 'rgba(0,0,0,0.12)' : 'rgba(74,124,63,0.25)'}`,
    background: active ? 'rgba(74,124,63,0.18)' : muted ? 'rgba(0,0,0,0.04)' : 'rgba(74,124,63,0.08)',
    color: active ? '#1a3a0a' : muted ? '#555' : '#2a4a1a',
  }
}

/** The floating panel both tuning pages hang their sections in. */
export function ControlPanel({ title, subtitle, actions, footer, children }) {
  return (
    <aside style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 278,
      background: 'rgba(232,226,208,0.95)',
      backdropFilter: 'blur(18px) saturate(150%)',
      borderLeft: '1px solid rgba(74,124,63,0.14)',
      overflowY: 'auto', padding: '12px 12px 32px', zIndex: 9999,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid rgba(74,124,63,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ ...mono, fontSize: 11, fontWeight: 'bold', letterSpacing: '0.14em', color: '#1a2e0a' }}>{title}</div>
            <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.38)', marginTop: 1 }}>{subtitle}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            {actions}
          </div>
        </div>
      </div>
      {children}
      {footer && (
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(74,124,63,0.08)' }}>
          <div style={{ ...mono, fontSize: 9, color: 'rgba(0,0,0,0.35)', lineHeight: 1.8 }}>{footer}</div>
        </div>
      )}
    </aside>
  )
}
