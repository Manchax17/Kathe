/**
 * El username es la llave pública de cada perfil: vive en la URL (/u/:username)
 * y es por lo que se busca a alguien. Debe coincidir con el CHECK de la migración
 * 0002 (^[a-z0-9_]{3,24}$), así que saneamos aquí antes de mandarlo a la base.
 */

// Rango de marcas combinantes (acentos). Se construye con un string para no
// incrustar caracteres invisibles en el fuente.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function normalizeUsername(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '') // "José" -> "jose"
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
}

/** Devuelve null si es válido, o el mensaje de error en español si no. */
export function validateUsername(raw) {
  const clean = normalizeUsername(raw);
  if (clean.length === 0) return 'Elegí un nombre de usuario.';
  if (clean.length < 3) return 'Necesita al menos 3 caracteres.';
  if (!/^[a-z0-9_]{3,24}$/.test(clean)) {
    return 'Solo letras, números y guion bajo (sin espacios).';
  }
  return null;
}

/** Iniciales para el avatar cuando no hay imagen: "ana maría" -> "AM". */
export function initialsOf(name) {
  const parts = String(name || '')
    .trim()
    .split(/[\s_.-]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
