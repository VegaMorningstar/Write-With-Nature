import { LETTERS } from '../data/letters'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export default function Colophon() {
  return (
    <footer className="colophon">
      <div className="colophon-text">
        <h3>About this tool</h3>
        <p>
          All imagery from NASA's public domain{' '}
          <a href="https://science.nasa.gov/mission/landsat/outreach/your-name-in-landsat/" target="_blank" rel="noreferrer">
            Your Name in Landsat
          </a>{' '}
          project — real Landsat 8 &amp; 9 satellite scenes where Earth's surface naturally
          resembles alphabet letters. Visit the{' '}
          <a href="https://science.nasa.gov/gallery/your-name-in-landsat-gallery/" target="_blank" rel="noreferrer">
            image gallery
          </a>{' '}
          to find all available filenames and add more variants.
        </p>
      </div>
      <div className="alpha-grid">
        {ALPHABET.map(ch => (
          <div
            key={ch}
            className={`alpha-cell${LETTERS[ch] ? ' has' : ''}`}
            title={LETTERS[ch] ? `${LETTERS[ch].length} variant(s)` : 'not yet mapped'}
          >
            {ch}
          </div>
        ))}
      </div>
    </footer>
  )
}
