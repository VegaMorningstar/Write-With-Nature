import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TunePage from './pages/TunePage.jsx'
import UiTunePage from './pages/UiTunePage.jsx'
import GlassPreviewPage from './pages/GlassPreviewPage.jsx'

// ?tune     — tuning for Write With Nature itself: fluid cursor, panel glass
// ?ui       — the reusable widgets in src/ui-elements, on their own
// ?preview  — the app's panels with liquid glass instead of the CSS glass
const query = new URLSearchParams(window.location.search)

function Root() {
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
