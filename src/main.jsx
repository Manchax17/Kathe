import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import { AiProvider } from './context/AiProvider'
import { AuthProvider } from './context/AuthProvider'
import { DecksProvider } from './context/DecksProvider'
import { ThemeProvider } from './context/ThemeProvider'

// Orden de los providers: Auth resuelve la sesión y el perfil; Theme va después
// porque la apariencia personalizada se guarda en el perfil; Decks y Ai
// necesitan el usuario (mazos por user_id, config de IA por usuario). El router
// va último porque las rutas leen de todos.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <DecksProvider>
          <AiProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AiProvider>
        </DecksProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)
