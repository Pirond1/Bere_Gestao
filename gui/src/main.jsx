import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupPwa } from './utils/pwa'

// Antes do React: o convite de instalação do navegador dispara logo que a página abre
setupPwa()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
