/**
 * Verificación de las paletas de tema y acento.
 *
 * Corre con `npm run check:themes`. Comprueba lo que se rompe en silencio:
 * que el texto sobre un relleno de acento sea legible, que el acento por
 * defecto de cada tema se distinga de su propio fondo, y que la tinta del
 * tema se lea sobre su fondo.
 *
 * El CSS de los temas vive en index.css, así que los fondos y las tintas de
 * acá son una copia: si se cambia un tema allá, hay que actualizar SURFACES.
 * Es el precio de no parsear CSS, y vale la pena porque a cambio el script no
 * necesita el bundler.
 */
import {
  ACCENTS,
  ACCENT_KEYS,
  appearanceToCssVars,
  contrastRatio,
  parseHex,
  relativeLuminance,
} from '../src/utils/appearance.js';
import { BASE_THEMES, BASE_THEME_KEYS } from '../src/utils/themePresets.js';

/** [fondo, tinta] de cada tema, en modo claro y oscuro. */
const SURFACES = {
  paper: { light: ['#faf4e7', '#1f1810'], dark: ['#1a140d', '#f3ead9'] },
  glass: { light: ['#e9e5f5', '#211c33'], dark: ['#14101f', '#f4f2ff'] },
  cappuccino: { light: ['#f2e5d7', '#2f1d12'], dark: ['#1f1512', '#f5e6d3'] },
  'tokyo-night': { light: ['#e1e2e7', '#1a1b26'], dark: ['#1a1b26', '#c0caf5'] },
  nord: { light: ['#eceff4', '#2e3440'], dark: ['#2e3440', '#eceff4'] },
  dracula: { light: ['#f3f2f7', '#282a36'], dark: ['#282a36', '#f8f8f2'] },
  gruvbox: { light: ['#fbf1c7', '#3c3836'], dark: ['#282828', '#ebdbb2'] },
  solarized: { light: ['#fdf6e3', '#073642'], dark: ['#002b36', '#eee8d5'] },
};

/**
 * Acento que cada tema aplica al elegirse. El mismo tema pide tonos distintos
 * según el modo —el violeta de Dracula no se lee sobre su base clara— y eso es
 * justo lo que hay que vigilar, así que se declara por modo.
 */
const THEME_ACCENT = {
  paper: { light: 'terracota', dark: 'terracota' },
  glass: { light: '#6d4fd0', dark: '#8c6eff' },
  cappuccino: { light: '#8a5a3b', dark: '#d9a679' },
  'tokyo-night': { light: '#3d5f9e', dark: '#7aa2f7' },
  nord: { light: '#4c7a8c', dark: '#88c0d0' },
  dracula: { light: '#7c5cc4', dark: '#bd93f9' },
  gruvbox: { light: '#9d6b00', dark: '#d79921' },
  solarized: { light: '#1f6f9e', dark: '#268bd2' },
};

/** Colores libres que la gente suele escribir, para probar la generación. */
const LOOSE_HEXES = ['#8c6eff', '#bd93f9', '#f7768e', '#9ece6a', '#e0af68', '#7dcfff', '#ff9e64'];

const MIN_TEXT = 4.5; // WCAG AA, texto normal
const MIN_UI = 3; // WCAG AA, elementos de interfaz
const MODES = ['light', 'dark'];

const round = (n) => Math.round(n * 100) / 100;

const problems = [];
const fail = (msg) => problems.push(msg);

// ───────── 1 · cobertura ─────────
console.log('\n1 · Cobertura');
const noSurface = BASE_THEME_KEYS.filter((k) => !SURFACES[k]);
const noTheme = Object.keys(SURFACES).filter((k) => !BASE_THEMES[k]);
if (noSurface.length) fail(`temas sin fondo declarado: ${noSurface.join(', ')}`);
if (noTheme.length) fail(`fondos sin tema declarado: ${noTheme.join(', ')}`);
const noAccent = BASE_THEME_KEYS.filter((k) => !THEME_ACCENT[k]);
if (noAccent.length) fail(`temas sin acento por defecto: ${noAccent.join(', ')}`);
console.log(`  ${BASE_THEME_KEYS.length} temas, ${ACCENT_KEYS.length} acentos preset`);

