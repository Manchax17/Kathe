import { useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { extractPdfText } from '../utils/pdfText';
import { extractCardsFromText } from '../utils/aiClient';
import CardsReviewModal from './CardsReviewModal';

const STATUS = {
  idle: 'idle',
  reading: 'reading',
  thinking: 'thinking',
  review: 'review',
};

export default function PdfImporter({ decks, setDecks }) {
  const [status, setStatus] = useState(STATUS.idle);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [aiCards, setAiCards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const busy = status === STATUS.reading || status === STATUS.thinking;

  const reset = () => {
    setStatus(STATUS.idle);
    setProgress(null);
    setError('');
    setFileName('');
    setAiCards([]);
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
      const cards = await extractCardsFromText(text, { count: 30 });
      setAiCards(cards);
      setStatus(STATUS.review);

      if (truncated) {
        console.warn(
          `PDF truncado: ${originalLength} caracteres → se usaron los primeros ${text.length}.`,
        );
      }
    } catch (err) {
      setError(err.message || 'Algo salió mal procesando el PDF.');
      setStatus(STATUS.idle);
    }
  };

  const handleSave = async ({ cards, mode, deckName, existingDeckId }) => {
    setSaving(true);
    try {
      let targetId = existingDeckId;
      let deckLabel;

      if (mode === 'new') {
        const { data, error } = await supabase
          .from('decks')
          .insert([{ name: deckName, words: {}, user_id: (await supabase.auth.getUser()).data.user.id }])
          .select();
        if (error) throw error;
        targetId = data[0].id;
        deckLabel = data[0].name;
      } else {
        const existing = decks.find((d) => d.id === existingDeckId);
        if (!existing) throw new Error('El mazo seleccionado ya no existe.');
        deckLabel = existing.name;
      }

      const current = decks.find((d) => d.id === targetId);
      const mergedWords = { ...(current?.words || {}) };
      cards.forEach(({ question, answer }) => {
        mergedWords[question] = answer;
      });

      const { data, error } = await supabase
        .from('decks')
        .update({ words: mergedWords })
        .eq('id', targetId)
        .select();
      if (error) throw error;

      setDecks((prev) => {
        const exists = prev.some((d) => d.id === targetId);
        return exists
          ? prev.map((d) => (d.id === targetId ? data[0] : d))
          : [data[0], ...prev];
      });

      alert(
        `Se agregaron ${cards.length} tarjetas al mazo "${deckLabel}".`,
      );
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
        <div className="mt-4 flex items-start gap-3 bg-danger-surface border border-rule rounded-2xl p-4">
          <p className="text-sm text-danger flex-1">{error}</p>
          <button
            onClick={reset}
            className="text-[10px] uppercase tracking-[0.2em] font-bold text-danger hover:opacity-70 shrink-0"
          >
            Cerrar
          </button>
        </div>
      )}

      {status === STATUS.review && (
        <CardsReviewModal
          key="review"
          cards={aiCards}
          decks={decks}
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
