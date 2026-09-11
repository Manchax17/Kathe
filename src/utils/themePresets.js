/**
 * Temas base de Kathe.
 *
 * Un tema reescribe los tokens de **estructura** (fondo, superficies, tinta,
 * bordes, sombras, tipografía) pero **no el acento**: eso lo elige el usuario por
 * separado. Así cualquier tema combina con cualquier acento, en vez de tener
 * que definir un tema por cada combinación de color.
 *
 * El CSS de cada tema vive en `index.css`, colgado de `[data-theme-base='...']`.
 * Acá solo viven los datos que el editor necesita para mostrarlos, más el `attr`
 * que el provider escribe en <html>.
 */

export const BASE_THEMES = {
  paper: {
    label: 'Papel',
    attr: null, // el diseño original: sin atributo, sin CSS extra
    swatch: ['#faf4e7', '#b8694a', '#fffdf7'],
    description: 'El cuaderno cálido de siempre.',
  },
  glass: {
    label: 'Glass',
    attr: 'glass',
    swatch: ['#14101f', '#8c6eff', '#ffffff'],
    description: 'Vidrio esmerilado con manchas de color detrás.',
  },
  cappuccino: {
    label: 'Cappuccino',
    attr: 'cappuccino',
    swatch: ['#f2e5d7', '#8a6b4f', '#fffaf2'],
    description: 'Espresso y crema, más cálido y oscuro.',
  },
  'tokyo-night': {
    label: 'Tokyo Night',
    attr: 'tokyo-night',
    swatch: ['#1a1b26', '#7aa2f7', '#24283b'],
    description: 'La paleta nocturna de azules y violetas.',
  },
  nord: {
    label: 'Nord',
    attr: 'nord',
    swatch: ['#2e3440', '#88c0d0', '#4c566a'],
    description: 'Azules polares y grises fríos del norte.',
  },
  dracula: {
    label: 'Dracula',
    attr: 'dracula',
    swatch: ['#282a36', '#bd93f9', '#44475a'],
    description: 'Oscuro violáceo con acentos eléctricos.',
  },
  gruvbox: {
    label: 'Gruvbox',
    attr: 'gruvbox',
    swatch: ['#282828', '#d79921', '#3c3836'],
    description: 'Retro cálido: ámbar sobre grises terrosos.',
  },
  solarized: {
    label: 'Solarized',
    attr: 'solarized',
    swatch: ['#002b36', '#268bd2', '#073642'],
    description: 'El clásico de tonos equilibrados.',
  },
};

export const BASE_THEME_KEYS = Object.keys(BASE_THEMES);

export const DEFAULT_BASE_THEME = 'paper';

/**
 * Estos temas traen su propia paleta de acento por defecto (Glass con violeta,
 * Tokyo Night con azul) y no la del cuaderno (terracota), que desentonaría.
 *
 * Se usa solo al elegir el tema: si el usuario después cambia el acento, manda
 * su elección. Es un valor inicial, no una imposición.
 */
export const THEME_ACCENT_DEFAULTS = {
  paper: 'terracota',
  glass: '#6d4fd0',
  cappuccino: '#8a5a3b',
  'tokyo-night': '#3d5f9e',
  nord: '#4c7a8c',
  dracula: '#7c5cc4',
  gruvbox: '#9d6b00',
  solarized: '#1f6f9e',
};

export const isBaseTheme = (key) => Object.hasOwn(BASE_THEMES, key);
