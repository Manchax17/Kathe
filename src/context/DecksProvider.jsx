import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { DecksContext } from './decksContext';

// Postgres: 42703 = undefined_column. Lo usamos para que la app siga funcionando
// aunque todavía no se haya corrido la migración 0003 (columna is_public).
const UNDEFINED_COLUMN = '42703';

function queryOwnDecks(uid) {
  return supabase
    .from('decks')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
}

export function DecksProvider({ children }) {
  const { user } = useAuth();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Espejo de `decks` para que los callbacks de abajo sean estables (identidad
  // constante) aunque la lista cambie. Sin esto, cualquier efecto que los use
  // como dependencia se re-ejecutaría en cada modificación de un mazo.
  const decksRef = useRef(decks);
  useEffect(() => {
    decksRef.current = decks;
  }, [decks]);

  // Carga de los mazos propios.
  //
  // El `.eq('user_id', uid)` es OBLIGATORIO: la política de mazos públicos
  // (migración 0003) se combina con OR junto a la de "lo mío", así que sin este
  // filtro la query devolvería también los mazos públicos de los demás.
  useEffect(() => {
    let active = true;
    const uid = user?.id ?? null;

    const run = async () => {
      if (!uid) {
        if (active) {
          setDecks([]);
          setError('');
          setLoading(false);
        }
        return;
      }
      if (active) setLoading(true);

      const { data, error: err } = await queryOwnDecks(uid);
      if (!active) return;

      setLoading(false);
      if (err) {
        setError('No se pudieron cargar tus mazos: ' + err.message);
        return;
      }
      setError('');
      setDecks(data || []);
    };

    run();
    return () => {
      active = false;
    };
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error: err } = await queryOwnDecks(user.id);
    if (!err) setDecks(data || []);
  }, [user]);

  // ───────── Mutaciones ─────────
  // Todas devuelven { data } o { error } para que la vista decida qué mostrar.

  const createDeck = useCallback(
    async (name, words = {}, isPublic = false, description = '') => {
      if (!user) return { error: new Error('No hay sesión activa.') };
      const row = { name, words, user_id: user.id, is_public: isPublic, description };

      let result = await supabase.from('decks').insert([row]).select();
      // Fallback en cascada: quitamos las columnas que puedan faltar por
      // migraciones no aplicadas, de la más nueva a la más vieja.
      if (result.error && result.error.code === UNDEFINED_COLUMN) {
        const fallback = { ...row };
        delete fallback.description;
        result = await supabase.from('decks').insert([fallback]).select();
      }
      if (result.error && result.error.code === UNDEFINED_COLUMN) {
        const fallback = { ...row };
        delete fallback.description;
        delete fallback.is_public;
        result = await supabase.from('decks').insert([fallback]).select();
      }
      if (result.error) return { error: result.error };

      setDecks((prev) => [result.data[0], ...prev]);
      return { data: result.data[0] };
    },
    [user],
  );

  const updateWords = useCallback(async (deckId, words) => {
    const { data, error: err } = await supabase
      .from('decks')
      .update({ words })
      .eq('id', deckId)
      .select();
    if (err) return { error: err };

    const updated = data[0];
    setDecks((prev) => {
      const exists = prev.some((d) => d.id === deckId);
      return exists
        ? prev.map((d) => (d.id === deckId ? updated : d))
        : [updated, ...prev];
    });
    return { data: updated };
  }, []);

  const addWord = useCallback(
    async (deckId, key, value) => {
      const current = decksRef.current.find((d) => d.id === deckId);
      if (!current) return { error: new Error('El mazo ya no existe.') };
      return updateWords(deckId, { ...current.words, [key]: value });
    },
    [updateWords],
  );

  const deleteWord = useCallback(
    async (deckId, key) => {
      const current = decksRef.current.find((d) => d.id === deckId);
      if (!current) return { error: new Error('El mazo ya no existe.') };
      const next = { ...current.words };
      delete next[key];
      return updateWords(deckId, next);
    },
    [updateWords],
  );

  const renameDeck = useCallback(async (deckId, name) => {
    const { data, error: err } = await supabase
      .from('decks')
      .update({ name })
      .eq('id', deckId)
      .select();
    if (err) return { error: err };
    const updated = data[0];
    setDecks((prev) => prev.map((d) => (d.id === deckId ? updated : d)));
    return { data: updated };
  }, []);

  /** Descripción corta del mazo (RF1). Cadena vacía = sin descripción. */
  const setDescription = useCallback(async (deckId, description) => {
    const { data, error: err } = await supabase
      .from('decks')
      .update({ description: description.trim() })
      .eq('id', deckId)
      .select();
    if (err) {
      // Sin la migración 0007 la columna no existe: avisamos sin romper la app.
      console.warn('Kathe: no se pudo guardar la descripción del mazo.', err.message);
      return { error: err };
    }
    const updated = data[0];
    setDecks((prev) => prev.map((d) => (d.id === deckId ? updated : d)));
    return { data: updated };
  }, []);

  const setStudyOrder = useCallback(async (deckId, studyOrder) => {
    const { data, error: err } = await supabase
      .from('decks')
      .update({ study_order: studyOrder })
      .eq('id', deckId)
      .select();
    if (err) return { error: err };
    const updated = data[0];
    setDecks((prev) => prev.map((d) => (d.id === deckId ? updated : d)));
    return { data: updated };
  }, []);

  const setPublic = useCallback(async (deckId, isPublic) => {
    const { data, error: err } = await supabase
      .from('decks')
      .update({ is_public: isPublic })
      .eq('id', deckId)
      .select();
    if (err) {
      // Sin la migración 0003 esto falla; avisamos sin romper la app.
      console.warn('Kathe: no se pudo cambiar la visibilidad del mazo.', err.message);
      return { error: err };
    }
    const updated = data[0];
    setDecks((prev) => prev.map((d) => (d.id === deckId ? updated : d)));
    return { data: updated };
  }, []);

  const deleteDeck = useCallback(async (deckId) => {
    const { error: err } = await supabase.from('decks').delete().eq('id', deckId);
    if (err) return { error: err };
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    return {};
  }, []);

  const deleteAllDecks = useCallback(async () => {
    if (!user) return { error: new Error('No hay sesión activa.') };
    const { error: err } = await supabase.from('decks').delete().eq('user_id', user.id);
    if (err) return { error: err };
    setDecks([]);
    return {};
  }, [user]);

  // ───────── Lecturas puntuales ─────────

  /** Busca en la lista ya cargada (lo normal al navegar). */
  const getDeck = useCallback(
    (deckId) => decksRef.current.find((d) => d.id === deckId) ?? null,
    [],
  );

  /**
   * Para deep links: si el mazo no está en la lista local (recarga de página o
   * mazo público de otra persona) lo pedimos por id. RLS se encarga de que solo
   * lleguen los propios y los públicos.
   */
  const ensureDeck = useCallback(async (deckId) => {
    const local = decksRef.current.find((d) => d.id === deckId);
    if (local) return local;

    const { data, error: err } = await supabase
      .from('decks')
      .select('*')
      .eq('id', deckId)
      .maybeSingle();
    if (err) {
      console.warn('Kathe: no se pudo abrir el mazo.', err.message);
      return null;
    }
    return data ?? null;
  }, []);

  /** Mazos públicos de otra persona (para su perfil). */
  const fetchPublicDecks = useCallback(async (userId) => {
    const { data, error: err } = await supabase
      .from('decks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    if (err) {
      console.warn('Kathe: no se pudieron cargar los mazos públicos.', err.message);
      return [];
    }
    return data || [];
  }, []);

  return (
    <DecksContext.Provider
      value={{
        decks,
        loading,
        error,
        refresh,
        createDeck,
        renameDeck,
        setDescription,
        deleteDeck,
        deleteAllDecks,
        setStudyOrder,
        setPublic,
        addWord,
        deleteWord,
        updateWords,
        getDeck,
        ensureDeck,
        fetchPublicDecks,
      }}
    >
      {children}
    </DecksContext.Provider>
  );
}
