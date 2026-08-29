import { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import DeckCard from './DeckCard';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { downloadAllDecksTxt } from '../utils/deckIO';
import { getStats } from '../utils/stats';

export default function DeckList({
  decks,
  isCreatingDeck,
  setIsCreatingDeck,
  newDeckName,
  setNewDeckName,
  handleCreateDeck,
  setCurrentDeck,
  setCurrentIndex,
  setIsFlipped,
  signOut,
  updateStudyOrder,
  onRenameDeck,
  onDeleteDeck,
  onOpenSettings,
}) {
  const [query, setQuery] = useState('');
  const stats = useMemo(() => getStats(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        Object.keys(d.words || {}).some((w) => w.toLowerCase().includes(q)),
    );
  }, [decks, query]);

  const handleDeleteDeck = async (deck) => {
    const confirmed = window.confirm(
      `¿Borrar el mazo "${deck.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    const { error } = await supabase.from('decks').delete().eq('id', deck.id);
    if (error) {
      alert('No se pudo borrar el mazo: ' + error.message);
      return;
    }
    onDeleteDeck?.(deck.id);
  };

  const totalWords = useMemo(
    () => decks.reduce((acc, d) => acc + Object.keys(d.words || {}).length, 0),
    [decks],
  );

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-rule bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <Logo size={26} />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl border border-rule text-ink-soft hover:bg-app transition-all"
              title="Ajustes"
              aria-label="Ajustes"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <button
              onClick={signOut}
              className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted hover:text-danger px-3 py-2 rounded-xl transition-all"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero / saludo */}
        <section className="mb-10 anim-fade-in">
          <p className="font-display-italic text-ink-muted text-lg">Bienvenido de vuelta</p>
          <h1 className="font-display text-5xl text-ink mt-1 leading-tight">
            Tu cuaderno de <span className="text-accent italic">palabras</span>
          </h1>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Mazos" value={decks.length} />
            <Stat label="Palabras" value={totalWords} />
            <Stat label="Sesiones" value={stats.sessionsCompleted} />
            <Stat label="Racha" value={`${stats.streak ?? 0}🔥`} />
          </div>
        </section>

        {/* Toolbar */}
        <section className="flex flex-wrap gap-3 mb-6 items-center justify-between">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar mazo o palabra…"
              className="w-full pl-10 pr-4 py-3 bg-surface border border-rule rounded-2xl text-sm outline-none focus:border-accent"
              style={{ color: 'var(--ink)' }}
            />
          </div>
          <div className="flex gap-2">
            {decks.length > 0 && (
              <button
                onClick={() => downloadAllDecksTxt(decks)}
                className="px-4 py-3 rounded-2xl border border-rule text-ink-soft text-sm font-bold hover:bg-app transition-all"
                title="Descargar todos los mazos como .txt"
              >
                Exportar todo
              </button>
            )}
            <button
              onClick={() => setIsCreatingDeck(true)}
              className="px-5 py-3 rounded-2xl bg-accent text-sm font-bold shadow-paper hover:shadow-paper-hover transition-all"
              style={{ color: 'var(--surface)' }}
            >
              + Nuevo mazo
            </button>
          </div>
        </section>

        {/* Grid de mazos */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onOpen={(d) => {
                setCurrentDeck(d);
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              onRename={onRenameDeck}
              onDelete={handleDeleteDeck}
              onSelectOrder={updateStudyOrder}
            />
          ))}

          <button
            onClick={() => setIsCreatingDeck(true)}
            className="border-2 border-dashed border-rule rounded-3xl p-7 flex flex-col items-center justify-center gap-3 hover:border-accent hover:bg-accent-surface/30 transition-all min-h-[11rem]"
          >
            <span className="w-12 h-12 rounded-full bg-accent-surface text-accent-ink flex items-center justify-center font-display text-2xl">
              +
            </span>
            <span className="text-xs uppercase tracking-[0.25em] font-bold text-ink-muted">
              Mazo nuevo
            </span>
          </button>
        </section>

        {filtered.length === 0 && decks.length > 0 && (
          <p className="text-center text-ink-muted mt-10 font-display-italic">
            Nada coincide con "{query}".
          </p>
        )}
      </main>

      {isCreatingDeck && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
          style={{ backgroundColor: 'rgba(31, 24, 16, 0.45)', backdropFilter: 'blur(6px)' }}
          onClick={() => setIsCreatingDeck(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateDeck}
            className="bg-surface-elevated border border-rule rounded-3xl w-full max-w-sm p-8 shadow-paper anim-pop"
          >
            <h3 className="font-display text-3xl text-ink mb-2">Nuevo mazo</h3>
            <p className="text-ink-muted text-sm mb-6">
              Empieza con un nombre breve. Después podrás llenarlo de palabras.
            </p>
            <input
              autoFocus
              className="w-full p-4 bg-app border border-rule rounded-2xl outline-none focus:border-accent font-display text-lg"
              style={{ color: 'var(--ink)' }}
              placeholder="Ej: Verbos irregulares"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
            />
            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                className="flex-1 bg-accent py-3 rounded-2xl font-bold shadow-paper"
                style={{ color: 'var(--surface)' }}
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingDeck(false)}
                className="flex-1 bg-app py-3 rounded-2xl font-bold text-ink-soft"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface border border-rule rounded-2xl px-4 py-3 shadow-paper">
      <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted">
        {label}
      </p>
      <p className="font-display text-2xl text-ink mt-1">{value}</p>
    </div>
  );
}
