import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import TunePage from './pages/TunePage.jsx'

const isTune = new URLSearchParams(window.location.search).has('tune')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isTune ? <TunePage /> : <App />}
  </StrictMode>,
)
