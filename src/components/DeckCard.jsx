import { useEffect, useRef, useState } from 'react';
import { STUDY_ORDERS, STUDY_ORDER_LABELS, STUDY_ORDER_SHORT } from '../utils/studyQueue';
import { downloadDeckTxt } from '../utils/deckIO';
import { useDecks } from '../hooks/useDecks';

/**
 * `readOnly` se usa en los perfiles ajenos: se ve el mazo, pero sin menú de
 * opciones (no sos el dueño).
 */
export default function DeckCard({ deck, onOpen, onDelete, readOnly = false }) {
  const { renameDeck, setDescription, setStudyOrder, setPublic } = useDecks();
  const [openMenu, setOpenMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(deck.name);
  // null = no se está editando la descripción. Se separa de `renaming` porque
  // son dos campos distintos y editar uno no debería cerrar el otro.
  const [descDraft, setDescDraft] = useState(null);
  const menuRef = useRef(null);

  const orderKey = STUDY_ORDERS.includes(deck.study_order) ? deck.study_order : 'insertion';
  const isPublic = Boolean(deck.is_public);
  const description = deck.description || '';

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    if (openMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  const wordCount = Object.keys(deck.words || {}).length;

  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === deck.name) {
      setRenaming(false);
      setNameDraft(deck.name);
      return;
    }
    const { error } = await renameDeck(deck.id, trimmed);
    if (error) {
      alert('No se pudo renombrar: ' + error.message);
      return;
    }
    setRenaming(false);
  };

  const handleDescriptionSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = (descDraft ?? '').trim();
    if (trimmed === description) {
      setDescDraft(null);
      return;
    }
    const { error } = await setDescription(deck.id, trimmed);
    if (error) {
      alert(
        'No se pudo guardar la descripción. Revisá que la migración 0007 esté aplicada en Supabase.',
      );
      return;
    }
    setDescDraft(null);
  };

  const handleTogglePublic = async () => {
    setOpenMenu(false);
    const { error } = await setPublic(deck.id, !isPublic);
    if (error) {
      alert(
        'No se pudo cambiar la visibilidad. Revisá que la migración 0003 esté aplicada en Supabase.',
      );
    }
  };

  return (
    <article
      onClick={() => !renaming && onOpen(deck)}
      className="relative bg-surface-elevated border border-rule rounded-3xl p-7 shadow-paper hover:shadow-paper-hover transition-all cursor-pointer anim-fade-in group"
      style={{ minHeight: '11rem', zIndex: openMenu ? 30 : undefined }}
    >
      {!readOnly && (
        <div ref={menuRef} className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenu((v) => !v);
            }}
            className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-app transition-all"
            aria-label="Opciones del mazo"
            aria-expanded={openMenu}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {openMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-11 w-64 max-h-[min(26rem,calc(100vh-6rem))] overflow-y-auto custom-scrollbar bg-surface-elevated border border-rule rounded-2xl shadow-paper p-2 text-left anim-fade-in"
            >
              <p className="px-3 py-2 text-[10px] font-black text-ink-muted uppercase tracking-[0.2em]">
                Modo de estudio
              </p>
              <div className="space-y-1 pb-2 mb-1 border-b border-rule">
                {STUDY_ORDERS.map((order) => (
                  <button
                    key={order}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(false);
                      setStudyOrder(deck.id, order);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                      orderKey === order
                        ? 'bg-accent-surface text-accent-ink'
                        : 'text-ink-soft hover:bg-app'
                    }`}
                  >
                    <span>{STUDY_ORDER_LABELS[order]}</span>
                    {orderKey === order && (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(false);
                  setRenaming(true);
                  setNameDraft(deck.name);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-ink-soft hover:bg-app transition-all"
              >
                Renombrar
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(false);
                  setDescDraft(description);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-ink-soft hover:bg-app transition-all"
              >
                {description ? 'Editar descripción' : 'Agregar descripción'}
              </button>

              <button
                onClick={handleTogglePublic}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-ink-soft hover:bg-app transition-all flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {isPublic ? 'Hacer privado' : 'Hacer público'}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(false);
                  downloadDeckTxt(deck);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-ink-soft hover:bg-app transition-all flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Descargar .txt
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(false);
                  onDelete?.(deck);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-danger bg-danger-surface hover:opacity-80 transition-all flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar mazo
              </button>
            </div>
          )}
        </div>
      )}

      {renaming ? (
        <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setRenaming(false);
                setNameDraft(deck.name);
              }
            }}
            className="w-full bg-app border border-rule rounded-xl px-3 py-2 font-display text-xl outline-none"
            style={{ color: 'var(--ink)' }}
          />
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              className="flex-1 bg-accent py-2 rounded-xl font-bold text-sm"
              style={{ color: 'var(--on-accent)' }}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRenaming(false);
                setNameDraft(deck.name);
              }}
              className="flex-1 bg-app py-2 rounded-xl font-bold text-sm text-ink-soft"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : descDraft !== null ? (
        <form onSubmit={handleDescriptionSubmit} onClick={(e) => e.stopPropagation()}>
          <h3 className="font-display text-xl text-ink leading-tight truncate mb-3" title={deck.name}>
            {deck.name}
          </h3>
          <textarea
            autoFocus
            rows={3}
            maxLength={280}
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setDescDraft(null);
              }
            }}
            placeholder="¿De qué trata este mazo?"
            className="w-full bg-app border border-rule rounded-xl px-3 py-2 text-sm outline-none focus:border-accent resize-none custom-scrollbar"
            style={{ color: 'var(--ink)' }}
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              type="submit"
              className="flex-1 bg-accent py-2 rounded-xl font-bold text-sm"
              style={{ color: 'var(--on-accent)' }}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDescDraft(null);
              }}
              className="flex-1 bg-app py-2 rounded-xl font-bold text-sm text-ink-soft"
            >
              Cancelar
            </button>
            <span className="text-[10px] text-ink-muted shrink-0">{descDraft.length}/280</span>
          </div>
        </form>
      ) : (
        <>
          <div className={readOnly ? '' : 'pr-10'}>
            <h3 className="font-display text-2xl text-ink leading-tight truncate" title={deck.name}>
              {deck.name}
            </h3>
            <p className="text-xs uppercase tracking-[0.25em] text-ink-muted mt-1 font-medium">
              {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
            </p>
            {description && (
              // Dos líneas como mucho: la tarjeta tiene alto fijo y una
              // descripción larga desbordaría el botón de abajo. El texto
              // completo está en el title.
              <p
                className="text-sm text-ink-soft mt-3 leading-snug line-clamp-2"
                title={description}
              >
                {description}
              </p>
            )}
          </div>

          <div className="absolute bottom-5 left-7 right-7 flex items-center justify-between">
            {isPublic ? (
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent-ink bg-accent-surface px-2 py-1 rounded-lg">
                Público
              </span>
            ) : orderKey !== 'insertion' ? (
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent-ink bg-accent-surface px-2 py-1 rounded-lg">
                {STUDY_ORDER_SHORT[orderKey]}
              </span>
            ) : (
              <span />
            )}
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted group-hover:text-accent transition-all">
              {readOnly ? 'Ver →' : 'Estudiar →'}
            </span>
          </div>
        </>
      )}
    </article>
  );
}
