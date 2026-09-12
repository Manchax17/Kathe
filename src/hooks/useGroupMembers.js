import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

/**
 * Los miembros de un grupo, con su perfil. Solo lee: las operaciones de
 * escritura viven en `useGroups`, para no tener la misma lógica en dos lugares.
 *
 * El JOIN se arma en el cliente y no con `select('*, profiles(*)')` por la misma
 * razón que en el chat 1:1: así RLS sigue siendo simple de razonar. Además el
 * payload de Realtime trae solo las columnas de `group_messages`, sin las del
 * JOIN, así que igual haría falta este mapa para resolver quién escribió qué.
 */

export function useGroupMembers(groupId) {
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', members: [], profileOf: {} });

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId);

    if (error) {
      setState({ status: 'error', members: [], profileOf: {} });
      return;
    }

    const members = rows || [];
    const profileOf = {};

    const ids = members.map((m) => m.user_id);
    if (ids.length > 0) {
      // Una sola query para todos los perfiles, no una por miembro.
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
      (profiles || []).forEach((profile) => {
        profileOf[profile.id] = profile;
      });
    }

    setState({ status: 'ready', members, profileOf });
  }, [groupId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const me = state.members.find((m) => m.user_id === user?.id);

  return {
    ...state,
    me,
    isAdmin: me?.role === 'admin',
    isMember: Boolean(me),
    reload: load,
  };
}
