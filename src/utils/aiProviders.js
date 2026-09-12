/**
 * Catálogo de proveedores de IA (RF7).
 *
 * La clave es no tratar cada proveedor como un caso aparte. Casi todos los de
 * la lista del RF7 (DeepSeek, Qwen, OpenRouter, Groq, NIM, y hasta ChatGPT)
 * exponen la misma API que OpenAI: un `POST /chat/completions` con un array
 * `messages`. Eso significa que **un solo adaptador** los cubre a todos
 * cambiando nada más que `baseUrl` y `model`.
 *
 * Quedan dos familias fuera de ese molde:
 *
 *   - Gemini, que usa `contents` + `system_instruction` y pasa la key por query
 *     string en vez de por header.
 *   - Anthropic, que tiene `system` aparte y exige el header `anthropic-version`.
 *
 * Con esas tres familias se cubre la lista entera del requisito. Por eso acá
 * cada proveedor declara a qué *adaptador* pertenece, y el adaptador vive en la
 * Edge Function (que es donde se hace la llamada de red).
 *
 * Este archivo lo consumen tanto el front (para dibujar el selector) como los
 * scripts de Node, así que los imports relativos llevan extensión.
 */

/**
 * Los adaptadores que existen del lado del servidor. Si agregás uno acá, hay
 * que implementarlo en `supabase/functions/extract-cards/providers.ts` y sumarlo
 * a la constraint `user_ai_keys_provider_valid` de la migración 0008. Los tres
 * lados tienen que coincidir o la base rechaza una configuración válida.
 */
export const ADAPTERS = {
  gemini: {
    label: 'Gemini',
    /** La key va en la URL, no en un header. */
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  openai_compatible: {
    label: 'Compatible con OpenAI',
    docsUrl: null,
  },
};

/**
 * Proveedores que el usuario puede elegir en Ajustes.
 *
 * `defaultModel` es solo un punto de partida razonable, no una promesa: los
 * catálogos de modelos cambian seguido y varios de estos son versiones que el
 * usuario puede querer ajustar. Por eso el modelo es editable.
 */
export const AI_PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    adapter: 'gemini',
    defaultModel: 'gemini-2.5-flash',
    /** Sin baseUrl: la del adaptador es fija. */
    needsBaseUrl: false,
    keyHint: 'Empezá con «AIza»',
    keyUrl: 'https://aistudio.google.com/apikey',
    note: 'Tiene capa gratuita generosa. La forma más rápida de probar.',
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    adapter: 'openai_compatible',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    needsBaseUrl: false,
    keyHint: 'Empezá con «sk-»',
    keyUrl: 'https://platform.openai.com/api-keys',
    note: 'De pago, sin capa gratuita.',
  },
  deepseek: {
    label: 'DeepSeek',
    adapter: 'openai_compatible',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    needsBaseUrl: false,
    keyHint: 'Empezá con «sk-»',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    note: 'Muy barato y rinde bien en español.',
  },
  qwen: {
    label: 'Qwen (Alibaba)',
    adapter: 'openai_compatible',
    defaultModel: 'qwen-plus',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    needsBaseUrl: false,
    keyHint: 'Empezá con «sk-»',
    keyUrl: 'https://dashscope.console.aliyun.com/apiKey',
    note: 'Usá el endpoint internacional si no estás en China.',
  },
  openrouter: {
    label: 'OpenRouter',
    adapter: 'openai_compatible',
    defaultModel: 'deepseek/deepseek-chat',
    baseUrl: 'https://openrouter.ai/api/v1',
    needsBaseUrl: false,
    keyHint: 'Empezá con «sk-or-»',
    keyUrl: 'https://openrouter.ai/keys',
    note: 'Con una sola key da acceso a muchos modelos; útil para comparar.',
  },
  custom: {
    label: 'Otro (compatible con OpenAI)',
    adapter: 'openai_compatible',
    defaultModel: '',
    baseUrl: '',
    /** Este es el único que exige que el usuario escriba la URL. */
    needsBaseUrl: true,
    keyHint: '',
    keyUrl: null,
    note: 'Para cualquier servicio con API compatible: Groq, NIM, un servidor propio…',
  },
};

export const AI_PROVIDER_KEYS = Object.keys(AI_PROVIDERS);

export const DEFAULT_AI_PROVIDER = 'gemini';

export function isAiProvider(key) {
  return Object.hasOwn(AI_PROVIDERS, key);
}

/**
 * Devuelve la configuración a guardar para un proveedor elegido, ya con la
 * `baseUrl` del catálogo aplicada. Se usa al cambiar de proveedor en Ajustes
 * para no dejar el formulario a medio llenar.
 */
export function providerDefaults(key) {
  const provider = AI_PROVIDERS[key] ?? AI_PROVIDERS[DEFAULT_AI_PROVIDER];
  return {
    provider: isAiProvider(key) ? key : DEFAULT_AI_PROVIDER,
    baseUrl: provider.baseUrl,
    model: provider.defaultModel,
  };
}

/**
 * Los modelos que se ofrecen como atajo en el formulario. No es una lista
 * cerrada: el campo es de texto libre porque los catálogos cambian más rápido
 * de lo que este archivo se va a actualizar.
 */
export const MODEL_SUGGESTIONS = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
  qwen: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
  openrouter: [
    'deepseek/deepseek-chat',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-2.0-flash-001',
  ],
  custom: [],
};
