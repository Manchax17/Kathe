import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { extractPdfText } from '../utils/pdfText';
import { extractCardsFromText } from '../utils/aiClient';
import { useDecks } from '../hooks/useDecks';
import CardsReviewModal from './CardsReviewModal';

const STATUS = {
  idle: 'idle',
  reading: 'reading',
  thinking: 'thinking',
  review: 'review',
};

/**
 * PDF → flashcards con IA.
 *
 * Antes recibía `decks` / `setDecks` por props y, para crear el mazo destino,
 * volvía a pedir el usuario con `supabase.auth.getUser()` en medio del guardado.
 * Ahora lee la lista del contexto y escribe con `createDeck` / `updateWords`, así
 * que no hay que re-fetchear nada ni recargar la página.
 */
export default function PdfImporter() {
  const { decks, createDeck, updateWords } = useDecks();

  const [status, setStatus] = useState(STATUS.idle);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  // Separado de `error` porque además de mostrarlo cambia lo que se ofrece:
  // ante un tope de cuota, un enlace a Ajustes.
  const [rateLimited, setRateLimited] = useState(false);
  const [fileName, setFileName] = useState('');
  const [aiCards, setAiCards] = useState([]);
  // Si la generación salió con la key del propio usuario en vez de la del
  // servidor. Se muestra en la revisión: si el resultado es pobre, el problema
  // está en su key o su modelo, y conviene que lo sepa.
  const [usedOwnKey, setUsedOwnKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const busy = status === STATUS.reading || status === STATUS.thinking;

  const reset = () => {
    setStatus(STATUS.idle);
    setProgress(null);
    setError('');
    setRateLimited(false);
    setFileName('');
    setAiCards([]);
    setUsedOwnKey(false);
  };

  const processFile = async (file) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se admiten archivos PDF.');
      return;
    }

    setError('');
    setFileName(file.name);

    try {
      // 1. Extraer texto en el cliente
      setStatus(STATUS.reading);
      const { text, truncated, originalLength } = await extractPdfText(file, {
        onProgress: ({ page, total }) => setProgress({ page, total }),
      });

      // 2. Pedir flashcards a la IA
      setStatus(STATUS.thinking);
      setProgress(null);
      const { cards, usedOwnKey } = await extractCardsFromText(text, { count: 30 });
      setAiCards(cards);
      setUsedOwnKey(usedOwnKey);
      setStatus(STATUS.review);

      if (truncated) {
        console.warn(
          `PDF truncado: ${originalLength} caracteres → se usaron los primeros ${text.length}.`,
        );
      }
    } catch (err) {
      setError(err.message || 'Algo salió mal procesando el PDF.');
      setRateLimited(Boolean(err.rateLimited));
      setStatus(STATUS.idle);
    }
  };

  const handleSave = async ({ cards, mode, deckName, existingDeckId }) => {
    setSaving(true);
    try {
      let targetId = existingDeckId;
      let deckLabel;
      let baseWords = {};

      if (mode === 'new') {
        const { data, error: createError } = await createDeck(deckName, {}, false);
        if (createError) throw createError;
        targetId = data.id;
        deckLabel = data.name;
      } else {
        const existing = decks.find((d) => d.id === existingDeckId);
        if (!existing) throw new Error('El mazo seleccionado ya no existe.');
        deckLabel = existing.name;
        baseWords = existing.words || {};
      }

      const mergedWords = { ...baseWords };
      cards.forEach(({ question, answer }) => {
        mergedWords[question] = answer;
      });

      const { error: updateError } = await updateWords(targetId, mergedWords);
      if (updateError) throw updateError;

      alert(`Se agregaron ${cards.length} tarjetas al mazo "${deckLabel}".`);
      reset();
    } catch (err) {
      alert('No se pudo guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-surface-elevated border border-rule rounded-3xl p-6 shadow-paper mt-8">
      <header className="mb-4">
        <h3 className="font-display text-xl text-ink">Generar con IA desde un PDF</h3>
        <p className="text-sm text-ink-muted">
          Sube un documento con texto y la IA extrae los conceptos clave como
          flashcards. Revisa y edita antes de guardar.
        </p>
      </header>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!busy) processFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !busy && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
          dragOver ? 'border-accent bg-accent-surface/30' : 'border-rule hover:border-accent'
        } ${busy ? 'pointer-events-none opacity-70' : ''}`}
      >
        {status === STATUS.reading ? (
          <>
            <Spinner />
            <p className="font-display text-lg text-ink">Leyendo {fileName}…</p>
            {progress && (
              <p className="text-xs text-ink-muted uppercase tracking-[0.25em]">
                Página {progress.page} / {progress.total}
              </p>
            )}
          </>
        ) : status === STATUS.thinking ? (
          <>
            <Spinner />
            <p className="font-display text-lg text-ink">
              La IA está pensando…
            </p>
            <p className="text-xs text-ink-muted">
              Extrayendo conceptos clave de {fileName}
            </p>
          </>
        ) : (
          <>
            <span className="w-12 h-12 rounded-full bg-accent-surface text-accent-ink flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            </span>
            <p className="font-display text-lg text-ink">
              Arrastrá tu PDF acá o hacé click
            </p>
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-ink-muted">
              Solo PDFs con texto · máx ~40 páginas
            </p>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => processFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <div className="mt-4 bg-danger-surface border border-rule rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <p className="text-sm text-danger flex-1">{error}</p>
            <button
              onClick={reset}
              className="text-[10px] uppercase tracking-[0.2em] font-bold text-danger hover:opacity-70 shrink-0"
            >
              Cerrar
            </button>
          </div>
          {rateLimited && (
            // El tope de la key del servidor se destraba cargando la propia, así
            // que ofrecemos el camino en vez de dejar al usuario esperando.
            <Link
              to="/ajustes"
              onClick={reset}
              className="inline-block mt-3 text-xs font-bold text-danger underline underline-offset-2 hover:opacity-70"
            >
              Cargar mi propia API key →
            </Link>
          )}
        </div>
      )}

      {status === STATUS.review && (
        <CardsReviewModal
          key="review"
          cards={aiCards}
          decks={decks}
          usedOwnKey={usedOwnKey}
          onClose={reset}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </section>
  );
}

function Spinner() {
  return (
    <span
      className="w-8 h-8 rounded-full border-[3px] border-rule animate-spin"
      style={{ borderTopColor: 'var(--accent)' }}
      aria-hidden
    />
  );
}
