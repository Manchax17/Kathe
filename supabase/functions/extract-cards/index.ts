// supabase/functions/extract-cards/index.ts
// Recibe texto de un PDF y devuelve flashcards generadas con Gemini.
//
// Setup:
//   supabase secrets set GEMINI_API_KEY=tu_key
//   supabase functions deploy extract-cards

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_CHARS = 90000;
const DEFAULT_COUNT = 30;

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
- Devuelve entre 10 y {MAX_CARDS} tarjetas según la riqueza del texto.`;

function buildUserPrompt(text: string, count: number): string {
  return `Genera exactamente hasta ${count} flashcards a partir del siguiente texto del documento:

"""
${text}
"""

Devuelve SOLO el JSON con el schema indicado.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // 1. Validar JWT del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Falta token de autorización' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return json({ error: 'No autorizado' }, 401);
    }

    // 2. Parsear body
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const count = clamp(Number(body?.count) || DEFAULT_COUNT, 5, 60);

    if (!text || text.length < 50) {
      return json(
        { error: 'El texto es demasiado corto para generar flashcards.' },
        400,
      );
    }

    const safeText = text.slice(0, MAX_CHARS);

    // 3. Llamar a Gemini
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return json(
        { error: 'El servidor no tiene configurada la API key de Gemini (GEMINI_API_KEY).' },
        500,
      );
    }

    const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    const prompt = SYSTEM_PROMPT.replace('{MAX_CARDS}', String(count));

    const { ok, status, body: geminiBody } = await callGeminiWithRetry(model, apiKey, prompt, buildUserPrompt(safeText, count));

    if (!ok) {
      console.error('Gemini error final:', status, geminiBody);
      const detail = geminiBody.slice(0, 220).replace(/\s+/g, ' ');
      return json(
        {
          error: `Error del modelo de IA (${status}). ${
            status === 503 || status === 429
              ? 'Alta demanda en este momento; intentá de nuevo en unos segundos.'
              : detail || 'Intenta de nuevo más tarde.'
          }`,
        },
        502,
      );
    }

    const geminiData = JSON.parse(geminiBody);
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let cards: Array<{ question: string; answer: string }> = [];
    try {
      const parsed = JSON.parse(rawText);
      cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
    } catch (_e) {
      return json(
        { error: 'La IA devolvió una respuesta inesperada. Intenta de nuevo.' },
        502,
      );
    }

    cards = cards
      .filter((c) => c && typeof c.question === 'string' && typeof c.answer === 'string')
      .map((c) => ({
        question: c.question.trim().slice(0, 500),
        answer: c.answer.trim().slice(0, 2000),
      }))
      .filter((c) => c.question && c.answer);

    if (cards.length === 0) {
      return json(
        { error: 'No se pudieron generar flashcards a partir de este texto.' },
        422,
      );
    }

    return json({ cards });
  } catch (err) {
    console.error('extract-cards error:', err);
    return json({ error: 'Error interno del servidor.' }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

async function callGeminiWithRetry(
  model: string,
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          cards: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                question: { type: 'STRING' },
                answer: { type: 'STRING' },
              },
              required: ['question', 'answer'],
            },
          },
        },
        required: ['cards'],
      },
    },
  };

  const maxAttempts = 3;
  let lastStatus = 500;
  let lastBody = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      lastStatus = res.status;
      lastBody = await res.text();
      // Reintentar solo ante errores transitorios (429 / 5xx)
      if (res.ok) return { ok: true, status: res.status, body: lastBody };
      if (res.status !== 429 && res.status < 500) {
        return { ok: false, status: res.status, body: lastBody };
      }
    } catch (e) {
      lastStatus = 0;
      lastBody = String((e as Error)?.message ?? e);
    }

    if (attempt < maxAttempts) {
      const wait = 600 * 2 ** (attempt - 1);
      console.warn(`Gemini reintento ${attempt} tras ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  return { ok: false, status: lastStatus, body: lastBody };
}
