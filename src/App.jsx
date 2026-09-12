import { Navigate, Outlet, Route, Routes } from 'react-router';
import AppShell from './components/AppShell';
import Splash from './components/Splash';
import { useAuth } from './hooks/useAuth';
import ChatPage from './pages/ChatPage';
import DeckPage from './pages/DeckPage';
import DecksPage from './pages/DecksPage';
import ExplorePage from './pages/ExplorePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import StudyPage from './pages/StudyPage';

/**
 * Ruta layout: mientras se resuelve la sesión no se decide nada (evita el
 * parpadeo de "no logueado" en cada recarga) y, si no hay usuario, manda a /login.
 */
function RequireAuth() {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        {/* AppShell aporta el header compartido (nav, tema, avatar, salir). */}
        <Route element={<AppShell />}>
          <Route path="/" element={<DecksPage />} />
          <Route path="/deck/:deckId" element={<DeckPage />} />
          <Route path="/deck/:deckId/study" element={<StudyPage />} />
          <Route path="/explorar" element={<ExplorePage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/g/:groupId" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
