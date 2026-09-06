import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { restoreSession } from './services/api'

// Complete restoration before protected routes decide whether to redirect.
void restoreSession().catch(() => undefined).finally(() => {
  createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
})
