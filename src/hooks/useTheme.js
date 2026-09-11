import { useContext } from 'react';
import { ThemeContext } from '../context/themeContext';

/**
 * Antes cada componente que llamaba a este hook creaba su propia copia del estado,
 * así que el ThemeToggle y el selector de Ajustes se desincronizaban. Ahora todos
 * leen del mismo ThemeProvider.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() debe usarse dentro de <ThemeProvider>.');
  }
  return ctx;
}