// ───────── 2 · texto sobre el acento ─────────
console.log('\n2 · Texto sobre relleno de acento');
const accents = [...ACCENT_KEYS.map((k) => [k, ACCENTS[k]]), ...LOOSE_HEXES.map((h) => [h, null])];

for (const [name, preset] of accents) {
  for (const mode of MODES) {
    const hex = preset ? preset[mode].accent : name;
    const vars = appearanceToCssVars({ accent: name, baseTheme: 'paper' }, mode);
    const onAccent = vars['--on-accent'];
    if (!onAccent) {
      fail(`${name}/${mode}: no se generó --on-accent`);
      continue;
    }
    const ratio = round(contrastRatio(parseHex(hex), parseHex(onAccent)));
    if (ratio < MIN_UI) fail(`${name}/${mode}: ${onAccent} sobre ${hex} = ${ratio}:1`);
    // Entre 3 y 4.5 pasa el mínimo de interfaz pero no la lectura cómoda: se
    // avisa sin fallar (el terracota de fábrica está en 4.49).
    const mark = ratio >= MIN_TEXT ? 'ok   ' : 'avisa';
    console.log(
      `  ${mark} ${name.padEnd(12)} ${mode.padEnd(5)} ${onAccent} sobre ${hex} → ${ratio}:1`,
    );
  }
}

// ───────── 3 · acento por defecto contra su propio tema ─────────
console.log('\n3 · Acento por defecto de cada tema contra su fondo');
for (const key of BASE_THEME_KEYS) {
  for (const mode of MODES) {
    const [bg] = SURFACES[key][mode];
    const vars = appearanceToCssVars({ accent: THEME_ACCENT[key][mode], baseTheme: key }, mode);
    const ratio = round(contrastRatio(parseHex(vars['--accent']), parseHex(bg)));
    if (ratio < MIN_UI) fail(`${key}/${mode}: acento vs fondo ${bg} = ${ratio}:1`);
    const mark = ratio >= MIN_UI ? 'ok   ' : 'FALLA';
    console.log(
      `  ${mark} ${key.padEnd(12)} ${mode.padEnd(5)} ${vars['--accent']} sobre ${bg} → ${ratio}:1`,
    );
  }
}

// ───────── 4 · tinta del tema ─────────
console.log('\n4 · Tinta del tema sobre su propio fondo');
for (const key of BASE_THEME_KEYS) {
  for (const mode of MODES) {
    const [bg, ink] = SURFACES[key][mode];
    const ratio = round(contrastRatio(parseHex(ink), parseHex(bg)));
    if (ratio < MIN_TEXT) fail(`${key}/${mode}: tinta ${ink} sobre ${bg} = ${ratio}:1`);
    const mark = ratio >= MIN_TEXT ? 'ok   ' : 'FALLA';
    console.log(
      `  ${mark} ${key.padEnd(12)} ${mode.padEnd(5)} ${ink} sobre ${bg} → ${ratio}:1`,
    );
  }
}

// ───────── 5 · coherencia entre temas ─────────
console.log('\n5 · Coherencia entre temas');
for (const key of BASE_THEME_KEYS) {
  const [lBg] = SURFACES[key].light;
  const [dBg] = SURFACES[key].dark;
  if (relativeLuminance(parseHex(lBg)) <= 0.5) fail(`${key}: el fondo "claro" no es claro (${lBg})`);
  if (relativeLuminance(parseHex(dBg)) >= 0.2) fail(`${key}: el fondo "oscuro" no es oscuro (${dBg})`);

  // Dos temas que comparten fondo son el mismo tema con otro nombre.
  for (const other of BASE_THEME_KEYS) {
    if (other <= key) continue;
    if (SURFACES[other].light[0] === lBg) fail(`${key} y ${other} comparten fondo claro (${lBg})`);
    if (SURFACES[other].dark[0] === dBg) fail(`${key} y ${other} comparten fondo oscuro (${dBg})`);
  }
}

// ───────── resultado ─────────
if (problems.length) {
  console.log(`\n${problems.length} problema(s):`);
  problems.forEach((p) => console.log(`  · ${p}`));
  console.log('');
  process.exit(1);
}
console.log('\nTodo en orden.\n');
