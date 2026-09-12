// supabase/functions/extract-cards/index.ts
// Recibe texto de un PDF y devuelve flashcards generadas con IA.
//
// RF6: el usuario puede traer su propia API key (se guarda en `user_ai_keys`,
//      que no tiene política de SELECT — ver migración 0008).
// RF7: multi-proveedor, resuelto con adaptadores (ver providers.ts).
//
// Estrategia de key, en orden:
//   1. Si el usuario configuró una → se usa la suya y NO se le cobra cuota a la
//      del servidor, porque no la está gastando.
//   2. Si no configuró ninguna → se usa la del servidor (GEMINI_API_KEY), con
//      un rate limit por usuario para que nadie agote la cuota ajena.
//
// Rate limit: sin pg_cron en el plan gratuito, la RPC `consume_ai_quota` cuenta
// e incrementa en una sola transacción y aprovecha cada llamada para limpiar lo
// viejo. Cuando el usuario trae su key, el rate limit no aplica: el gasto es
// suyo y merece usarlo sin tope nuestro.
//
// Setup:
//   supabase secrets set GEMINI_API_KEY=tu_key
//   supabase functions deploy extract-cards

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callProvider, type ProviderConfig } from './providers.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_CHARS = 90000;
const DEFAULT_COUNT = 30;

/** Cuántas generaciones puede hacer un usuario con la key del servidor. */
const FREE_CALLS_PER_HOUR = 20;

const SYSTEM_PROMPT = `Eres un asistente que crea flashcards de estudio a partir de texto académico.
Recibes el contenido (parcial o completo) de un documento y debes extraer los conceptos, términos,
definiciones y vocabulario MÁS IMPORTANTES para formar tarjetas de repaso.

Reglas:
- Cada tarjeta tiene "question" y "answer".
- La pregunta debe ser clara y autocontenida (no referencias como "en el documento...").
- La respuesta debe ser concisa pero completa: 1-3 frases máximo.
- Prioriza: definiciones, conceptos clave, relaciones causa-efecto, terminología técnica.
- NO inventes información que no esté en el texto.
- Varía el tipo de preguntas: definiciones directas, "¿qué es X?", "¿por qué ocurre Y?".
- Devuelve entre 10 y {MAX_CARDS} tarjetas según la riqueza del texto.

Responde SIEMPRE con un objeto JSON con esta forma exacta:
{ "cards": [ { "question": "...", "answer": "..." } ] }`;

