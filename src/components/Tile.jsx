import { useState } from 'react'
import { LETTERS } from '../data/letters'

export default function Tile({ ch, tileKey, variantIdx, tileW, onCycle }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const variants = LETTERS[ch]
  if (!variants) return null
  const vi = variantIdx % variants.length
  const { url, label } = variants[vi]

  function handleClick() {
    onCycle(tileKey, ch)
    setImgLoaded(false)
    setImgError(false)
  }

  return (
    <div
      className="tile"
      style={{ width: tileW, height: tileW }}
      onClick={handleClick}
    >
      {variants.length > 1 && (
        <div className="tile-pips">
          {variants.map((_, i) => (
            <span key={i} className={i === vi ? 'on' : ''} />
          ))}
        </div>
      )}

      {imgError ? (
        <div className="tile-error">
          <div className="ghost">{ch}</div>
          <small>image not found</small>
        </div>
      ) : (
        <img
          src={url}
          alt={`Letter ${ch} — ${label}`}
          className={imgLoaded ? '' : 'loading'}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}

      <div className="tile-wash" />
      <div className="tile-swap">{variants.length > 1 ? '↻' : '·'}</div>
      <div className="tile-char">{ch}</div>
      <div className="tile-tip">{label}</div>
    </div>
  )
}
