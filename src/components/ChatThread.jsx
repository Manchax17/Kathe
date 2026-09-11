import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
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
 * Un hilo de conversación.
 *
 * No hay inserción optimista: el mensaje se inserta con `.select()` y se agrega la
 * fila que devuelve la base. Si el eco de Realtime llega antes o después, el
 * deduplicado por `id` evita que se vea dos veces. Así el mensaje aparece siempre
 * (aunque Realtime falle) y nunca se repite.
 *
 * El componente se monta con `key={conversationId}` desde ChatPage, así que al
 * cambiar de hilo se remonta y no hace falta limpiar el estado a mano.
 */
export default function ChatThread({ conversationId, peer }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(null); // null = cargando
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error: loadError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!active) return;
      if (loadError) {
        setError('No se pudo cargar la conversación: ' + loadError.message);
        setMessages([]);
        return;
      }
      setMessages(data || []);
    })();

    return () => {
      active = false;
    };
  }, [conversationId]);

  useEffect(() => {
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
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
  }, [conversationId]);

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
      .from('messages')
      .insert([{ conversation_id: conversationId, sender_id: user.id, body }])
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <header className="px-5 py-4 border-b border-rule bg-surface flex items-center gap-3">
        <Avatar profile={peer} size={40} />
        <div className="min-w-0">
          <p className="font-display text-lg text-ink truncate">
            {peer?.display_name || peer?.username || 'Conversación'}
          </p>
          {peer?.username && (
            <Link
              to={`/u/${peer.username}`}
              className="text-xs uppercase tracking-[0.2em] font-bold text-accent hover:opacity-80"
            >
              @{peer.username}
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-6 space-y-4 min-h-0">
        {messages === null && (
          <p className="text-center text-ink-muted font-display-italic">Cargando mensajes…</p>
        )}

        {messages !== null && messages.length === 0 && (
          <p className="text-center text-ink-muted font-display-italic">
            Todavía no hay mensajes. Escribile algo.
          </p>
        )}

        {groups.map((group) => (
          <div key={group.key} className="space-y-2">
            <p className="text-center text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted">
              {group.label}
            </p>
            {group.items.map((message) => (
              <MessageBubble
                key={message.id}
                body={message.body}
                createdAt={message.created_at}
                own={message.sender_id === user.id}
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
          placeholder="Escribí un mensaje… (Enter para enviar)"
          maxLength={2000}
          className="flex-1 p-3 bg-app border border-rule rounded-2xl outline-none focus:border-accent resize-none text-sm custom-scrollbar"
          style={{ color: 'var(--ink)' }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="px-5 py-3 rounded-2xl bg-accent font-bold text-sm shadow-paper disabled:opacity-50 transition-all"
          style={{ color: 'var(--surface)' }}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
