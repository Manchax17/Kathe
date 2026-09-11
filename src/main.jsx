import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider'
import { DecksProvider } from './context/DecksProvider'
import { ThemeProvider } from './context/ThemeProvider'

// Orden de los providers: Auth resuelve la sesión y el perfil; Theme va después
// porque la apariencia personalizada se guarda en el perfil; Decks necesita el
// usuario para filtrar por user_id. El router va último porque las rutas leen de
// los tres.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <DecksProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DecksProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
