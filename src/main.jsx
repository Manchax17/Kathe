import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider'
import { DecksProvider } from './context/DecksProvider'
import { ThemeProvider } from './context/ThemeProvider'

// Orden de los providers: Theme no depende de nada; Auth resuelve la sesión;
// Decks necesita el usuario para filtrar por user_id. El router va último porque
// las rutas leen de los tres.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DecksProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DecksProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
