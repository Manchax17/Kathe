import { FunctionsHttpError, FunctionsFetchError } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

export async function extractCardsFromText(text, { count = 30 } = {}) {
  const { data, error } = await supabase.functions.invoke('extract-cards', {
    body: { text, count },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let serverMessage = 'La función de IA devolvió un error.';
      try {
        const payload = await error.json();
        serverMessage = payload?.error || serverMessage;
      } catch {
        /* body no-JSON */
      }
      throw new Error(serverMessage);
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

  return data.cards;
}
