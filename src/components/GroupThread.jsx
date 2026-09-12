import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useGroupMembers } from '../hooks/useGroupMembers';
import { useGroups } from '../hooks/useGroups';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';

const DAY_FMT = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function dayLabel(iso) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Hoy';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

  return DAY_FMT.format(date);
}

/**
 * Hilo de un grupo.
 *
 * Es hermano de `ChatThread`, no una generalización suya. Se evaluó unificar los
 * dos en un componente con un `kind`, y salía peor: la tabla es otra
 * (`group_messages` vs `messages`), el header es otro (un grupo no tiene
 * `@usuario`), los mensajes llevan autor, y el grupo tiene acciones que un 1:1 no
 * tiene (agregar gente, salir). Un `if` por cada una de esas diferencias adentro
 * del mismo archivo es más difícil de leer que dos componentes hermanos que
 * comparten `MessageBubble`.
 *
 * Lo que sí se conserva del 1:1 es la mecánica que ya está probada: sin inserción
 * optimista (se inserta con `.select()` y se agrega la fila devuelta), Realtime
 * filtrado por `group_id` y deduplicado por `id`.
 */
export default function GroupThread({ group, onLeft }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { leaveGroup, removeMember, addMember } = useGroups();
  const { status: membersStatus, members, profileOf, isAdmin, reload: reloadMembers } =
    useGroupMembers(group.id);

  const [messages, setMessages] = useState(null); // null = cargando
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [actionError, setActionError] = useState('');
  const endRef = useRef(null);

  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error: loadError } = await supabase
        .from('group_messages')
        .select('*')
        .eq('group_id', group.id)
        .order('created_at', { ascending: true });

      if (!active) return;
      if (loadError) {
        setError('No se pudo cargar el grupo: ' + loadError.message);
        setMessages([]);
        return;
      }
      setMessages(data || []);
    })();

    return () => {
      active = false;
    };
  }, [group.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`group:${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${group.id}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev && prev.some((m) => m.id === payload.new.id)
              ? prev
              : [...(prev || []), payload.new],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const groups = useMemo(() => {
    const out = [];
    let currentKey = null;

    (messages || []).forEach((message) => {
      const key = new Date(message.created_at).toDateString();
      if (key !== currentKey) {
        out.push({ key, label: dayLabel(message.created_at), items: [] });
        currentKey = key;
      }
      out[out.length - 1].items.push(message);
    });

    return out;
  }, [messages]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError('');

    const { data, error: insertError } = await supabase
      .from('group_messages')
      .insert([{ group_id: group.id, sender_id: user.id, body }])
      .select()
      .single();

    setSending(false);

    if (insertError) {
      setError('No se pudo enviar: ' + insertError.message);
      return;
    }

    setDraft('');
    setMessages((prev) =>
      prev && prev.some((m) => m.id === data.id) ? prev : [...(prev || []), data],
    );
  };

  const handleLeave = async () => {
    setActionError('');
    const ok = await leaveGroup(group.id);
    if (!ok) {
      setActionError('No se pudo salir del grupo.');
      return;
    }
    onLeft();
    navigate('/chat');
  };

  const handleRemove = async (userId) => {
    setActionError('');
    const ok = await removeMember(group.id, userId);
    if (!ok) {
      setActionError('No se pudo quitar a esa persona.');
      return;
    }
    await reloadMembers();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="px-5 py-4 border-b border-rule bg-surface flex items-center gap-3">
        <GroupAvatar size={40} />

        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-ink truncate">{group.name}</p>
          <button
            onClick={() => setShowMembers((v) => !v)}
            className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted hover:text-accent transition-all"
          >
            {membersStatus === 'ready' ? members.length : '…'}{' '}
            {members.length === 1 ? 'miembro' : 'miembros'}
          </button>
        </div>

        <button
          onClick={handleLeave}
          className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted hover:text-danger px-3 py-2 rounded-xl transition-all shrink-0"
        >
          Salir
        </button>
      </header>

      {showMembers && (
        <div className="px-5 py-4 border-b border-rule bg-app anim-fade-in">
          <p className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted mb-3">
            Miembros
          </p>
          <ul className="space-y-2">
            {members.map((m) => {
              const profile = profileOf[m.user_id];
              const isMe = m.user_id === user.id;
              return (
                <li key={m.user_id} className="flex items-center gap-3">
                  <Avatar profile={profile} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink truncate">
                      {profile?.display_name || profile?.username || 'Usuario'}
                      {isMe && <span className="text-ink-muted"> · vos</span>}
                    </p>
                  </div>
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="text-[10px] uppercase tracking-[0.15em] font-bold text-ink-muted hover:text-danger transition-all"
                    >
                      Quitar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {actionError && <p className="text-xs text-danger mt-3">{actionError}</p>}

          {/* Sumar gente: un formulario aparte, para no meter una búsqueda
              entera dentro del panel de miembros. */}
          <AddMemberForm
            existingIds={memberIds}
            onAdd={async (userId) => {
              setActionError('');
              const ok = await addMember(group.id, userId);
              if (!ok) {
                setActionError('No se pudo agregar a esa persona.');
                return false;
              }
              await reloadMembers();
              return true;
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-4 min-h-0">
        {messages === null && (
          <p className="text-center text-ink-muted font-display-italic">Cargando mensajes…</p>
        )}

        {messages !== null && messages.length === 0 && (
          <p className="text-center text-ink-muted font-display-italic">
            Todavía no hay mensajes. Arrancá la conversación.
          </p>
        )}

        {groups.map((day) => (
          <div key={day.key} className="space-y-2">
            <p className="text-center text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted">
              {day.label}
            </p>
            {day.items.map((message) => (
              <MessageBubble
                key={message.id}
                body={message.body}
                createdAt={message.created_at}
                own={message.sender_id === user.id}
                author={profileOf[message.sender_id]}
                // Dentro de un grupo siempre hace falta saber quién habla. En
                // un 1:1 no, por eso el default queda en false.
                showAuthor
              />
            ))}
          </div>
        ))}

        <div ref={endRef} />
      </div>

      {error && (
        <p className="mx-5 mb-2 text-xs text-danger bg-danger-surface px-4 py-2 rounded-xl border border-rule">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-4 border-t border-rule bg-surface flex items-end gap-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          placeholder={`Escribí en ${group.name}… (Enter para enviar)`}
          maxLength={2000}
          className="flex-1 p-3 bg-app border border-rule rounded-2xl outline-none focus:border-accent resize-none text-sm custom-scrollbar"
          style={{ color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="px-5 py-3 rounded-2xl bg-accent font-bold text-sm shadow-paper disabled:opacity-50 transition-all"
          style={{ color: 'var(--on-accent)' }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}

/**
 * Avatar de grupo: un círculo con las iniciales del nombre.
 *
 * No hay imagen de grupo (nadie sube una), así que reusar `Avatar` no servía:
 * ese componente espera un perfil y cae a las iniciales de `username`. Acá el
 * texto sale del nombre del grupo.
 */
function GroupAvatar({ size = 40 }) {
  return (
    <span
      className="shrink-0 rounded-full border border-rule bg-accent-surface text-accent-ink inline-flex items-center justify-center font-display font-bold select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    </span>
  );
}

/** Buscador de personas para sumar al grupo. Mismo `ilike` que usa Explorar. */
function AddMemberForm({ existingIds, onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    // Se limpian los caracteres que romperían el filtro `or` de PostgREST.
    const q = query.replace(/[,()@]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!q) {
      setResults([]);
      return;
    }

    setBusy(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(10);
    setBusy(false);

    setResults((data || []).filter((p) => !existingIds.has(p.id)));
  };

  return (
    <div className="mt-5 pt-4 border-t border-rule">
      <p className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted mb-3">
        Agregar a alguien
      </p>

      <form onSubmit={search} className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por @usuario o nombre…"
          className="flex-1 px-4 py-2.5 bg-surface border border-rule rounded-2xl text-sm outline-none focus:border-accent"
          style={{ color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2.5 rounded-2xl border border-rule text-xs uppercase tracking-[0.15em] font-bold text-ink-soft hover:bg-surface disabled:opacity-50 transition-all"
        >
          {busy ? '…' : 'Buscar'}
        </button>
      </form>

      {results.length > 0 && (
        <ul className="mt-3 space-y-1">
          {results.map((profile) => (
            <li key={profile.id} className="flex items-center gap-3 py-1.5">
              <Avatar profile={profile} size={28} />
              <p className="text-sm text-ink truncate flex-1">
                {profile.display_name || profile.username}
                <span className="text-ink-muted"> @{profile.username}</span>
              </p>
              <button
                onClick={async () => {
                  const ok = await onAdd(profile.id);
                  if (ok) setResults((prev) => prev.filter((p) => p.id !== profile.id));
                }}
                className="text-[10px] uppercase tracking-[0.15em] font-bold text-accent hover:opacity-80 transition-all"
              >
                Agregar
              </button>
            </li>
          ))}
        </ul>
      )}

      {!busy && query.trim() && results.length === 0 && (
        <p className="text-xs text-ink-muted mt-3">Nadie nuevo con ese nombre.</p>
      )}
    </div>
  );
}
