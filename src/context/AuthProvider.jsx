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

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
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
