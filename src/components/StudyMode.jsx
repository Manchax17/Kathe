import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { buildQueue, dailySeed } from '../utils/studyQueue';
import { recordSession } from '../utils/stats';

export default function StudyMode({ deck, onExit }) {
  const initialQueue = useMemo(
    () => buildQueue(deck.words || {}, deck.study_order, { seed: dailySeed() }),
    [deck.words, deck.study_order],
  );
  const [sessionQueue, setSessionQueue] = useState(initialQueue);
  const [totalInitial] = useState(initialQueue.length);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [failCounts, setFailCounts] = useState({});
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [wordsSeen, setWordsSeen] = useState(new Set());
  const recordedRef = useRef(false);
  const currentPair = sessionQueue[currentIndex];

  const handleAnswer = useCallback(
    (isCorrect) => {
      if (!isFlipped) return;
      const wordKey = currentPair[0];
      setIsFlipped(false);

      setTimeout(() => {
        if (isCorrect) {
          setScore((prev) => prev + 1);
          if (!wordsSeen.has(wordKey)) setFirstTryCorrect((prev) => prev + 1);

          const newQueue = [...sessionQueue];
          newQueue.splice(currentIndex, 1);

          if (newQueue.length === 0) {
            setFinished(true);
          } else {
            setSessionQueue(newQueue);
            if (currentIndex >= newQueue.length) setCurrentIndex(0);
          }
        } else {
          setScore((prev) => prev - 1);
          setFailCounts((prev) => ({ ...prev, [wordKey]: (prev[wordKey] || 0) + 1 }));

          const newQueue = [...sessionQueue];
          const [failedWord] = newQueue.splice(currentIndex, 1);
          const randomPos = Math.floor(Math.random() * newQueue.length + 1);
          newQueue.splice(randomPos, 0, failedWord);
          setSessionQueue(newQueue);
        }
        setWordsSeen((prev) => new Set(prev).add(wordKey));
      }, 280);
    },
    [isFlipped, currentIndex, sessionQueue, currentPair, wordsSeen],
  );

  useEffect(() => {
    if (finished && !recordedRef.current) {
      recordedRef.current = true;
      recordSession({
        cardsAnswered: totalInitial,
        firstTryCorrect,
      });
    }
  }, [finished, totalInitial, firstTryCorrect]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === '1') handleAnswer(false);
      else if (e.key === '2') handleAnswer(true);
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAnswer]);

  const formatContent = (text) =>
    String(text || '')
      .replaceAll('<br>', '\n')
      .replaceAll('<br />', '\n')
      .replaceAll('&nbsp;', ' ')
      .replaceAll('<div>', '\n')
      .replaceAll('</div>', '');

  if (finished) {
    const pct = totalInitial > 0 ? ((firstTryCorrect / totalInitial) * 100).toFixed(0) : '0';
    const mostFailed = Object.entries(failCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return (
      <div className="flex-1 flex items-center justify-center p-6 w-full">
        <div className="bg-surface-elevated border border-rule rounded-[2rem] w-full max-w-2xl p-10 shadow-paper anim-pop">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="font-display text-4xl text-ink">Sesión terminada</h2>
            <p className="text-ink-muted font-display-italic mt-2">
              "Cada repaso es un paso más."
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-accent-surface rounded-2xl p-5 text-center border border-rule">
              <p className="font-display text-4xl text-accent-ink">{pct}%</p>
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent-ink/70 mt-1">
                Dominio a la primera
              </p>
            </div>
            <div className="bg-app rounded-2xl p-5 text-center border border-rule">
              <p className="font-display text-4xl text-ink">{score}</p>
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted mt-1">
                Puntos
              </p>
            </div>
          </div>

          {mostFailed.length > 0 && (
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-danger mb-3">
                Conceptos a repasar
              </p>
              <div className="space-y-2">
                {mostFailed.map(([word, count]) => (
                  <div
                    key={word}
                    className="flex justify-between items-center bg-danger-surface px-4 py-3 rounded-2xl border border-rule"
                  >
                    <span className="font-medium text-ink truncate">{word}</span>
                    <span className="text-[10px] uppercase font-bold text-danger bg-surface px-2 py-1 rounded-lg">
                      {count} {count === 1 ? 'error' : 'errores'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onExit}
            className="w-full bg-accent py-4 rounded-2xl font-bold shadow-paper hover:shadow-paper-hover transition-all"
            style={{ color: 'var(--on-accent)' }}
          >
            Volver a mis mazos
          </button>
        </div>
      </div>
    );
  }

  if (!currentPair) return null;

  return (
    <div className="flex-1 flex flex-col w-full">
      <header className="border-b border-rule bg-surface">
        <div className="max-w-2xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={onExit}
            className="text-ink-muted hover:text-ink text-sm font-bold flex items-center gap-1"
          >
            ← Salir
          </button>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted">
            {totalInitial - sessionQueue.length} / {totalInitial}
          </span>
          <span
            className={`font-bold text-sm ${
              score >= 0 ? 'text-accent' : 'text-danger'
            }`}
          >
            {score} pts
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        <div
          className="h-[440px] w-full [perspective:1200px] cursor-pointer anim-fade-in"
          onClick={() => setIsFlipped((p) => !p)}
        >
          <div
            className={`relative h-full w-full rounded-[2rem] shadow-paper transition-all duration-700 [transform-style:preserve-3d] ${
              isFlipped ? '[transform:rotateY(180deg)]' : ''
            }`}
          >
            <div className="absolute inset-0 h-full w-full rounded-[2rem] bg-surface-elevated border border-rule p-10 flex flex-col [backface-visibility:hidden]">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-ink-muted text-center mb-4">
                Pregunta
              </span>
              <div className="flex-1 flex items-center justify-center">
                <h2 className="font-display text-4xl text-ink text-center leading-tight whitespace-pre-wrap">
                  {formatContent(currentPair[0])}
                </h2>
              </div>
            </div>
            <div
              className="absolute inset-0 h-full w-full rounded-[2rem] bg-accent p-10 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)]"
              style={{ color: 'var(--on-accent)' }}
            >
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-60 text-center mb-4">
                Respuesta
              </span>
              <div
                className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="font-display text-2xl leading-relaxed whitespace-pre-wrap">
                  {formatContent(currentPair[1])}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-2 gap-3 w-full mt-8 transition-all duration-300 ${
            isFlipped
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <button
            onClick={() => handleAnswer(false)}
            className="bg-surface-elevated border-2 border-danger text-danger py-5 rounded-2xl font-bold uppercase tracking-[0.2em] hover:bg-danger hover:text-white transition-all"
          >
            <span className="block">Incorrecto</span>
            <span className="block text-[10px] opacity-60 mt-1">Tecla 1</span>
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="bg-accent py-5 rounded-2xl font-bold uppercase tracking-[0.2em] hover:shadow-paper-hover transition-all"
            style={{ color: 'var(--on-accent)' }}
          >
            <span className="block">Correcto</span>
            <span className="block text-[10px] opacity-80 mt-1">Tecla 2</span>
          </button>
        </div>

        {!isFlipped && (
          <p className="text-center text-[10px] uppercase tracking-[0.3em] font-bold text-ink-muted mt-6 animate-pulse">
            Espacio o tocá para revelar
          </p>
        )}
      </main>
    </div>
  );
}
