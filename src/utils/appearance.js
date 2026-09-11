/**
 * Personalización de apariencia (RF5).
 *
 * Todo se resuelve sobrescribiendo variables CSS en `:root`, así que no hay que
 * tocar Tailwind ni recompilar: las utilidades (`text-accent`, `rounded-3xl`,
 * `bg-accent-surface`…) ya leen esas variables y cambian solas.
 *
 * Los acentos van como presets con su variante clara y oscura en vez de
 * calcularse con mate de color en runtime. Es más datos, pero garantiza que el
 * contraste quede bien en los dos modos; derivar "un poco más claro" y "un poco
 * más oscuro" de un hex suele producir texto ilegible en uno de los dos.
 */

export const ACCENTS = {
  terracota: {
    label: 'Terracota',
    swatch: '#b8694a',
    light: { accent: '#b8694a', soft: '#d99479', ink: '#6b2f1c', surface: '#f4dccb' },
    dark: { accent: '#d99479', soft: '#b8694a', ink: '#f3ead9', surface: '#3a231a' },
  },
  bosque: {
    label: 'Bosque',
    swatch: '#4f7a5b',
    light: { accent: '#4f7a5b', soft: '#7ba689', ink: '#28412f', surface: '#d9e8dd' },
    dark: { accent: '#8fc0a0', soft: '#4f7a5b', ink: '#eaf5ee', surface: '#1f3527' },
  },
  oceano: {
    label: 'Océano',
    swatch: '#3f6f97',
    light: { accent: '#3f6f97', soft: '#7ba3c4', ink: '#1f3a52', surface: '#d6e4f0' },
    dark: { accent: '#8fb8d9', soft: '#3f6f97', ink: '#e8f1f8', surface: '#1a2c3d' },
  },
  lavanda: {
    label: 'Lavanda',
    swatch: '#7a68a8',
    light: { accent: '#7a68a8', soft: '#a89ac9', ink: '#3d3159', surface: '#e3dcf0' },
    dark: { accent: '#b6a8dd', soft: '#7a68a8', ink: '#f0ecfa', surface: '#2a2340' },
  },
  mostaza: {
    label: 'Mostaza',
    swatch: '#b8892f',
    light: { accent: '#b8892f', soft: '#d7b273', ink: '#5e4310', surface: '#f2e3c4' },
    dark: { accent: '#d7b273', soft: '#b8892f', ink: '#f7eeda', surface: '#3a2c12' },
  },
  frambuesa: {
    label: 'Frambuesa',
    swatch: '#a84468',
    light: { accent: '#a84468', soft: '#cc85a1', ink: '#571e34', surface: '#f0dae3' },
    dark: { accent: '#d98baa', soft: '#a84468', ink: '#faeaf0', surface: '#3a1a28' },
  },
  grafito: {
    label: 'Grafito',
    swatch: '#5a5f66',
    light: { accent: '#5a5f66', soft: '#8f959d', ink: '#2c2f33', surface: '#e0e2e5' },
    dark: { accent: '#a8aeb6', soft: '#5a5f66', ink: '#eef0f2', surface: '#2a2d31' },
  },
};

export const ACCENT_KEYS = Object.keys(ACCENTS);

/** Factor sobre el font-size de la raíz: al ser `rem`, escala texto y espaciados juntos. */
export const SCALES = {
  compacta: { label: 'Compacta', factor: 0.94 },
  normal: { label: 'Normal', factor: 1 },
  grande: { label: 'Grande', factor: 1.08 },
};

export const SCALE_KEYS = Object.keys(SCALES);

export const RADII = {
  cozy: { label: 'Redondeado', factor: 1 },
  sharp: { label: 'Cuadrado', factor: 0.35 },
};

export const RADIUS_KEYS = Object.keys(RADII);

export const DEFAULT_APPEARANCE = {
  accent: 'terracota',
  scale: 'normal',
  radius: 'cozy',
  grain: true,
};

/**
 * Radios por defecto de Tailwind v4. `rounded-3xl` compila a
 * `border-radius: var(--radius-3xl)`, así que reescribiendo estas variables
 * desde el runtime todas las utilidades de radio responden a la preferencia.
 */
const TAILWIND_RADII = {
  '--radius-xs': 0.125,
  '--radius-sm': 0.25,
  '--radius-md': 0.375,
  '--radius-lg': 0.5,
  '--radius-xl': 0.75,
  '--radius-2xl': 1,
  '--radius-3xl': 1.5,
  '--radius-4xl': 2,
};

/** Opacidad de la textura de papel en cada modo (0 = desactivada). */
const GRAIN_OPACITY = { light: '0.5', dark: '0.35' };

/**
 * Acepta cualquier cosa (viene de un JSONB que el usuario podría haber escrito
 * a mano) y devuelve una apariencia siempre válida.
 */
export function normalizeAppearance(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  return {
    accent: ACCENTS[src.accent] ? src.accent : DEFAULT_APPEARANCE.accent,
    scale: SCALES[src.scale] ? src.scale : DEFAULT_APPEARANCE.scale,
    radius: RADII[src.radius] ? src.radius : DEFAULT_APPEARANCE.radius,
    grain: typeof src.grain === 'boolean' ? src.grain : DEFAULT_APPEARANCE.grain,
  };
}

/** ¿La apariencia actual es la que trae Kathe por defecto? */
export function isDefaultAppearance(appearance) {
  const a = normalizeAppearance(appearance);
  return (
    a.accent === DEFAULT_APPEARANCE.accent &&
    a.scale === DEFAULT_APPEARANCE.scale &&
    a.radius === DEFAULT_APPEARANCE.radius &&
    a.grain === DEFAULT_APPEARANCE.grain
  );
}

/** Devuelve un mapa de variable CSS → valor, listo para `setProperty`. */
export function appearanceToCssVars(appearance, mode) {
  const a = normalizeAppearance(appearance);
  const palette = ACCENTS[a.accent][mode === 'dark' ? 'dark' : 'light'];
  const radiusFactor = RADII[a.radius].factor;

  const vars = {
    '--accent': palette.accent,
    '--accent-soft': palette.soft,
    '--accent-ink': palette.ink,
    '--accent-surface': palette.surface,
    '--kathe-font-scale': String(SCALES[a.scale].factor),
    '--kathe-grain': a.grain ? GRAIN_OPACITY[mode === 'dark' ? 'dark' : 'light'] : '0',
  };

  Object.entries(TAILWIND_RADII).forEach(([name, rem]) => {
    vars[name] = `${(rem * radiusFactor).toFixed(4)}rem`;
  });

  return vars;
}
