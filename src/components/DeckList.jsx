import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import DeckCard from './DeckCard';
import { downloadAllDecksTxt } from '../utils/deckIO';
import { useDecks } from '../hooks/useDecks';
import { useStats } from '../hooks/useStats';

export default function DeckList() {
  const navigate = useNavigate();
  const { decks, createDeck, deleteDeck } = useDecks();
  const stats = useStats();

  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return decks;
    return decks.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        Object.keys(d.words || {}).some((w) => w.toLowerCase().includes(q)),
    );
  }, [decks, query]);

  const totalWords = useMemo(
    () => decks.reduce((acc, d) => acc + Object.keys(d.words || {}).length, 0),
    [decks],
  );

  const openCreate = () => {
    setName('');
    setIsPublic(false);
    setIsCreating(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await createDeck(trimmed, {}, isPublic);
    if (error) {
      alert('No se pudo crear el mazo: ' + error.message);
      return;
    }
    setIsCreating(false);
  };

  const handleDelete = async (deck) => {
    const confirmed = window.confirm(
      `¿Borrar el mazo "${deck.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    const { error } = await deleteDeck(deck.id);
    if (error) alert('No se pudo borrar el mazo: ' + error.message);
  };

  return (
    <>
      <main className="w-full max-w-6xl mx-auto px-6 py-10">
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            >
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
              onClick={openCreate}
              className="px-5 py-3 rounded-2xl bg-accent text-sm font-bold shadow-paper hover:shadow-paper-hover transition-all"
              style={{ color: 'var(--on-accent)' }}
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
              onOpen={(d) => navigate(`/deck/${d.id}`)}
              onDelete={handleDelete}
            />
          ))}

          <button
            onClick={openCreate}
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

      {isCreating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
          style={{ backgroundColor: 'rgba(31, 24, 16, 0.45)', backdropFilter: 'blur(6px)' }}
          onClick={() => setIsCreating(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label className="mt-5 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-1 w-4 h-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="text-sm text-ink-soft">
                Hacerlo público
                <span className="block text-xs text-ink-muted mt-0.5">
                  Cualquiera podrá verlo en tu perfil. Podés cambiarlo después.
                </span>
              </span>
            </label>

            <div className="flex gap-3 mt-6">
              <button
                type="submit"
                className="flex-1 bg-accent py-3 rounded-2xl font-bold shadow-paper"
                style={{ color: 'var(--on-accent)' }}
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 bg-app py-3 rounded-2xl font-bold text-ink-soft"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
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
