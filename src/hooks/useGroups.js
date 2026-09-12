import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

/**
 * Grupos del usuario y las operaciones sobre ellos.
 *
 * Por qué las escrituras van por acá y no sueltas en los componentes: hay
 * invariantes del esquema que solo se cumplen si el camino es uno.
 *
 * - Un grupo NACE por la RPC `create_group`, no por un INSERT. `groups` no tiene
 *   política de INSERT a propósito: el grupo y la membresía de quien lo crea
 *   tienen que nacer en la misma transacción. Si se separaran, quedaría un grupo
 *   con cero miembros, y como el SELECT exige pertenecer, ese grupo no lo vería
 *   nadie — ni su creador.
 * - EXPULSAR va por la RPC `remove_group_member` porque la política de DELETE de
 *   `group_members` tiene que quedarse sin subconsultas (ver migración 0009).
 */

const UNDEFINED_TABLE = '42P01';
const UNIQUE_VIOLATION = '23505';

export function useGroups() {
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', groups: [], available: true });
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      // 42P01 = undefined_table: la migración 0009 todavía no está aplicada en
      // este entorno. No es un error para mostrarle al usuario: es una función
      // que acá todavía no existe. Misma defensa que en DecksProvider (0007) y
      // AiProvider (0008).
      if (loadError.code === UNDEFINED_TABLE) {
        setState({ status: 'ready', groups: [], available: false });
        return;
      }
      setState({ status: 'error', groups: [], available: true });
      return;
    }

    setState({ status: 'ready', groups: data || [], available: true });
  }, []);

  useEffect(() => {
    // IIFE async a propósito: `react-hooks/set-state-in-effect` marca como error
    // el setState síncrono en el cuerpo de un efecto, y llamar a `reload()`
    // directo lo es a sus ojos aunque adentro haya un await. Es el mismo patrón
    // que usan ChatPage y ProfilePage en este proyecto.
    let active = true;
    (async () => {
      await reload();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, [reload]);

  /** Crea el grupo con `memberIds` ya adentro. Devuelve el id, o null si falló. */
  const createGroup = useCallback(
    async (name, memberIds = []) => {
      const clean = [...new Set(memberIds)].filter((id) => id && id !== user.id);
      const { data, error: rpcError } = await supabase.rpc('create_group', {
        p_name: name,
        p_members: clean,
      });

      if (rpcError) {
        setError(rpcError.message);
        return null;
      }

      setError('');
      await reload();
      return data;
    },
    [user.id, reload],
  );

  /** Suma a alguien que todavía no está. Alcanza con ser miembro del grupo. */
  const addMember = useCallback(async (groupId, userId) => {
    const { error: insertError } = await supabase
      .from('group_members')
      .insert([{ group_id: groupId, user_id: userId, role: 'member' }]);

    if (insertError) {
      // 23505 = unique_violation: ya estaba adentro. La persona cumplió lo que
      // se buscaba, así que esto no es un fallo que valga la pena mostrar.
      if (insertError.code === UNIQUE_VIOLATION) return true;
      setError(insertError.message);
      return false;
    }

    setError('');
    return true;
  }, []);

  /** Salir por cuenta propia: DELETE directo, permitido por la política. */
  const leaveGroup = useCallback(
    async (groupId) => {
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (deleteError) {
        setError(deleteError.message);
        return false;
      }

      setError('');
      await reload();
      return true;
    },
    [user.id, reload],
  );

  /** El admin saca a otro. La validación del rol vive en la base, no acá. */
  const removeMember = useCallback(async (groupId, userId) => {
    const { error: rpcError } = await supabase.rpc('remove_group_member', {
      p_group: groupId,
      p_user: userId,
    });

    if (rpcError) {
      setError(rpcError.message);
      return false;
    }

    setError('');
    return true;
  }, []);

  const renameGroup = useCallback(
    async (groupId, name) => {
      const { error: updateError } = await supabase
        .from('groups')
        .update({ name })
        .eq('id', groupId);

      if (updateError) {
        setError(updateError.message);
        return false;
      }

      setError('');
      await reload();
      return true;
    },
    [reload],
  );

  return {
    ...state,
    error,
    clearError: () => setError(''),
    reload,
    createGroup,
    addMember,
    leaveGroup,
    removeMember,
    renameGroup,
  };
}
