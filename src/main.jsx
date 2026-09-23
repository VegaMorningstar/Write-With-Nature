import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TunePage from './pages/TunePage.jsx'
import UiTunePage from './pages/UiTunePage.jsx'
import GlassPreviewPage from './pages/GlassPreviewPage.jsx'
import BrickPreviewPage from './pages/BrickPreviewPage.jsx'
import CubePage from './pages/CubePage.jsx'
import WordPage from './pages/WordPage.jsx'
import PrerenderPage from './pages/PrerenderPage.jsx'

// ?tune     — tuning for Write With Nature itself: fluid cursor, panel glass
// ?ui       — the reusable widgets in src/ui-elements, on their own
// ?preview  — the app's panels with liquid glass instead of the CSS glass
// ?bricks   — letters as 3D geological bricks, next to the flat tiles
// ?cube     — one block on its own, with the camera and the model adjustable
// ?word     — a whole word as a row of blocks, letters cut into their faces
// ?prerender — the harness scripts/prerender-bricks.mjs drives; not for people
const query = new URLSearchParams(window.location.search)

function Root() {
  if (query.has('prerender')) return <PrerenderPage />
  if (query.has('word')) return <WordPage />
  if (query.has('cube')) return <CubePage />
  if (query.has('bricks')) return <BrickPreviewPage />
  if (query.has('preview')) return <GlassPreviewPage />
  if (query.has('ui')) return <UiTunePage />
  if (query.has('tune')) return <TunePage />
  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
