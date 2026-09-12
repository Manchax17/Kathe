import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

/**
 * Genera flashcards a partir de texto con la IA (RF6/RF7).
 *
 * El proveedor real lo decide la Edge Function: si el usuario cargó su propia
 * API key la usa, y si no cae a la del servidor con rate limit. Desde acá solo
 * mandamos el texto.
 *
 * Devuelve `{ cards, usedOwnKey }`. `usedOwnKey` importa para la UI: si la
 * generación salió con la key del usuario, conviene decirlo, porque si el
 * resultado es malo el problema está en su key o su modelo y no en Kathe.
 */
export async function extractCardsFromText(text, { count = 30 } = {}) {
  const { data, error } = await supabase.functions.invoke('extract-cards', {
    body: { text, count },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let serverMessage = 'La función de IA devolvió un error.';
      let retryAfterMinutes = null;
      try {
        const payload = await error.json();
        serverMessage = payload?.error || serverMessage;
        retryAfterMinutes = payload?.retryAfterMinutes ?? null;
      } catch {
        /* body no-JSON */
      }
      const err = new Error(serverMessage);
      // 429 = rate limit. Se propaga como dato y no como texto para que la UI
      // pueda decidir si ofrece el enlace a Ajustes.
      err.rateLimited = error.context?.status === 429 || retryAfterMinutes !== null;
      err.retryAfterMinutes = retryAfterMinutes;
      throw err;
    }
    if (error instanceof FunctionsFetchError) {
      throw new Error(
        'No se pudo contactar a la función de IA. Verificá tu conexión y que `extract-cards` esté deployada.',
      );
    }
    throw new Error(error.message || 'No se pudo contactar al servicio de IA.');
  }

  if (!data || !Array.isArray(data.cards)) {
    throw new Error('Respuesta inesperada del servicio de IA.');
  }

  return { cards: data.cards, usedOwnKey: Boolean(data.usedOwnKey) };
}
