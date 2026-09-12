// Adaptadores de proveedores de IA (RF7).
//
// La idea central: la lista del RF7 (Claude, Qwen, ChatGPT, Gemini, Hunyuan,
// NIM, OpenRouter, DeepSeek…) parece larguísima, pero casi todos hablan el
// mismo protocolo que OpenAI:
//
//     POST {baseUrl}/chat/completions
//     { model, messages: [{ role, content }] }
//
// Así que no hacen falta ocho integraciones: hace falta **un adaptador** que
// hable ese protocolo, más los pocos que se salen del molde. Hoy están los dos
// que cubren todo lo que se puede probar sin pagar:
//
//   - `openai_compatible` → OpenAI, DeepSeek, Qwen, OpenRouter, Groq, NIM…
//   - `gemini`            → Google, que usa `contents`/`system_instruction` y
//                           pasa la key por query string.
//
// Si mañana se suma Anthropic, se agrega acá y se extiende el CHECK de la
// migración 0008. Nada más cambia.

export interface ProviderConfig {
  adapter: string;
  apiKey: string;
  baseUrl: string | null;
  model: string | null;
  systemPrompt: string;
  userPrompt: string;
}

export interface ProviderResult {
  ok: boolean;
  status: number;
  /** Texto crudo que devolvió el modelo (se espera JSON). */
  text: string;
  /** Mensaje legible para el usuario si algo salió mal. */
  error?: string;
}

/** El JSON que le pedimos a todos los modelos. */
const RESPONSE_SCHEMA = {
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
};

const TIMEOUT_MS = 60_000;

/**
 * Reintenta ante errores transitorios. 429 (cuota) y 5xx son "probá de nuevo";
 * 4xx (key inválida, modelo inexistente) no se arreglan reintentando, así que
 * salen de una.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 3,
): Promise<{ ok: boolean; status: number; body: string }> {
  let lastStatus = 500;
  let lastBody = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      lastStatus = res.status;
      lastBody = await res.text();

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
      await new Promise((r) => setTimeout(r, wait));
    }
  }

  return { ok: false, status: lastStatus, body: lastBody };
}

/** Saca el texto del cuerpo de error para poder mostrarlo. */
function errorDetail(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body);
    const msg =
      parsed?.error?.message ?? parsed?.error?.status ?? parsed?.message ?? parsed?.detail;
    if (typeof msg === 'string' && msg) return msg.slice(0, 220);
  } catch {
    /* body no-JSON */
  }
  const raw = body.slice(0, 220).replace(/\s+/g, ' ');
  return raw || `HTTP ${status}`;
}

// ─────────────────────────── Adaptador: Gemini ───────────────────────────

async function callGemini(cfg: ProviderConfig): Promise<ProviderResult> {
  const model = cfg.model || 'gemini-2.5-flash';
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(cfg.apiKey)}`;

  const payload = {
    system_instruction: { parts: [{ text: cfg.systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: cfg.userPrompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const { ok, status, body } = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!ok) return { ok: false, status, text: '', error: errorDetail(body, status) };

  try {
    const data = JSON.parse(body);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) {
      // Bloqueo por safety o respuesta vacía: el motivo viene en finishReason.
      const reason = data?.candidates?.[0]?.finishReason;
      return {
        ok: false,
        status: 502,
        text: '',
        error:
          reason === 'SAFETY'
            ? 'El modelo rechazó el contenido por sus filtros de seguridad.'
            : 'El modelo devolvió una respuesta vacía.',
      };
    }
    return { ok: true, status, text };
  } catch {
    return { ok: false, status: 502, text: '', error: 'Respuesta ilegible del modelo.' };
  }
}

// ──────────────────── Adaptador: compatible con OpenAI ────────────────────

async function callOpenAiCompatible(cfg: ProviderConfig): Promise<ProviderResult> {
  if (!cfg.baseUrl) {
    return { ok: false, status: 400, text: '', error: 'Falta la URL base del servicio.' };
  }
  if (!cfg.model) {
    return { ok: false, status: 400, text: '', error: 'Falta indicar el modelo.' };
  }

  const base = cfg.baseUrl.replace(/\/+$/, '');
  // Algunos servicios (OpenRouter entre ellos) documentan `{base}/chat/completions`,
  // pero si el usuario pegó la URL completa no hay que duplicar el sufijo.
  const url = /\/chat\/completions$/.test(base) ? base : `${base}/chat/completions`;

  const payload = {
    model: cfg.model,
    messages: [
      { role: 'system', content: cfg.systemPrompt },
      { role: 'user', content: cfg.userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  };

  const { ok, status, body } = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!ok) {
    // `response_format` no lo soportan todos los servicios compatibles. Si el
    // error lo menciona, reintentamos sin él en vez de rendirnos: el prompt ya
    // pide JSON, así que normalmente alcanza.
    if (status === 400 && /response_format/i.test(body)) {
      const retry = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
        },
        body: JSON.stringify((({ response_format, ...rest }) => rest)(payload)),
      });
      if (retry.ok) {
        return { ok: true, status: retry.status, text: extractOpenAiText(retry.body) };
      }
      return {
        ok: false,
        status: retry.status,
        text: '',
        error: errorDetail(retry.body, retry.status),
      };
    }
    return { ok: false, status, text: '', error: errorDetail(body, status) };
  }

  return { ok: true, status, text: extractOpenAiText(body) };
}

function extractOpenAiText(body: string): string {
  try {
    const data = JSON.parse(body);
    return data?.choices?.[0]?.message?.content ?? '';
  } catch {
    return '';
  }
}

// ──────────────────────────── Punto de entrada ────────────────────────────

export async function callProvider(cfg: ProviderConfig): Promise<ProviderResult> {
  switch (cfg.adapter) {
    case 'gemini':
      return callGemini(cfg);
    case 'openai_compatible':
      return callOpenAiCompatible(cfg);
    default:
      return {
        ok: false,
        status: 400,
        text: '',
        error: `Proveedor desconocido: ${cfg.adapter}`,
      };
  }
}
