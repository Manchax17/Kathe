import { useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';

const SAMPLE = `# Comentarios opcionales con #
hello\thola
world\tmundo
"good morning"\t"buenos días"
"complex answer with <br>tags"\t"primera línea<br>segunda línea"`;

/**
 * Importador de .txt / texto pegado.
 *
 * Antes recibía `decks` y `userId` por props, escribía con `supabase` directo y
 * cerraba con `window.location.reload()` — algo que rompe de lleno con el router:
 * tiraba abajo toda la app para mostrar un mazo nuevo.
 *
 * Ahora usa `createDeck` / `updateWords` del contexto, que ya actualizan la lista
 * en memoria, así que la grilla reacciona sin recargar.
 */
export default function FileImporter() {
  const { user } = useAuth();
  const { decks, createDeck, updateWords, refresh } = useDecks();

  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pasted, setPasted] = useState('');
  const fileInputRef = useRef(null);

  const importWords = async (deckName, newWords) => {
    const existing = decks.find((d) => d.name === deckName);

    if (existing) {
      const { error } = await updateWords(existing.id, { ...existing.words, ...newWords });
      if (error) throw error;
      return { merged: true, count: Object.keys(newWords).length };
    }

    if (!user) throw new Error('No hay sesión activa.');
    const { error } = await createDeck(deckName, newWords, false);
    if (error) throw error;
    return { merged: false, count: Object.keys(newWords).length };
  };

  const parseText = (text) => {
    const lines = text.split('\n');
    const words = {};
    lines.forEach((line) => {
      if (line.startsWith('#') || !line.trim()) return;
      const cols = line.split('\t');
      if (cols.length >= 2) {
        const q = cols[0].trim();
        const a = cols[1].trim().replace(/^"|"$/g, '').replaceAll('""', '"');
        if (q && a) words[q] = a;
      }
    });
    return words;
  };

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const deckName = file.name.replace(/\.txt$/i, '').trim() || 'Importado';
      const text = await file.text();
      const words = parseText(text);
      if (Object.keys(words).length === 0) {
        alert('No se detectaron datos válidos.');
        return;
      }
      const result = await importWords(deckName, words);
      alert(
        result.merged
          ? `Se agregaron ${result.count} palabras al mazo "${deckName}".`
          : `Mazo "${deckName}" creado con ${result.count} palabras.`,
      );
      setPasted('');
      await refresh();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setBusy(false);
      // Permite volver a elegir el mismo archivo si la importación falló.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteImport = async () => {
    const deckName = window.prompt('Nombre del mazo para el texto pegado:');
    if (!deckName) return;
    setBusy(true);
    try {
      const words = parseText(pasted);
      if (Object.keys(words).length === 0) {
        alert('No se detectaron datos válidos.');
        return;
      }
      await importWords(deckName, words);
      setPasted('');
      await refresh();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const sampleWordCount = parseText(SAMPLE);

  return (
    <section className="bg-surface-elevated border border-rule rounded-3xl p-6 shadow-paper">
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-xl text-ink">Importar palabras</h3>
          <p className="text-sm text-ink-muted">
            Formato Anki: <span className="font-mono">pregunta ⇥ respuesta</span> por línea.
          </p>
        </div>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="text-xs uppercase tracking-[0.25em] font-bold text-ink-muted hover:text-accent transition-all px-3 py-1.5 rounded-lg border border-rule"
        >
          {showHelp ? 'Ocultar ayuda' : 'Ver formato'}
        </button>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <label
          className={`cursor-pointer bg-accent px-5 py-3 rounded-2xl font-bold text-sm shadow-paper transition-all ${
            busy ? 'opacity-60 pointer-events-none' : 'hover:shadow-paper-hover'
          }`}
          style={{ color: 'var(--on-accent)' }}
        >
          Seleccionar .txt
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
        <span className="text-xs text-ink-muted">
          o pega abajo y presiona "Pegar e importar"
        </span>
      </div>

      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        placeholder={'hola\thello\nmundo\tworld'}
        className="w-full mt-4 p-3 bg-app border border-rule rounded-2xl font-mono text-xs outline-none focus:border-accent"
        style={{ color: 'var(--ink)' }}
        rows={3}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={handlePasteImport}
          disabled={!pasted.trim() || busy}
          className="px-4 py-2 rounded-xl bg-app border border-rule text-ink-soft text-xs font-bold hover:bg-accent-surface hover:text-accent-ink disabled:opacity-40 transition-all"
        >
          Pegar e importar
        </button>
      </div>

      {showHelp && (
        <div className="mt-5 grid md:grid-cols-2 gap-4 anim-fade-in">
          <div className="bg-app border border-rule rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted mb-2">
              Reglas
            </p>
            <ul className="text-sm text-ink-soft space-y-1.5 list-disc list-inside">
              <li>Una pareja por línea.</li>
              <li>Pregunta y respuesta separadas por tabulador.</li>
              <li>La respuesta se puede envolver en comillas dobles.</li>
              <li>Líneas que empiezan con <span className="font-mono">#</span> se ignoran.</li>
              <li>HTML básico (etiqueta <code className="font-mono">br</code>) se respeta al mostrar.</li>
            </ul>
          </div>
          <div className="bg-app border border-rule rounded-2xl p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted mb-2">
              Ejemplo ({Object.keys(sampleWordCount).length} tarjetas)
            </p>
            <pre className="font-mono text-xs text-ink whitespace-pre overflow-x-auto leading-relaxed">
              {SAMPLE}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
}