function buildUserPrompt(text: string, count: number): string {
  return `Genera exactamente hasta ${count} flashcards a partir del siguiente texto del documento:

"""
${text}
"""

Devuelve SOLO el JSON con el schema indicado.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json({ ok: true }, 200, CORS_HEADERS);
  }

  try {
    // ── 1. Autenticación ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Falta token de autorización' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return json({ error: 'No autorizado' }, 401);

    // ── 2. Body ──
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const count = clamp(Number(body?.count) || DEFAULT_COUNT, 5, 60);

    if (!text || text.length < 50) {
      return json({ error: 'El texto es demasiado corto para generar flashcards.' }, 400);
    }

    const safeText = text.slice(0, MAX_CHARS);

    // ── 3. ¿Tiene el usuario su propia key? ──
    // Se consulta con el cliente de service_role porque la tabla no tiene
    // política de SELECT: con el cliente del usuario esta query devolvería
    // cero filas siempre.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: userKey, error: keyErr } = await admin
      .from('user_ai_keys')
      .select('provider, api_key, base_url, model')
      .eq('user_id', user.id)
      .maybeSingle();

    // Sin la migración 0008 la tabla no existe. No es fatal: se sigue con la
    // key del servidor, que es el comportamiento anterior.
    const keysTableMissing =
      !!keyErr && (keyErr.code === '42P01' || /does not exist/i.test(keyErr.message));
    if (keyErr && !keysTableMissing) {
      console.error('Error consultando user_ai_keys:', keyErr.message);
    }

    // ── 4. Elegir credencial y adaptador ──
    let config: ProviderConfig;
    let usedOwnKey = false;

    if (userKey?.api_key) {
      usedOwnKey = true;
      config = {
        adapter: userKey.provider === 'gemini' ? 'gemini' : 'openai_compatible',
        apiKey: userKey.api_key,
        baseUrl: userKey.base_url,
        model: userKey.model,
        systemPrompt: SYSTEM_PROMPT.replace('{MAX_CARDS}', String(count)),
        userPrompt: buildUserPrompt(safeText, count),
      };
    } else {
      const serverKey = Deno.env.get('GEMINI_API_KEY');
      if (!serverKey) {
        return json(
          {
            error:
              'No hay ninguna API key disponible. Configurá la tuya en Ajustes → Inteligencia artificial.',
          },
          500,
        );
      }

      // Rate limit SOLO cuando se gasta la key del servidor.
      if (!keysTableMissing) {
        const { data: quota, error: quotaErr } = await admin.rpc('consume_ai_quota', {
          p_user_id: user.id,
          p_limit: FREE_CALLS_PER_HOUR,
          p_window: '1 hour',
        });

        if (quotaErr) {
          // Si el rate limit falla, dejamos pasar: es preferible una cuota en
          // riesgo que romperle la función a todo el mundo.
          console.error('Rate limit no disponible:', quotaErr.message);
        } else {
          const row = Array.isArray(quota) ? quota[0] : quota;
          if (row && row.allowed === false) {
            const minutes = Math.max(
              1,
              Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 60000),
            );
            return json(
              {
                error:
                  `Llegaste al límite de ${FREE_CALLS_PER_HOUR} generaciones por hora. ` +
                  `Se renueva en ~${minutes} min. Para no tener tope, cargá tu propia API key ` +
                  `en Ajustes → Inteligencia artificial.`,
                retryAfterMinutes: minutes,
              },
              429,
            );
          }
        }
      }

      config = {
        adapter: 'gemini',
        apiKey: serverKey,
        baseUrl: null,
        model: Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash',
        systemPrompt: SYSTEM_PROMPT.replace('{MAX_CARDS}', String(count)),
        userPrompt: buildUserPrompt(safeText, count),
      };
    }

    // ── 5. Llamar al proveedor ──
    const result = await callProvider(config);

    if (!result.ok) {
      console.error('Error del proveedor:', result.status, result.error);
      const isTransient = result.status === 429 || result.status >= 500;
      const suffix = usedOwnKey
        ? ' Revisá tu API key y el modelo en Ajustes → Inteligencia artificial.'
        : ' Intentá de nuevo en unos segundos.';

      return json(
        {
          error:
            (isTransient
              ? 'Alta demanda en el servicio de IA en este momento.'
              : `Error del modelo de IA (${result.status}).`) + suffix,
          detail: result.error,
        },
        502,
      );
    }

    // ── 6. Parsear y sanear ──
    let cards: Array<{ question: string; answer: string }> = [];
    try {
      cards = parseCards(result.text);
    } catch {
      return json({ error: 'La IA devolvió una respuesta inesperada. Intentá de nuevo.' }, 502);
    }

    if (cards.length === 0) {
      return json({ error: 'No se pudieron generar flashcards a partir de este texto.' }, 422);
    }

    return json({ cards, usedOwnKey }, 200);
  } catch (err) {
    console.error('extract-cards error:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
});

/**
 * Los modelos a veces envuelven el JSON en un bloque markdown (```json … ```),
 * sobre todo los compatibles con OpenAI cuando se les cae `response_format`.
 * Se limpia antes de parsear, si no la generación se pierde entera.
 */
function parseCards(raw: string): Array<{ question: string; answer: string }> {
  let text = (raw || '').trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Si hay texto alrededor del objeto, recortamos desde la primera llave.
  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }

  const parsed = JSON.parse(text);

  // Algunos modelos devuelven el array pelado en vez de `{ cards: [...] }`.
  const list = Array.isArray(parsed) ? parsed : parsed?.cards;
  if (!Array.isArray(list)) return [];

  return list
    .filter((c) => c && typeof c.question === 'string' && typeof c.answer === 'string')
    .map((c) => ({
      question: c.question.trim().slice(0, 500),
      answer: c.answer.trim().slice(0, 2000),
    }))
    .filter((c) => c.question && c.answer);
}

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, ...extraHeaders, 'Content-Type': 'application/json' },
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
