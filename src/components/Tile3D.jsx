import { useState, useEffect } from 'react'
import { LETTERS } from '../data/letters'
import { loadBrick, brickUrl, brickAspect } from '../lib/brickAssets'

/**
 * A letter as a geological block.
 *
 * Same contract as Tile — click cycles the scene, the pips and the label
 * behave the same — but what gets painted is the place modelled in three
 * dimensions: the satellite image as the top face displaced into relief, the
 * section that place actually has cut below it, and the character engraved
 * into the face.
 *
 * The picture is baked ahead of time (see lib/brickAssets), so this is one
 * <img> and costs what the flat tile cost. The first paint uses the baked URL
 * directly rather than waiting to confirm it exists; only if the browser
 * cannot load it does this fall back to drawing the block live.
 */
export default function Tile3D({ ch, tileKey, variantIdx, tileW, onCycle }) {
  const variants = LETTERS[ch]
  const vi = variants ? variantIdx % variants.length : 0
  const variant = variants ? variants[vi] : null

  // Optimistic: point at the baked file straight away. No probe, no await, no
  // blank frame — for every scene in the library this is simply the answer.
  const [src, setSrc] = useState(() => (variants ? brickUrl(ch, vi) : null))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!variants) return
    setSrc(brickUrl(ch, vi))
    setFailed(false)
  }, [ch, vi, variants])

  /** Only reached for a scene that has not been baked yet. */
  async function drawLive() {
    try {
      const out = await loadBrick(ch, vi, variant.url, variant.label)
      setSrc(out.src)
    } catch {
      setFailed(true)
    }
  }

  if (!variants) return null

  return (
    <div
      className="tile3d"
      style={{ width: Math.round(tileW * brickAspect(ch, vi)), height: tileW }}
      onClick={() => onCycle(tileKey, ch)}
    >
      {variants.length > 1 && (
        <div className="tile-pips">
          {variants.map((_, i) => (
            <span key={i} className={i === vi ? 'on' : ''} />
          ))}
        </div>
      )}

      {failed ? (
        <div className="tile-error">
          <div className="ghost">{ch}</div>
          <small>scene not found</small>
        </div>
      ) : (
        <img
          src={src}
          alt={`Letter ${ch}: ${variant.label}, as a geological block`}
          className="tile3d-img"
          loading="lazy"
          decoding="async"
          draggable="false"
          onError={drawLive}
        />
      )}

      {/* No character overlay: the letter is cut into the block's own face,
          and a second one in the corner reads as a duplicate. */}
      <div className="tile-tip">{variant.label}</div>
    </div>
  )
}
