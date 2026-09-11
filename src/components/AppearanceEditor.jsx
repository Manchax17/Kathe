import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import {
  ACCENTS,
  ACCENT_KEYS,
  RADII,
  RADIUS_KEYS,
  SCALES,
  SCALE_KEYS,
  isDefaultAppearance,
} from '../utils/appearance';

const LABEL = 'text-[10px] uppercase tracking-[0.2em] font-bold text-ink-muted';

function Segmented({ label, value, keys, options, disabled, onChange }) {
  return (
    <div>
      <p className={`${LABEL} mb-2`}>{label}</p>
      <div className="flex gap-1 p-1 bg-app border border-rule rounded-2xl">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-60 ${
              value === key
                ? 'bg-accent-surface text-accent-ink'
                : 'text-ink-soft hover:bg-surface'
            }`}
          >
            {options[key].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Editor de apariencia (RF5). Cada cambio se aplica al instante en toda la app
 * (porque son variables CSS) y se guarda en el perfil para que viaje entre
 * dispositivos.
 */
export default function AppearanceEditor() {
  const { appearance, setAppearance, resetAppearance } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    const { error: err } = await fn();
    setBusy(false);
    setError(err ? err.message : '');
  };

  return (
    <div className="space-y-6">
      <div>
        <p className={`${LABEL} mb-2`}>Color de acento</p>
        <div className="flex flex-wrap gap-2">
          {ACCENT_KEYS.map((key) => {
            const accent = ACCENTS[key];
            const active = appearance.accent === key;
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => run(() => setAppearance({ accent: key }))}
                title={accent.label}
                aria-label={`Acento ${accent.label}`}
                aria-pressed={active}
                className="w-10 h-10 rounded-full border-2 transition-all disabled:opacity-60"
                style={{
                  backgroundColor: accent.swatch,
                  borderColor: active ? 'var(--accent-ink)' : 'var(--rule)',
                  transform: active ? 'scale(1.08)' : undefined,
                }}
              />
            );
          })}
        </div>
      </div>

      <Segmented
        label="Tamaño del texto"
        value={appearance.scale}
        keys={SCALE_KEYS}
        options={SCALES}
        disabled={busy}
        onChange={(scale) => run(() => setAppearance({ scale }))}
      />

      <Segmented
        label="Esquinas"
        value={appearance.radius}
        keys={RADIUS_KEYS}
        options={RADII}
        disabled={busy}
        onChange={(radius) => run(() => setAppearance({ radius }))}
      />

      <div>
        <p className={`${LABEL} mb-2`}>Textura</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => setAppearance({ grain: !appearance.grain }))}
          aria-pressed={appearance.grain}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-rule rounded-2xl transition-all hover:bg-app disabled:opacity-60"
        >
          <span className="text-sm font-medium text-ink-soft">Textura de papel</span>
          <span
            className={`text-xs uppercase tracking-[0.2em] font-bold ${
              appearance.grain ? 'text-accent' : 'text-ink-muted'
            }`}
          >
            {appearance.grain ? 'Activada' : 'Desactivada'}
          </span>
        </button>
      </div>

      {/* Muestra acento, radio y escala juntos: es la mejor forma de entender
          qué está cambiando cada opción. */}
      <div className="p-5 rounded-3xl border border-rule bg-surface">
        <p className="font-display text-lg text-ink">Así se ve</p>
        <p className="text-sm text-ink-muted mt-1">
          El acento tiñe botones, enlaces y selecciones en toda la app.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-accent text-sm font-bold shadow-paper"
            style={{ color: 'var(--surface)' }}
          >
            Botón
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium text-accent-ink bg-accent-surface"
          >
            Secundario
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-surface px-4 py-3 rounded-2xl border border-rule">
          No se pudo guardar: {error}
        </p>
      )}

      {!isDefaultAppearance(appearance) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(resetAppearance)}
          className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted hover:text-danger transition-all disabled:opacity-60"
        >
          Restablecer apariencia
        </button>
      )}
    </div>
  );
}
