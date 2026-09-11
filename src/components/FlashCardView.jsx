import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { buildQueue, dailySeed, STUDY_ORDER_SHORT } from '../utils/studyQueue';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';
import NewWordModal from './NewWordModal';

/**
 * Vista de un mazo: recorre las palabras como fichas que se dan vuelta.
 *
 * Antes recibía 16 props desde App.jsx (hasta los setters del mazo y de la lista).
 * Ahora solo recibe el mazo —que la página resuelve desde la ruta— y escribe vía
 * `useDecks()`, así que la grilla de la pantalla de inicio se actualiza sola al
 * agregar o borrar una palabra.
 *
 * El índice se recorta al derivarlo en vez de sincronizarlo con un efecto: si
 * borran la última palabra, `safeIndex` cae al nuevo final sin renderizar una
 * ficha inexistente ni disparar renders en cascada.
 */
export default function FlashCardView({ deck }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addWord, deleteWord } = useDecks();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWordKey, setNewWordKey] = useState('');
  const [newWordValue, setNewWordValue] = useState('');

  // Un mazo público de otra persona se puede ver y estudiar, pero no editar:
  // RLS rechazaría el UPDATE, así que directamente no ofrecemos la acción.
  const readOnly = deck.user_id !== user?.id;

  const wordsArray = useMemo(
    () => buildQueue(deck.words || {}, deck.study_order, { seed: dailySeed() }),
    [deck.words, deck.study_order],
  );

  const safeIndex = Math.min(currentIndex, Math.max(wordsArray.length - 1, 0));
  const currentPair = wordsArray[safeIndex];
  const orderKey = STUDY_ORDER_SHORT[deck.study_order] ? deck.study_order : 'insertion';

  const goTo = (index) => {
    setIsFlipped(false);
    setCurrentIndex(index);
  };

  const handleDeleteWord = async () => {
    if (!currentPair) return;
    const wordKey = currentPair[0];
    const confirmed = window.confirm(`¿Eliminar la palabra "${wordKey}"?`);
    if (!confirmed) return;

    const { error } = await deleteWord(deck.id, wordKey);
    if (error) {
      alert('No se pudo borrar la palabra: ' + error.message);
      return;
    }
    setIsFlipped(false);
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    const key = newWordKey.trim();
    const value = newWordValue.trim();
    if (!key || !value) return;

    const { error } = await addWord(deck.id, key, value);
    if (error) {
      alert('No se pudo agregar la palabra: ' + error.message);
      return;
    }
    setNewWordKey('');
    setNewWordValue('');
    setIsAddingWord(false);
  };

  const formatContent = (text) =>
    String(text || '')
      .replaceAll('<br>', '\n')
      .replaceAll('<br />', '\n')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('<div>', '\n')
      .replaceAll('</div>', '');

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 w-full">
      <div className="w-full max-w-3xl mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="text-accent font-bold text-sm flex items-center gap-2 hover:bg-accent-surface px-3 py-2 rounded-xl transition-all"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
          Mazos
        </Link>

        <h1 className="font-display text-xl text-ink flex items-center gap-2 text-center">
          {deck.name}
          {orderKey !== 'insertion' && (
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent-ink bg-accent-surface px-2 py-1 rounded-lg">
              {STUDY_ORDER_SHORT[orderKey]}
            </span>
          )}
          {readOnly && (
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted bg-app px-2 py-1 rounded-lg">
              Solo lectura
            </span>
          )}
        </h1>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={() => setIsAddingWord(true)}
              className="bg-surface-elevated border border-rule px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-app transition-all flex items-center gap-2"
              title="Agregar palabra"
              aria-label="Agregar palabra"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Agregar
            </button>
          )}
          <button
            onClick={() => navigate(`/deck/${deck.id}/study`)}
            className="bg-accent px-4 py-2.5 rounded-xl font-bold text-sm shadow-paper hover:shadow-paper-hover transition-all flex items-center gap-2"
            style={{ color: 'var(--on-accent)' }}
          >
            <span className="text-[10px]">▶</span> Estudiar
          </button>
        </div>
      </div>

      {wordsArray.length > 0 ? (
        <div className="w-full max-w-2xl">
          {!readOnly && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleDeleteWord}
                className="text-[10px] uppercase tracking-[0.25em] font-bold text-danger hover:opacity-80 transition-all flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Borrar palabra
              </button>
            </div>
          )}

          <div
            className="h-[460px] w-full [perspective:1200px] cursor-pointer anim-fade-in"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div
              className={`relative h-full w-full rounded-[2rem] shadow-paper transition-all duration-700 [transform-style:preserve-3d] ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <div className="absolute inset-0 h-full w-full rounded-[2rem] bg-surface-elevated border border-rule p-10 flex flex-col [backface-visibility:hidden] overflow-hidden">
                <span className="text-[10px] font-black text-ink-muted uppercase tracking-[0.3em] mb-3 text-center">
                  Pregunta
                </span>
                <div className="flex-1 flex items-center justify-center">
                  <h2 className="font-display text-4xl text-ink text-center leading-tight">
                    {currentPair[0]}
                  </h2>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-ink-muted text-center">
                  Tocá para revelar
                </p>
              </div>

              <div
                className="absolute inset-0 h-full w-full rounded-[2rem] bg-accent p-10 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden"
                style={{ color: 'var(--on-accent)' }}
              >
                <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 opacity-60 text-center">
                  Respuesta
                </span>
                <div
                  className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="font-display text-2xl leading-relaxed whitespace-pre-wrap">
                    {formatContent(currentPair[1])}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between px-2 font-bold text-ink-muted text-xs uppercase tracking-[0.25em]">
            <button
              disabled={safeIndex === 0}
              onClick={() => goTo(safeIndex - 1)}
              className="hover:text-accent disabled:opacity-0 transition-all"
            >
              ← Anterior
            </button>
            <span>
              {safeIndex + 1} / {wordsArray.length}
            </span>
            <button
              disabled={safeIndex === wordsArray.length - 1}
              onClick={() => goTo(safeIndex + 1)}
              className="hover:text-accent disabled:opacity-0 transition-all"
            >
              Siguiente →
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center p-16 border-2 border-dashed border-rule rounded-[2rem] bg-surface max-w-md">
          <p className="font-display text-2xl text-ink-soft mb-2">Mazo vacío</p>
          <p className="text-sm text-ink-muted">
            {readOnly
              ? 'Este mazo todavía no tiene palabras.'
              : 'Agregá palabras con el botón Agregar o importá un .txt.'}
          </p>
        </div>
      )}

      <NewWordModal
        open={isAddingWord}
        onClose={() => setIsAddingWord(false)}
        newWordKey={newWordKey}
        setNewWordKey={setNewWordKey}
        newWordValue={newWordValue}
        setNewWordValue={setNewWordValue}
        handleAddWord={handleAddWord}
      />
    </main>
  );
}
