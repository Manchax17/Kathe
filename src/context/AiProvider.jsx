import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { AiContext } from './aiContext';
import { DEFAULT_AI_PROVIDER, isAiProvider } from '../utils/aiProviders';

// Postgres: 42P01 = undefined_table. Sin la migración 0008 las tablas no
// existen, así que la app tiene que seguir andando igual (con la key del
// servidor como única opción) en vez de romperse en Ajustes.
const UNDEFINED_TABLE = '42P01';

/**
 * Estado de la IA del usuario (RF6).
 *
 * El detalle que gobierna todo este archivo: **la key no se puede leer de
 * vuelta**. La tabla `user_ai_keys` no tiene política de SELECT a propósito
 * (ver migración 0008: la de `profiles` es `qual: true`, así que guardar la key
 * ahí la expondría a todos los usuarios logueados). Entonces el cliente solo
 * puede saber *si* hay una key configurada, nunca cuál es.
 *
 * Por eso acá no hay `apiKey` en el estado: sería mentir. Hay `hasKey`, que es
 * lo que la UI necesita para decir "configurada · cambiar" o "sin configurar".
 */
export function AiProvider({ children }) {
  const { user } = useAuth();
  const [hasKey, setHasKey] = useState(false);
  const [provider, setProvider] = useState(DEFAULT_AI_PROVIDER);
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(true);

  const uid = user?.id ?? null;

  // ¿Hay key guardada? Solo se puede preguntar por la existencia, así que se
  // pide únicamente el `user_id` (y los metadatos, que no son secretos).
  //
  // Ojo con el error: con RLS activo y sin política de SELECT, un `select` no
  // devuelve un error, devuelve **cero filas**. Así que "no hay filas" no
  // distingue "no configuró nada" de "no tengo permiso para verlo" — son la
  // misma cosa desde el cliente, y da igual: en ambos casos no hay key propia.
  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!uid) {
        if (active) {
          setHasKey(false);
          setProvider(DEFAULT_AI_PROVIDER);
          setModel('');
          setBaseUrl('');
          setAvailable(true);
          setLoading(false);
        }
        return;
      }
      if (active) setLoading(true);

      const { data, error: err } = await supabase
        .from('user_ai_keys')
        .select('provider, model, base_url')
        .eq('user_id', uid)
        .maybeSingle();

      if (!active) return;
      setLoading(false);

      if (err) {
        // Sin la migración 0008 el mensaje habla de tabla inexistente.
        if (err.code === UNDEFINED_TABLE || /does not exist/i.test(err.message)) {
          setAvailable(false);
          setHasKey(false);
          return;
        }
        console.warn('Kathe: no se pudo consultar la config de IA.', err.message);
        return;
      }

      setAvailable(true);
      if (data) {
        setHasKey(true);
        setProvider(isAiProvider(data.provider) ? data.provider : DEFAULT_AI_PROVIDER);
        setModel(data.model || '');
        setBaseUrl(data.base_url || '');
      } else {
        setHasKey(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [uid]);

  /**
   * Guarda (o reemplaza) la key. No se puede leer de vuelta, así que la UI
   * nunca la muestra: si el usuario quiere cambiarla, escribe otra y esto la
   * sobrescribe.
   *
   * El `upsert` cubre los dos casos —primera vez y cambio— con una sola
   * llamada, porque `user_id` es la clave primaria.
   */
  const saveKey = useCallback(
    async ({ apiKey, provider: nextProvider, model: nextModel, baseUrl: nextBaseUrl }) => {
      if (!user) return { error: new Error('No hay sesión activa.') };
      if (!available) {
        return {
          error: new Error(
            'Falta aplicar la migración 0008 en Supabase para poder guardar tu propia API key.',
          ),
        };
      }

      const trimmedKey = (apiKey || '').trim();
      if (trimmedKey.length < 8) {
        return { error: new Error('La API key parece demasiado corta.') };
      }

      const chosen = isAiProvider(nextProvider) ? nextProvider : DEFAULT_AI_PROVIDER;
      const trimmedBaseUrl = (nextBaseUrl || '').trim();

      if (chosen === 'custom' && !trimmedBaseUrl) {
        return { error: new Error('Indicá la URL base del servicio.') };
      }

      const row = {
        user_id: user.id,
        provider: chosen,
        api_key: trimmedKey,
        model: (nextModel || '').trim() || null,
        base_url: trimmedBaseUrl || null,
      };

      const { error: err } = await supabase
        .from('user_ai_keys')
        .upsert(row, { onConflict: 'user_id' });

      if (err) {
        const message = /check constraint/i.test(err.message)
          ? 'La configuración no es válida para ese proveedor. Revisá la URL base.'
          : err.message;
        return { error: new Error(message) };
      }

      setHasKey(true);
      setProvider(chosen);
      setModel(row.model || '');
      setBaseUrl(row.base_url || '');
      return { data: true };
    },
    [user, available],
  );

  /** Borra la key propia: el usuario vuelve a usar la del servidor. */
  const clearKey = useCallback(async () => {
    if (!user) return { error: new Error('No hay sesión activa.') };

    const { error: err } = await supabase.from('user_ai_keys').delete().eq('user_id', user.id);
    if (err) return { error: err };

    setHasKey(false);
    setModel('');
    setBaseUrl('');
    setProvider(DEFAULT_AI_PROVIDER);
    return { data: true };
  }, [user]);

  return (
    <AiContext.Provider
      value={{
        hasKey,
        provider,
        model,
        baseUrl,
        loading,
        // `available` en false = la migración 0008 no está aplicada. La UI
        // esconde la sección en vez de ofrecer algo que va a fallar.
        available,
        saveKey,
        clearKey,
      }}
    >
      {children}
    </AiContext.Provider>
  );
}
