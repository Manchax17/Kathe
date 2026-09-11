import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';
import { useAuth } from '../hooks/useAuth';
import { BASE_THEMES, THEME_ACCENT_DEFAULTS } from '../utils/themePresets';
import {
  DEFAULT_APPEARANCE,
  appearanceToCssVars,
  normalizeAppearance,
  scopeCustomCss,
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

  // El tema base es un atributo, no variables: su CSS vive en index.css colgado
  // de [data-theme-base='...']. En el tema por defecto se saca el atributo para
  // no dejar `data-theme-base="null"` en el HTML.
  useEffect(() => {
    const root = document.documentElement;
    const attr = BASE_THEMES[appearance.baseTheme]?.attr;
    if (attr) root.dataset.themeBase = attr;
    else delete root.dataset.themeBase;
  }, [appearance.baseTheme]);

  // El CSS propio va en una etiqueta <style> con `data-kathe-custom`, para poder
  // reemplazarla sin tocar ninguna otra. Se buscan todas por atributo y no por
  // id: con StrictMode el efecto puede correr dos veces, y así no queda
  // duplicada.
  useEffect(() => {
    const scoped = scopeCustomCss(appearance.customCss);
    const previous = document.querySelectorAll('style[data-kathe-custom]');
    previous.forEach((el) => el.remove());

    if (!scoped) return;

    const style = document.createElement('style');
    style.setAttribute('data-kathe-custom', '');
    style.textContent = scoped;
    document.head.appendChild(style);
  }, [appearance.customCss]);

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

  /**
   * Cambia el tema base y, con él, su acento característico.
   *
   * Un tema sin su color pierde la mitad del efecto: Glass con terracota o Tokyo
   * Night con un naranja cálido no se parecen a lo que uno espera de esos temas.
   * Es solo el valor inicial — si después el usuario elige otro acento, manda su
   * elección.
   */
  const setBaseTheme = useCallback(
    (baseTheme) => {
      const accent = THEME_ACCENT_DEFAULTS[baseTheme];
      const next = normalizeAppearance({ ...appearance, baseTheme, accent });
      setDraft(next);
      return saveProfile({ appearance: next });
    },
    [appearance, saveProfile],
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        appearance,
        setAppearance,
        setBaseTheme,
        resetAppearance,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
