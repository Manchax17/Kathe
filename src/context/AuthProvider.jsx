import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { normalizeUsername } from '../utils/username';
import { AuthContext } from './authContext';

async function fetchProfile(uid) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    // Si las migraciones 0002+ todavía no se corrieron, la tabla no existe.
    // La app tiene que seguir andando igual, sin perfil social.
    console.warn('Kathe: no se pudo cargar el perfil.', error.message);
    return null;
  }
  return data ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sesión: lectura inicial + suscripción a cambios (login, logout, refresh).
  useEffect(() => {
    let active = true;
    let settled = false;

    const settle = () => {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    };

    // El listener es la fuente de verdad. Antes `loading` lo apagaba getSession(),
    // que resuelve ANTES de que Supabase termine de leer el storage: quedaba una
    // ventana con loading=false y user=null, y RequireAuth mandaba a /login.
    // Ahora esperamos al primer evento real del listener.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const next = session?.user ?? null;

      // Un INITIAL_SESSION sin sesión no tiene que desloguear a quien ya estaba
      // adentro. La única forma legítima de perder la sesión en runtime es un
      // SIGNED_OUT explícito (incluye el que emite Supabase si falla el refresh).
      setUser((prev) => (next === null && prev && event !== 'SIGNED_OUT' ? prev : next));
      settle();
    });

    // Red de seguridad: si el listener no llegara a disparar nunca, getSession
    // resuelve igual y la app no se queda colgada en el Splash.
    supabase.auth.getSession().then(({ data }) => {
      if (!active || settled) return;
      setUser(data.session?.user ?? null);
      settle();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Perfil social: se recarga cada vez que cambia el usuario.
  useEffect(() => {
    let active = true;
    const uid = user?.id ?? null;

    (async () => {
      const next = uid ? await fetchProfile(uid) : null;
      if (active) setProfile(next);
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  // No tocamos `user` a mano: lo hace el listener de onAuthStateChange. Así, si
  // el proyecto activa la confirmación por email, no aparecemos "logueados" sin
  // sesión real (que dejaba la app en blanco y sin datos).
  const signUp = useCallback(async (email, password, username) => {
    const clean = normalizeUsername(username);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: clean, display_name: clean } },
    });
    if (error) return { error };
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    const next = await fetchProfile(user.id);
    setProfile(next);
    return next;
  }, [user]);

  const saveProfile = useCallback(
    async (patch) => {
      if (!user) return { error: new Error('No hay sesión activa.') };
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select()
        .single();
      if (error) return { error };
      setProfile(data);
      return { data };
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
