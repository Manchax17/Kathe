import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { useDecks } from './useDecks';

/**
 * Resuelve el mazo de la ruta `/deck/:deckId`.
 *
 * Si el mazo ya está en la lista del contexto (lo normal al navegar desde la
 * grilla) se usa directo, sin red. Si no —recarga de página, deep link, o mazo
 * público de otra persona— se pide por id con `ensureDeck`, y RLS se encarga de
 * que solo lleguen los propios y los públicos.
 *
 * El resultado se guarda junto al `deckId` que lo produjo en vez de limpiarse con
 * un efecto aparte: así, si la ruta cambia, el dato viejo simplemente deja de
 * coincidir y la página vuelve a mostrar la carga.
 */
export function useRouteDeck() {
  const { deckId } = useParams();
  const { getDeck, ensureDeck } = useDecks();

  const local = getDeck(deckId);
  const hasLocal = Boolean(local);
  const [loaded, setLoaded] = useState({ deckId: null, deck: undefined });

  useEffect(() => {
    if (hasLocal) return;

    let active = true;
    ensureDeck(deckId).then((deck) => {
      if (active) setLoaded({ deckId, deck });
    });

    return () => {
      active = false;
    };
  }, [deckId, hasLocal, ensureDeck]);

  const resolved = hasLocal || loaded.deckId === deckId;
  const deck = hasLocal ? local : loaded.deckId === deckId ? loaded.deck : undefined;

  return {
    deck,
    loading: !resolved,
    missing: resolved && !deck,
  };
}
