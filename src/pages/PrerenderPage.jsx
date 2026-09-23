import { useEffect, useState } from 'react'
import { LETTERS } from '../data/letters'
import { renderBrick } from '../lib/brickRenderer'
import { BRICK_SIZE, BRICK_VIEW, brickName } from '../lib/brickAssets'

/**
 * ?prerender — the harness `scripts/prerender-bricks.mjs` drives.
 *
 * Not a page anyone visits. The block renderer needs a canvas and a WebGL
 * context, so baking the library means running it in a real browser; this
 * exposes it to the headless one as a single function and otherwise does
 * nothing.
 *
 *   await page.evaluate(() => window.__prerender.render('S', 0))
 *
 * Kept in the app rather than duplicated in the script so there is one
 * definition of what a block looks like, and the baked images cannot drift
 * away from what the live renderer would have drawn.
 */
export default function PrerenderPage() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const jobs = []
    for (const [ch, variants] of Object.entries(LETTERS)) {
      variants.forEach((v, i) => {
        jobs.push({ ch, index: i, name: brickName(ch, i), url: v.url, label: v.label })
      })
    }

    window.__prerender = {
      jobs,
      size: BRICK_SIZE,
      view: BRICK_VIEW,

      /** Render one block and hand back a data URL plus its aspect. */
      async render(ch, index) {
        const variant = LETTERS[ch]?.[index]
        if (!variant) throw new Error(`no scene ${ch}-${index}`)
        const out = await renderBrick(variant.url, BRICK_SIZE, {
          place: variant.label,
          letter: ch,
          ...BRICK_VIEW.model,
        })
        return {
          src: out.src, aspect: out.aspect,
          width: out.width, height: out.height, frame: out.frame, etch: out.etch,
        }
      },
    }
    setReady(true)
  }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontWeight: 400 }}>Brick prerender harness</h1>
      <p style={{ color: '#5a5647' }}>
        {ready
          ? `${window.__prerender.jobs.length} scenes ready. Driven by scripts/prerender-bricks.mjs.`
          : 'loading…'}
      </p>
    </div>
  )
}
