import { useMemo, useState } from 'react';

export default function CardsReviewModal({
  cards: initialCards,
  decks = [],
  onClose,
  onSave,
  saving,
}) {
  const [cards, setCards] = useState(
    Array.isArray(initialCards)
      ? initialCards.map((c) => ({ ...c, include: true }))
      : [],
  );
  const [mode, setMode] = useState('new');
  const [deckName, setDeckName] = useState('');
  const [existingDeckId, setExistingDeckId] = useState('');
  const [error, setError] = useState('');

  const includedCount = useMemo(
    () => cards.filter((c) => c.include).length,
    [cards],
  );

  const updateCard = (idx, patch) => {
    setCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );
  };

  const removeCard = (idx) => {
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAll = (value) => {
    setCards((prev) => prev.map((c) => ({ ...c, include: value })));
  };

  const handleSave = () => {
    const selected = cards.filter((c) => c.include);
    if (selected.length === 0) {
      setError('No hay tarjetas seleccionadas.');
      return;
    }
    if (mode === 'new' && !deckName.trim()) {
      setError('Ponle un nombre al mazo nuevo.');
      return;
    }
    if (mode === 'existing' && !existingDeckId) {
      setError('Elegí un mazo existente.');
      return;
    }
    onSave({
      cards: selected.map(({ question, answer }) => ({
        question,
        answer,
      })),
      mode,
      deckName: deckName.trim(),
      existingDeckId,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ backgroundColor: 'rgba(31, 24, 16, 0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-elevated border border-rule rounded-3xl w-full max-w-3xl shadow-paper anim-pop flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <header className="px-6 py-5 border-b border-rule">
          <h2 className="font-display text-2xl text-ink">Revisa tus tarjetas</h2>
          <p className="text-sm text-ink-muted mt-1">
            La IA propuso {initialCards?.length ?? 0} tarjetas ·{' '}
            {includedCount} seleccionadas. Editá lo que quieras antes de guardar.
          </p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => toggleAll(true)}
              className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-lg border border-rule text-ink-muted hover:text-accent transition-all"
            >
              Todas
            </button>
            <button
              onClick={() => toggleAll(false)}
              className="text-[10px] uppercase tracking-[0.2em] font-bold px-3 py-1.5 rounded-lg border border-rule text-ink-muted hover:text-accent transition-all"
            >
              Ninguna
            </button>
          </div>
        </header>

        <div className="overflow-y-auto custom-scrollbar px-6 py-4 space-y-3 flex-1">
          {cards.length === 0 && (
            <p className="text-center text-ink-muted py-8 font-display-italic">
              No quedó ninguna tarjeta.
            </p>
          )}
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-4 transition-all ${
                card.include
                  ? 'border-rule bg-app'
                  : 'border-rule opacity-45'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={card.include}
                  onChange={(e) => updateCard(idx, { include: e.target.checked })}
                  className="mt-2 accent-[var(--accent)] w-4 h-4 cursor-pointer"
                />
                <div className="flex-1 space-y-2 min-w-0">
                  <textarea
                    value={card.question}
                    onChange={(e) => updateCard(idx, { question: e.target.value })}
                    rows={1}
                    className="w-full bg-transparent border-b border-rule focus:border-accent outline-none font-display text-lg resize-none"
                    style={{ color: 'var(--ink)' }}
                    placeholder="Pregunta"
                  />
                  <textarea
                    value={card.answer}
                    onChange={(e) => updateCard(idx, { answer: e.target.value })}
                    rows={2}
                    className="w-full bg-transparent border-b border-rule focus:border-accent outline-none text-sm resize-none custom-scrollbar"
                    style={{ color: 'var(--ink-muted)' }}
                    placeholder="Respuesta"
                  />
                </div>
                <button
                  onClick={() => removeCard(idx)}
                  title="Quitar tarjeta"
                  aria-label="Quitar tarjeta"
                  className="p-2 rounded-xl text-danger hover:bg-danger-surface transition-all shrink-0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="px-6 py-5 border-t border-rule space-y-4">
          {error && (
            <p className="text-sm text-danger bg-danger-surface px-4 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <label
              className={`rounded-2xl border p-3 cursor-pointer transition-all ${
                mode === 'new' ? 'border-accent bg-accent-surface/40' : 'border-rule'
              }`}
              onClick={() => setMode('new')}
            >
              <span className="block text-sm font-bold text-ink">Mazo nuevo</span>
              <input
                value={deckName}
                onChange={(e) => {
                  setMode('new');
                  setDeckName(e.target.value);
                }}
                placeholder="Ej: Biología cap. 1"
                className="w-full mt-2 bg-transparent border-b border-rule focus:border-accent outline-none text-sm pb-1"
                style={{ color: 'var(--ink)' }}
              />
            </label>

            <label
              className={`rounded-2xl border p-3 cursor-pointer transition-all ${
                mode === 'existing' ? 'border-accent bg-accent-surface/40' : 'border-rule'
              }`}
              onClick={() => setMode('existing')}
            >
              <span className="block text-sm font-bold text-ink">Sumar a mazo existente</span>
              <select
                value={existingDeckId}
                onChange={(e) => {
                  setMode('existing');
                  setExistingDeckId(e.target.value);
                }}
                className="w-full mt-2 bg-transparent border-b border-rule focus:border-accent outline-none text-sm pb-1"
                style={{ color: 'var(--ink)', backgroundColor: 'transparent' }}
              >
                <option value="">Elegí un mazo…</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-accent py-3 rounded-2xl font-bold shadow-paper disabled:opacity-60"
              style={{ color: 'var(--on-accent)' }}
            >
              {saving ? 'Guardando…' : `Guardar ${includedCount} tarjetas`}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 bg-app py-3 rounded-2xl font-bold text-ink-soft disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
