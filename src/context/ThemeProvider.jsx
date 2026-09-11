import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';
import { useAuth } from '../hooks/useAuth';
import {
  DEFAULT_APPEARANCE,
  appearanceToCssVars,
  normalizeAppearance,
} from '../utils/appearance';

const KEY = 'kathe:theme';

function readInitial() {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const { profile, saveProfile } = useAuth();
  const [theme, setTheme] = useState(readInitial);

  // `draft` es la edición local, que se ve al instante sin esperar al servidor.
  // Cuando no hay edición pendiente manda lo que vino del perfil. Se deriva en
  // vez de sincronizar con un efecto: así no hay setState-in-effect ni parpadeo.
  const [draft, setDraft] = useState(null);
  const appearance = useMemo(
    () => normalizeAppearance(draft ?? profile?.appearance),
    [draft, profile?.appearance],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      /* sin almacenamiento, ignorar */
    }
  }, [theme]);

  // La apariencia se aplica sobrescribiendo variables CSS en <html>. El estilo
  // inline le gana a la regla de la hoja, así que no hay que tocar el CSS.
  useEffect(() => {
    const root = document.documentElement;
    const vars = appearanceToCssVars(appearance, theme);
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  }, [appearance, theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setAppearance = useCallback(
    (patch) => {
      // Se normaliza acá y no en el editor, para que nadie pueda mandar un
      // acento inexistente directo a la base.
      const next = normalizeAppearance({ ...(draft ?? profile?.appearance), ...patch });
      setDraft(next);
      return saveProfile({ appearance: next });
    },
    [draft, profile?.appearance, saveProfile],
  );

  const resetAppearance = useCallback(() => {
    setDraft(DEFAULT_APPEARANCE);
    return saveProfile({ appearance: DEFAULT_APPEARANCE });
  }, [saveProfile]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, appearance, setAppearance, resetAppearance }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
