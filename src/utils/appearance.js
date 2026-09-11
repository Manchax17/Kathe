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

// ───────── Color libre ─────────
// El usuario puede elegir cualquier color, no solo los presets. La clave es que
// no elegimos UN color sino que generamos la paleta entera (acento, soft, ink y
// surface) a partir de uno, porque la app usa los cuatro y con uno solo no
// alcanza para que se lea bien en los dos modos.

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** #abc / #aabbcc → {r,g,b} | null */
export function parseHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const toHex = (r, g, b) =>
  '#' +
  [r, g, b]
    .map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'))
    .join('');

const withAlpha = ({ r, g, b }, a) =>
  `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;

/** hsl → rgb. h en grados, s y l en 0..1 */
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = 60 * (((gn - bn) / d) % 6);
  else if (max === gn) h = 60 * ((bn - rn) / d + 2);
  else h = 60 * ((rn - gn) / d + 4);

  return { h: ((h % 360) + 360) % 360, s, l };
}

const shift = (hsl, dl, ds = 0) =>
  hslToRgb(hsl.h, clamp(hsl.s + ds, 0, 1), clamp(hsl.l + dl, 0, 1));

/** Luminancia relativa (WCAG) para calcular contraste. */
export function relativeLuminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ratio de contraste WCAG entre dos colores, de 1 a 21. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * ¿El color funciona como acento en este modo?
 *
 * Un acento muy claro sobre fondo claro (o muy oscuro sobre fondo oscuro) deja
 * botones y enlaces ilegibles. En vez de bloquear la elección, se avisa: la
 * decisión final es del usuario.
 */
export function checkAccentContrast(hex, mode, bgHex = mode === 'dark' ? BG.dark : BG.light) {
  const accent = parseHex(hex);
  const bg = parseHex(bgHex);
  if (!accent || !bg) return { ok: true, ratio: null };
  const ratio = contrastRatio(accent, bg);
  // 3:1 es el mínimo de WCAG para elementos de interfaz (no texto).
  return {
    ok: ratio >= 3,
    ratio: Math.round(ratio * 100) / 100,
  };
}

/** Fondos reales de los dos modos, tal como están en index.css. */
export const BG = { light: '#faf4e7', dark: '#1a140d' };

/** Mezcla `over` sobre `under` según alpha (0..1), como hace el compositor. */
function composite(over, under, alpha) {
  return {
    r: over.r * alpha + under.r * (1 - alpha),
    g: over.g * alpha + under.g * (1 - alpha),
    b: over.b * alpha + under.b * (1 - alpha),
  };
}

/**
 * Genera la paleta de acento completa a partir de un color libre.
 *
 * El `accent-ink` (texto sobre `accent-surface`) se corrige solo hasta alcanzar
 * contraste de lectura: derivar tonos a ciegas es justo lo que dejaba texto
 * ilegible, así que acá se mide y se ajusta.
 */
export function accentPaletteFromHex(hex, mode) {
  const base = parseHex(hex);
  if (!base) return null;

  const hsl = rgbToHsl(base);
  const dark = mode === 'dark';

  const accent = base;
  // En claro, el "soft" es más claro que el acento; en oscuro, más apagado.
  const soft = shift(hsl, dark ? -0.12 : 0.12, dark ? -0.1 : 0);

  // `surface` es el tinte suave de fondo para chips y botones secundarios.
  const surfaceAlpha = dark ? 0.28 : 0.22;
  const surfaceTint = shift(hsl, 0, -0.08);
  // El fondo real sobre el que se apoya `surface`, para poder medir contraste:
  // `surface` es semi-transparente, así que su color efectivo es la mezcla.
  const bg = hslToRgb(hsl.h, 0.12, dark ? 0.02 : 0.97);
  const surfaceSolid = composite(surfaceTint, bg, surfaceAlpha);

  // Corrección de contraste. El problema real: sobre un fondo claro el texto
  // tiene que ir hacia OSCURO, y sobre uno oscuro hacia CLARO. Si se empuja
  // siempre en la misma dirección (lo que hacía la primera versión), con un
  // acento como el amarillo el texto blanco quedaba sobre un chip claro e
  // ilegible. Por eso acá se elige la dirección según el fondo.
  const inkDirection = relativeLuminance(bg) > 0.5 ? -1 : 1;
  let ink = shift(hsl, inkDirection * (dark ? 0.62 : 0.34), -0.12);
  for (let i = 0; i < 14 && contrastRatio(ink, surfaceSolid) < 4.5; i += 1) {
    ink = shift(rgbToHsl(ink), inkDirection * 0.06, 0);
  }

  const inkHex = toHex(ink.r, ink.g, ink.b);

  return {
    accent: toHex(accent.r, accent.g, accent.b),
    soft: toHex(soft.r, soft.g, soft.b),
    ink: inkHex,
    surface: withAlpha(surfaceTint, surfaceAlpha),
    // Se mide contra el color efectivo del chip, no contra el chip "de papel":
    // si no, el número no significaría nada.
    contrast: Math.round(contrastRatio(parseHex(inkHex), surfaceSolid) * 100) / 100,
  };
}

/**
 * Acepta cualquier cosa (viene de un JSONB que el usuario podría haber escrito
 * a mano) y devuelve una apariencia siempre válida.
 */
export function normalizeAppearance(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};

  // El acento es un preset con nombre o un hex propio. Cualquier otra cosa
  // ("", null, basura) cae al preset por defecto en vez de dejar la app sin color.
  const rawAccent = src.accent;
  let accent = DEFAULT_APPEARANCE.accent;
  if (typeof rawAccent === 'string') {
    if (ACCENTS[rawAccent]) accent = rawAccent;
    else {
      const hex = normalizeHex(rawAccent);
      if (hex) accent = hex;
    }
  }

  return {
    accent,
    scale: SCALES[src.scale] ? src.scale : DEFAULT_APPEARANCE.scale,
    radius: RADII[src.radius] ? src.radius : DEFAULT_APPEARANCE.radius,
    grain: typeof src.grain === 'boolean' ? src.grain : DEFAULT_APPEARANCE.grain,
    customCss: typeof src.customCss === 'string' ? src.customCss.slice(0, MAX_CSS) : '',
  };
}

/** Devuelve el hex en minúsculas y con #, o null si no es válido. */
export function normalizeHex(value) {
  const rgb = parseHex(value);
  return rgb ? toHex(rgb.r, rgb.g, rgb.b) : null;
}

/** ¿Este acento es un preset con nombre, o un color propio del usuario? */
export const isCustomHex = (accent) => typeof accent === 'string' && parseHex(accent) !== null;

/** ¿La apariencia actual es la que trae Kathe por defecto? */
export function isDefaultAppearance(appearance) {
  const a = normalizeAppearance(appearance);
  return (
    a.accent === DEFAULT_APPEARANCE.accent &&
    a.scale === DEFAULT_APPEARANCE.scale &&
    a.radius === DEFAULT_APPEARANCE.radius &&
    a.grain === DEFAULT_APPEARANCE.grain &&
    a.customCss === ''
  );
}

/** Devuelve un mapa de variable CSS → valor, listo para `setProperty`. */
export function appearanceToCssVars(appearance, mode) {
  const a = normalizeAppearance(appearance);
  const dark = mode === 'dark';

  // Preset con nombre, o paleta generada del hex propio. Si el hex fuera basura
  // (no debería, ya lo normalizamos), cae al preset por defecto.
  const palette =
    (isCustomHex(a.accent) ? accentPaletteFromHex(a.accent, mode) : null) ||
    ACCENTS[a.accent][dark ? 'dark' : 'light'];

  const radiusFactor = RADII[a.radius].factor;

  const vars = {
    '--accent': palette.accent,
    '--accent-soft': palette.soft,
    '--accent-ink': palette.ink,
    '--accent-surface': palette.surface,
    '--kathe-font-scale': String(SCALES[a.scale].factor),
    '--kathe-grain': a.grain ? GRAIN_OPACITY[dark ? 'dark' : 'light'] : '0',
  };

  Object.entries(TAILWIND_RADII).forEach(([name, rem]) => {
    vars[name] = `${(rem * radiusFactor).toFixed(4)}rem`;
  });

  return vars;
}

// ───────── CSS propio ─────────

/** Tope de seguridad: más que esto no es una personalización, es un problema. */
export const MAX_CSS = 4000;

/**
 * Quita lo que permitiría salirse del alcance del estilo propio.
 *
 * Ojo con lo que esto **no** protege: en una app de un solo autor el CSS propio
 * es una función, no un agujero de seguridad, porque cada quien puede estilizar
 * su propia sesión y nada más. La sanitización está para evitar que un error de
 * tipeo rompa el layout, no para defender de un atacante.
 */
export function sanitizeCss(raw) {
  if (typeof raw !== 'string') return '';
  return (
    raw
      .replace(/<\/?style[^>]*>/gi, '')
      .replace(/@import[^;]*;?/gi, '')
      // Bloquea recursos externos enteros (no solo el esquema): un `url(...)`
      // remoto en CSS propio permite filtrar datos por la IP del visitante o
      // rastrearlo. Se elimina la declaración completa, con comillas o sin ellas.
      .replace(/url\s*\(\s*(['"]?)[^)]*\1\s*\)/gi, 'none')
      .slice(0, MAX_CSS)
  );
}

/**
 * Deja el CSS propio encerrado en `:root`.
 *
 * Si el usuario escribe reglas sueltas (`body { ... }`), envolverlas en un
 * `@layer` y anidarlas bajo `:root` hace que apliquen a toda la app pero con
 * menor prioridad que las utilidades de Tailwind, así no rompe lo que ya
 * funciona. Un `@layer` a secas no sirve porque abarcaría todo el archivo.
 */
export function scopeCustomCss(raw) {
  const css = sanitizeCss(raw);
  if (!css.trim()) return '';
  return `@layer kathe-custom {\n:root {\n${css}\n}\n}`;
}
