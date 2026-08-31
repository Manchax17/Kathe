import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { buildQueue, dailySeed, STUDY_ORDER_SHORT } from '../utils/studyQueue';
import NewWordModal from './NewWordModal';

export default function FlashcardView({
  currentDeck, setCurrentDeck, currentIndex, setCurrentIndex,
  isFlipped, setIsFlipped, setDecks, decks, onStartStudy,
  isAddingWord, setIsAddingWord, newWordKey, setNewWordKey, newWordValue,
  setNewWordValue, handleAddWord,
}) {
  const wordsArray = useMemo(
    () => buildQueue(currentDeck.words || {}, currentDeck.study_order, { seed: dailySeed() }),
    [currentDeck.words, currentDeck.study_order],
  );
  const currentPair = wordsArray[currentIndex];
  const orderKey = STUDY_ORDER_SHORT[currentDeck.study_order] ? currentDeck.study_order : 'insertion';

  const handleDeleteWord = async () => {
    if (!currentPair) return;
    const wordKey = currentPair[0];
    const confirmed = window.confirm(`¿Eliminar la palabra "${wordKey}"?`);
    if (!confirmed) return;

    try {
      const updatedWords = { ...currentDeck.words };
      delete updatedWords[wordKey];

      const { data, error } = await supabase
        .from('decks')
        .update({ words: updatedWords })
        .eq('id', currentDeck.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newDeck = data[0];
        const newArray = Object.entries(newDeck.words || {});
        setIsFlipped(false);
        if (newArray.length > 0 && currentIndex >= newArray.length) {
          setCurrentIndex(newArray.length - 1);
        } else if (newArray.length === 0) {
          setCurrentIndex(0);
        }
        setCurrentDeck(newDeck);
        setDecks(decks.map((d) => (d.id === currentDeck.id ? newDeck : d)));
      }
    } catch {
      alert('No se pudo borrar la palabra.');
    }
  };

  const formatContent = (text) =>
    String(text || '')
      .replaceAll('<br>', '\n')
      .replaceAll('<br />', '\n')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('<div>', '\n')
      .replaceAll('</div>', '');

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <header className="border-b border-rule bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => {
              setCurrentDeck(null);
              setIsFlipped(false);
            }}
            className="text-accent font-bold text-sm flex items-center gap-2 hover:bg-accent-surface px-3 py-2 rounded-xl transition-all"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
            Mazos
          </button>

          <h1 className="font-display text-xl text-ink flex items-center gap-2">
            {currentDeck.name}
            {orderKey !== 'insertion' && (
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent-ink bg-accent-surface px-2 py-1 rounded-lg">
                {STUDY_ORDER_SHORT[orderKey]}
              </span>
            )}
          </h1>

          <div className="flex items-center gap-2">
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
            <button
              onClick={onStartStudy}
              className="bg-accent px-4 py-2.5 rounded-xl font-bold text-sm shadow-paper hover:shadow-paper-hover transition-all flex items-center gap-2"
              style={{ color: 'var(--surface)' }}
            >
              <span className="text-[10px]">▶</span> Estudiar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {wordsArray.length > 0 ? (
          <div className="w-full max-w-2xl">
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

            <div
              className="h-[460px] w-full [perspective:1200px] cursor-pointer anim-fade-in"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className={`relative h-full w-full rounded-[2rem] shadow-paper transition-all duration-700 [transform-style:preserve-3d] ${
                  isFlipped ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                <div
                  className="absolute inset-0 h-full w-full rounded-[2rem] bg-surface-elevated border border-rule p-10 flex flex-col [backface-visibility:hidden] overflow-hidden"
                >
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
                  style={{ color: 'var(--surface)' }}
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
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex(currentIndex - 1);
                  setIsFlipped(false);
                }}
                className="hover:text-accent disabled:opacity-0 transition-all"
              >
                ← Anterior
              </button>
              <span>
                {currentIndex + 1} / {wordsArray.length}
              </span>
              <button
                disabled={currentIndex === wordsArray.length - 1}
                onClick={() => {
                  setCurrentIndex(currentIndex + 1);
                  setIsFlipped(false);
                }}
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
              Agregá palabras desde el menú ⋯ o importá un .txt.
            </p>
          </div>
        )}
      </main>

      <NewWordModal
        open={isAddingWord}
        onClose={() => setIsAddingWord(false)}
        newWordKey={newWordKey}
        setNewWordKey={setNewWordKey}
        newWordValue={newWordValue}
        setNewWordValue={setNewWordValue}
        handleAddWord={handleAddWord}
      />
    </div>
  );
}
