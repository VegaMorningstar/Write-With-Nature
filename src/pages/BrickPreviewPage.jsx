import { useState } from 'react'
import { LETTERS } from '../data/letters'
import Tile from '../components/Tile'
import Tile3D from '../components/Tile3D'

/**
 * ?bricks — the flat tiles and the 3D bricks side by side, on the same word,
 * so the two can be judged against each other rather than from memory.
 */
export default function BrickPreviewPage() {
  const [text, setText] = useState('RIVERS')
  const [tileW, setTileW] = useState(150)
  const [vs, setVs] = useState({})

  const chars = text
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split('')
    .map((ch, i) => ({ ch, key: `${i}-${ch}`, type: ch === ' ' ? 'space' : 'letter' }))
    .filter(c => c.type === 'space' || LETTERS[c.ch])

  const cycle = (key, ch) =>
    setVs(v => ({ ...v, [key]: ((v[key] || 0) + 1) % LETTERS[ch].length }))

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>
        Landsat bricks
      </h1>
      <p style={{ maxWidth: 620, color: '#5a5647', lineHeight: 1.5 }}>
        Each scene modelled as a core sample: the satellite image is the top
        face, displaced into relief by its own water, over four strata of rock.
        Click a brick to cycle its scene.
      </p>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '1.5rem 0' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 16, width: 260 }}
        />
        <label style={{ fontSize: 14 }}>
          size{' '}
          <input
            type="range"
            min="90"
            max="260"
            value={tileW}
            onChange={e => setTileW(+e.target.value)}
          />
        </label>
      </div>

      <h2 style={{ fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
        3D bricks
      </h2>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {chars.map(({ ch, key, type }) =>
          type === 'space' ? (
            <div key={key} style={{ width: Math.round(tileW * 0.3) }} />
          ) : (
            <Tile3D
              key={key}
              ch={ch}
              tileKey={key}
              variantIdx={vs[key] || 0}
              tileW={tileW}
              onCycle={cycle}
            />
          )
        )}
      </div>

      <h2
        style={{
          fontSize: 13,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginTop: '2.5rem',
        }}
      >
        flat tiles, for comparison
      </h2>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {chars.map(({ ch, key, type }) =>
          type === 'space' ? (
            <div key={key} style={{ width: Math.round(tileW * 0.3) }} />
          ) : (
            <Tile
              key={key}
              ch={ch}
              tileKey={key}
              variantIdx={vs[key] || 0}
              tileW={tileW}
              onCycle={cycle}
            />
          )
        )}
      </div>
    </div>
  )
}
