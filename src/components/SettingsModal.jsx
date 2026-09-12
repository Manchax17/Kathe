import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';
import { useTheme } from '../hooks/useTheme';
import { resetStats } from '../utils/stats';
import ProfileEditor from './ProfileEditor';
import AppearanceEditor from './AppearanceEditor';
import AiSettings from './AiSettings';

/**
 * Ajustes: perfil, tema, cuenta y estadísticas.
 *
 * Antes recibía `user` por props (y solo desde App.jsx) y cerraba sesión con
 * `window.location.reload()`, que tiraba abajo la app entera. Ahora lee del
 * contexto y cierra con `signOut()`: el listener de sesión del AuthProvider se
 * encarga de sacar al usuario y el router lo manda a /login.
 */
export default function SettingsModal({ open, onClose }) {
  const { profile, user, signOut } = useAuth();
  const { deleteAllDecks } = useDecks();
  const { theme, setTheme } = useTheme();
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!open) return null;

  const handleResetStats = () => {
    resetStats();
    setConfirmingReset(false);
    alert('Estadísticas reiniciadas.');
  };

  const handleDeleteDecks = async () => {
    const confirmed = window.confirm(
      '¿Eliminar todos tus mazos? Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;

    const { error } = await deleteAllDecks();
    if (error) {
      alert('No se pudo eliminar: ' + error.message);
      return;
    }

    alert('Mazos eliminados. Cerrando sesión…');
    await signOut();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ backgroundColor: 'rgba(31, 24, 16, 0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-elevated border border-rule rounded-3xl w-full max-w-md shadow-paper anim-pop flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <header className="px-6 py-5 border-b border-rule flex justify-between items-center">
          <h2 className="font-display text-2xl">Ajustes</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-muted hover:bg-app"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-3 font-bold">
              Perfil
            </p>
            {profile ? (
              // La `key` remonta el editor cuando el perfil cambia de dueño o
              // termina de cargar, así que no hace falta sincronizarlo con un efecto.
              <ProfileEditor key={profile.id} />
            ) : (
              <p className="text-sm text-ink-soft bg-app rounded-2xl p-3 border border-rule">
                Todavía no tenés perfil. Revisá que la migración 0002 esté aplicada en Supabase.
              </p>
            )}
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-2 font-bold">Tema</p>
            <div className="flex gap-2 bg-app p-1 rounded-2xl border border-rule">
              {[
                { id: 'light', label: 'Claro' },
                { id: 'dark', label: 'Oscuro' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    theme === opt.id
                      ? 'bg-accent text-white shadow-paper'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                  style={theme === opt.id ? { color: 'var(--on-accent)' } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-3 font-bold">
              Apariencia
            </p>
            <AppearanceEditor />
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-3 font-bold">
              Inteligencia artificial
            </p>
            <AiSettings />
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-2 font-bold">Cuenta</p>
            <p className="text-sm text-ink-soft bg-app rounded-2xl p-3 border border-rule">
              {user?.email}
            </p>
            <button
              onClick={handleDeleteDecks}
              className="mt-3 w-full text-left text-sm font-bold text-danger bg-danger-surface hover:opacity-80 transition-all px-4 py-3 rounded-2xl border border-rule"
            >
              Eliminar todos mis mazos
            </button>
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-2 font-bold">
              Estadísticas
            </p>
            {!confirmingReset ? (
              <button
                onClick={() => setConfirmingReset(true)}
                className="w-full text-left text-sm font-bold text-ink-soft bg-app hover:bg-surface px-4 py-3 rounded-2xl border border-rule"
              >
                Reiniciar estadísticas de estudio
              </button>
            ) : (
              <div className="bg-danger-surface border border-rule rounded-2xl p-4">
                <p className="text-sm text-ink mb-3">¿Seguro? Se borrará tu racha y progreso.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleResetStats}
                    className="flex-1 bg-danger text-white py-2 rounded-xl font-bold text-sm"
                    style={{ color: 'var(--on-accent)' }}
                  >
                    Sí, reiniciar
                  </button>
                  <button
                    onClick={() => setConfirmingReset(false)}
                    className="flex-1 bg-app py-2 rounded-xl font-bold text-sm text-ink-soft"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
