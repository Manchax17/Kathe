import { useState } from 'react';
import { useAi } from '../hooks/useAi';
import {
  AI_PROVIDERS,
  MODEL_SUGGESTIONS,
  providerDefaults,
} from '../utils/aiProviders';

/**
 * Configuración de IA del usuario (RF6).
 *
 * La restricción que da forma a toda esta UI: **la key no se puede leer de
 * vuelta**. La tabla no tiene política de SELECT (ver migración 0008), así que
 * acá no hay forma de mostrar la key actual. Por eso el formulario siempre
 * arranca vacío y lo único que se muestra es *si* hay una configurada.
 *
 * Eso obliga a un detalle de redacción: el botón dice "Guardar" o "Reemplazar",
 * y en ningún lado se insinúa que la key se pueda consultar después.
 */
export default function AiSettings() {
  const { hasKey, provider, model, baseUrl, loading, available, saveKey, clearKey } = useAi();

  const [editing, setEditing] = useState(false);
  const [draftProvider, setDraftProvider] = useState(provider);
  const [draftModel, setDraftModel] = useState(model);
  const [draftBaseUrl, setDraftBaseUrl] = useState(baseUrl);
  const [draftKey, setDraftKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const meta = AI_PROVIDERS[draftProvider] ?? AI_PROVIDERS.gemini;
  const suggestions = MODEL_SUGGESTIONS[draftProvider] ?? [];

  const openEditor = () => {
    setDraftProvider(provider);
    setDraftModel(model);
    setDraftBaseUrl(baseUrl);
    setDraftKey('');
    setError('');
    setOk('');
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError('');
    setOk('');
  };

  const handleProviderChange = (key) => {
    setDraftProvider(key);
    // Al cambiar de proveedor se traen sus valores por defecto, para no dejar
    // el formulario apuntando al servicio anterior.
    const defaults = providerDefaults(key);
    setDraftBaseUrl(defaults.baseUrl || '');
    setDraftModel(defaults.model || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setOk('');
    setBusy(true);

    const { error: err } = await saveKey({
      apiKey: draftKey,
      provider: draftProvider,
      model: draftModel,
      baseUrl: draftBaseUrl,
    });

    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }

    setDraftKey('');
    setEditing(false);
    setOk('Listo. Tus generaciones ahora usan tu propia API key.');
  };

  const handleClear = async () => {
    const confirmed = window.confirm(
      '¿Borrar tu API key? Volverás a usar la de Kathe, con un límite de 20 generaciones por hora.',
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    setOk('');
    const { error: err } = await clearKey();
    setBusy(false);

    if (err) {
      setError(err.message);
      return;
    }
    setOk('API key eliminada.');
  };

  if (!available) {
    return (
      <p className="text-sm text-ink-soft bg-app rounded-2xl p-3 border border-rule">
        Esta opción necesita la migración <code>0008</code> aplicada en Supabase.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-ink-muted bg-app rounded-2xl p-3 border border-rule">
        Cargando…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-app rounded-2xl p-4 border border-rule">
        {hasKey ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
              <p className="text-sm font-bold text-ink">
                {AI_PROVIDERS[provider]?.label ?? provider}
              </p>
            </div>
            <p className="text-xs text-ink-muted">
              {model ? `Modelo: ${model}` : 'Usando el modelo por defecto del proveedor'}
            </p>
            <p className="text-xs text-ink-muted mt-1">
              Tus generaciones usan tu key, sin límite de Kathe.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={openEditor}
                disabled={busy}
                className="flex-1 bg-accent py-2 rounded-xl font-bold text-sm disabled:opacity-60"
                style={{ color: 'var(--on-accent)' }}
              >
                Reemplazar
              </button>
              <button
                onClick={handleClear}
                disabled={busy}
                className="flex-1 bg-danger-surface text-danger py-2 rounded-xl font-bold text-sm disabled:opacity-60"
              >
                Quitar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink mb-1">Usando la API key de Kathe</p>
            <p className="text-xs text-ink-muted">
              Hasta 20 generaciones por hora. Cargá tu propia key para no tener límite.
            </p>
            {!editing && (
              <button
                onClick={openEditor}
                className="mt-3 w-full bg-accent py-2 rounded-xl font-bold text-sm"
                style={{ color: 'var(--on-accent)' }}
              >
                Cargar mi API key
              </button>
            )}
          </>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSubmit} className="bg-app rounded-2xl p-4 border border-rule space-y-3">
          <div>
            <label
              htmlFor="ai-provider"
              className="block text-xs text-ink-muted mb-1 font-bold"
            >
              Proveedor
            </label>
            <select
              id="ai-provider"
              value={draftProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full bg-surface border border-rule rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
              style={{ color: 'var(--ink)' }}
            >
              {Object.entries(AI_PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.label}
                </option>
              ))}
            </select>
            {meta.note && <p className="text-xs text-ink-muted mt-1">{meta.note}</p>}
          </div>

          {meta.needsBaseUrl && (
            <div>
              <label htmlFor="ai-baseurl" className="block text-xs text-ink-muted mb-1 font-bold">
                URL base
              </label>
              <input
                id="ai-baseurl"
                type="url"
                value={draftBaseUrl}
                onChange={(e) => setDraftBaseUrl(e.target.value)}
                placeholder="https://api.ejemplo.com/v1"
                className="w-full bg-surface border border-rule rounded-xl px-3 py-2 text-sm outline-none focus:border-accent font-mono"
                style={{ color: 'var(--ink)' }}
              />
            </div>
          )}

          <div>
            <label htmlFor="ai-model" className="block text-xs text-ink-muted mb-1 font-bold">
              Modelo
            </label>
            <input
              id="ai-model"
              type="text"
              value={draftModel}
              onChange={(e) => setDraftModel(e.target.value)}
              placeholder={meta.defaultModel || 'nombre-del-modelo'}
              list="ai-model-suggestions"
              className="w-full bg-surface border border-rule rounded-xl px-3 py-2 text-sm outline-none focus:border-accent font-mono"
              style={{ color: 'var(--ink)' }}
            />
            <datalist id="ai-model-suggestions">
              {suggestions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {suggestions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDraftModel(m)}
                    className={`text-[10px] px-2 py-1 rounded-lg border border-rule font-mono transition-all ${
                      draftModel === m ? 'bg-accent-surface text-accent-ink' : 'bg-surface text-ink-muted'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="ai-key" className="block text-xs text-ink-muted mb-1 font-bold">
              API key
            </label>
            <input
              id="ai-key"
              type="password"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder={hasKey ? 'Pegá la nueva key' : meta.keyHint || 'Pegá tu API key'}
              autoComplete="off"
              className="w-full bg-surface border border-rule rounded-xl px-3 py-2 text-sm outline-none focus:border-accent font-mono"
              style={{ color: 'var(--ink)' }}
            />
            <p className="text-xs text-ink-muted mt-1">
              Se guarda en tu cuenta y no se puede volver a leer desde acá: si la perdés, cargás otra.
              {meta.keyUrl && (
                <>
                  {' '}
                  <a
                    href={meta.keyUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="underline underline-offset-2 hover:text-ink"
                  >
                    Conseguir una key
                  </a>
                  .
                </>
              )}
            </p>
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger-surface rounded-xl px-3 py-2 border border-rule">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || draftKey.trim().length < 8}
              className="flex-1 bg-accent py-2 rounded-xl font-bold text-sm disabled:opacity-60"
              style={{ color: 'var(--on-accent)' }}
            >
              {busy ? 'Guardando…' : hasKey ? 'Reemplazar key' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="flex-1 bg-surface py-2 rounded-xl font-bold text-sm text-ink-soft disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-ink-muted">
            Sin verificar: Kathe comprueba que la key funcione cuando generás la primera vez.
          </p>
        </form>
      )}

      {ok && (
        <p className="text-sm text-accent-ink bg-accent-surface rounded-xl px-3 py-2 border border-rule">
          {ok}
        </p>
      )}
    </div>
  );
}
