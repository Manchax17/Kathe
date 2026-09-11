import { useMemo, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { BASE_THEMES, BASE_THEME_KEYS } from '../utils/themePresets';
import {
  ACCENTS,
  ACCENT_KEYS,
  BG,
  MAX_CSS,
  RADII,
  RADIUS_KEYS,
  SCALES,
  SCALE_KEYS,
  appearanceToCssVars,
  checkAccentContrast,
  isCustomHex,
  isDefaultAppearance,
  normalizeHex,
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

/** Selector de color libre: muestra el color elegido y acepta hex escrito. */
function CustomColor({ value, disabled, onPick }) {
  const [text, setText] = useState('');
  const preview = isCustomHex(value) ? value : '#b8694a';
  const parsed = normalizeHex(text);

  const commit = () => {
    if (parsed) onPick(parsed);
    setText('');
  };

  return (
    <div className="flex gap-2">
      <label
        className="relative w-12 h-10 rounded-2xl border border-rule overflow-hidden cursor-pointer shrink-0"
        title="Elegir un color"
      >
        <span className="absolute inset-0" style={{ backgroundColor: preview }} />
        <input
          type="color"
          value={preview}
          disabled={disabled}
          onChange={(e) => onPick(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Elegir color personalizado"
        />
      </label>

      <input
        type="text"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder="#1a5fb4"
        spellCheck="false"
        className="flex-1 px-3 py-2 bg-surface border border-rule rounded-2xl text-sm font-mono outline-none focus:border-accent disabled:opacity-60"
        style={{ color: 'var(--ink)' }}
      />

      <button
        type="button"
        disabled={disabled || !parsed}
        onClick={commit}
        className="px-4 rounded-2xl bg-accent text-sm font-bold disabled:opacity-40 transition-all"
        style={{ color: 'var(--on-accent)' }}
      >
        Usar
      </button>
    </div>
  );
}

/**
 * Editor de apariencia (RF5). Cada cambio se aplica al instante en toda la app
 * (porque son variables CSS) y se guarda en el perfil para que viaje entre
 * dispositivos.
 */
export default function AppearanceEditor() {
  const { theme, appearance, setAppearance, setBaseTheme, resetAppearance } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCss, setShowCss] = useState(false);
  const [cssDraft, setCssDraft] = useState(appearance.customCss);

  const custom = isCustomHex(appearance.accent);

  // Aviso de contraste del acento contra el fondo (3:1 es el mínimo de WCAG
  // para elementos de interfaz). No bloquea: solo avisa.
  const contrast = useMemo(
    () => (custom ? checkAccentContrast(appearance.accent, theme, BG[theme]) : { ok: true }),
    [custom, appearance.accent, theme],
  );

  // La vista previa usa la paleta ya resuelta, así se ve igual que en la app.
  const preview = useMemo(() => appearanceToCssVars(appearance, theme), [appearance, theme]);

  const run = async (fn) => {
    setBusy(true);
    const { error: err } = await fn();
    setBusy(false);
    setError(err ? err.message : '');
  };

  const pickAccent = (accent) => run(() => setAppearance({ accent }));

  return (
    <div className="space-y-6">
      {/* ───────── Tema base ───────── */}
      <div>
        <p className={`${LABEL} mb-2`}>Tema</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BASE_THEME_KEYS.map((key) => {
            const item = BASE_THEMES[key];
            const active = appearance.baseTheme === key;
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => run(() => setBaseTheme(key))}
                aria-pressed={active}
                title={item.description}
                className={`text-left p-3 rounded-2xl border transition-all disabled:opacity-60 ${
                  active
                    ? 'border-accent bg-accent-surface'
                    : 'border-rule bg-surface hover:bg-app'
                }`}
              >
                <span className="flex gap-1 mb-2">
                  {item.swatch.map((color) => (
                    <span
                      key={color}
                      className="w-4 h-4 rounded-full border border-rule"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="block text-sm font-bold text-ink">{item.label}</span>
                <span className="block text-[11px] text-ink-muted mt-0.5 leading-snug">
                  {item.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={`${LABEL} mb-2`}>Color de acento</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {ACCENT_KEYS.map((key) => {
            const accent = ACCENTS[key];
            const active = appearance.accent === key;
            // La muestra usa el tono que se va a aplicar de verdad en el modo
            // actual: en oscuro los acentos son más claros, y mostrar el de
            // claro daría una idea equivocada de lo que se está eligiendo.
            const shown = accent[theme].accent;
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => pickAccent(key)}
                title={accent.label}
                aria-label={`Acento ${accent.label}`}
                aria-pressed={active}
                className="w-10 h-10 rounded-full border-2 transition-all disabled:opacity-60"
                style={{
                  backgroundColor: shown,
                  borderColor: active ? 'var(--accent-ink)' : 'var(--rule)',
                  transform: active ? 'scale(1.08)' : undefined,
                }}
              />
            );
          })}

          {/* Muestra el color propio como una opción más del grupo */}
          <span
            aria-hidden="true"
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
            style={{
              borderColor: custom ? 'var(--accent-ink)' : 'var(--rule)',
              borderStyle: custom ? 'solid' : 'dashed',
              backgroundColor: custom ? appearance.accent : 'transparent',
              color: custom ? preview['--on-accent'] : 'var(--ink-muted)',
              transform: custom ? 'scale(1.08)' : undefined,
            }}
          >
            {custom ? '' : '+'}
          </span>
        </div>

        <CustomColor value={appearance.accent} disabled={busy} onPick={pickAccent} />

        {!contrast.ok && (
          <p className="text-xs text-ink-soft bg-app border border-rule rounded-2xl px-3 py-2 mt-2">
            Este color contrasta poco con el fondo ({contrast.ratio}:1). Los botones y enlaces
            se van a leer con dificultad. Podés usarlo igual si es lo que buscás.
          </p>
        )}
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

      {/* ───────── CSS propio ───────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowCss((v) => !v)}
          aria-expanded={showCss}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface border border-rule rounded-2xl transition-all hover:bg-app"
        >
          <span className="text-sm font-medium text-ink-soft">CSS propio</span>
          <span className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted">
            {showCss ? 'Ocultar' : appearance.customCss ? 'Editado' : 'Opcional'}
          </span>
        </button>

        {showCss && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-ink-muted leading-relaxed">
              Escribí tus propias reglas, por ejemplo{' '}
              <code className="font-mono text-ink-soft">width: 100%</code>. Se aplican a toda la
              app con menor prioridad que el diseño base, así que no rompen nada de lo que ya
              funciona.
            </p>
            <textarea
              value={cssDraft}
              onChange={(e) => setCssDraft(e.target.value)}
              rows={5}
              spellCheck="false"
              placeholder={'.tarjeta { width: 100%; }'}
              className="w-full px-3 py-2 bg-surface border border-rule rounded-2xl text-xs font-mono outline-none focus:border-accent custom-scrollbar"
              style={{ color: 'var(--ink)' }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || cssDraft === appearance.customCss}
                onClick={() => run(() => setAppearance({ customCss: cssDraft }))}
                className="px-4 py-2 rounded-2xl bg-accent text-sm font-bold disabled:opacity-40 transition-all"
                style={{ color: 'var(--on-accent)' }}
              >
                Guardar CSS
              </button>
              <button
                type="button"
                disabled={busy || !cssDraft}
                onClick={() => {
                  setCssDraft('');
                  run(() => setAppearance({ customCss: '' }));
                }}
                className="px-4 py-2 rounded-2xl text-sm font-medium text-ink-soft hover:bg-app disabled:opacity-40 transition-all"
              >
                Borrar
              </button>
              <span className="text-[10px] text-ink-muted ml-auto">
                {cssDraft.length}/{MAX_CSS}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Muestra acento, radio y escala juntos: es la mejor forma de entender
          qué está cambiando cada opción. */}
      <div className="p-5 rounded-3xl border border-rule bg-surface">
        <p className="font-display text-lg text-ink">Así se ve</p>
        <p className="text-sm text-ink-muted mt-1">
          El acento tiñe botones, enlaces y selecciones en toda la app.
        </p>
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-bold shadow-paper"
            style={{ backgroundColor: preview['--accent'], color: preview['--on-accent'] }}
          >
            Botón
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              backgroundColor: preview['--accent-surface'],
              color: preview['--accent-ink'],
            }}
          >
            Secundario
          </button>
          <span className="px-3 py-2 text-sm font-bold" style={{ color: preview['--accent'] }}>
            Enlace
          </span>
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
          onClick={() => {
            setCssDraft('');
            run(resetAppearance);
          }}
          className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted hover:text-danger transition-all disabled:opacity-60"
        >
          Restablecer apariencia
        </button>
      )}
    </div>
  );
}
