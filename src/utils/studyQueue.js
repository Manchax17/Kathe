export const STUDY_ORDERS = ['insertion', 'alphabetical', 'reverse', 'random', 'random_seed'];

export const STUDY_ORDER_LABELS = {
  insertion: 'Orden de inserción',
  alphabetical: 'Alfabético (A→Z)',
  reverse: 'Alfabético inverso (Z→A)',
  random: 'Aleatorio (sesión)',
  random_seed: 'Aleatorio fijo (semilla diaria)',
};

export const STUDY_ORDER_SHORT = {
  insertion: 'Inserción',
  alphabetical: 'A→Z',
  reverse: 'Z→A',
  random: 'Aleatorio',
  random_seed: 'Semilla',
};

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function dailySeed(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function buildQueue(words, order = 'insertion', { seed } = {}) {
  const entries = Object.entries(words || {});
  switch (order) {
    case 'alphabetical':
      return entries.sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base', numeric: true }));
    case 'reverse':
      return entries.sort((a, b) => b[0].localeCompare(a[0], 'es', { sensitivity: 'base', numeric: true }));
    case 'random':
      return shuffle(entries, Math.random);
    case 'random_seed':
      return shuffle(entries, seededRandom(seed ?? dailySeed()));
    case 'insertion':
    default:
      return entries;
  }
}
