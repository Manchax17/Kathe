import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../hooks/useTheme';
import { resetStats } from '../utils/stats';

export default function SettingsModal({ open, onClose, user, onStatsReset }) {
  const { theme, setTheme } = useTheme();
  const [confirmingReset, setConfirmingReset] = useState(false);

  if (!open) return null;

  const handleResetStats = () => {
    resetStats();
    onStatsReset?.();
    setConfirmingReset(false);
    alert('Estadísticas reiniciadas.');
  };

  const handleDeleteDecks = async () => {
    const confirmed = window.confirm(
      '¿Eliminar todos tus mazos? Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('decks').delete().eq('user_id', user.id);
      if (error) throw error;
      alert('Mazos eliminados. Cerrando sesión…');
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      alert('No se pudo eliminar: ' + err.message);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ backgroundColor: 'rgba(31, 24, 16, 0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-elevated border border-rule rounded-3xl w-full max-w-md shadow-paper anim-pop"
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

        <div className="p-6 space-y-6">
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
                  style={theme === opt.id ? { color: 'var(--surface)' } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
            <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-2 font-bold">Estadísticas</p>
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
                    style={{ color: 'var(--surface)' }}
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
