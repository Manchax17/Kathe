import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { supabase } from '../supabaseClient';
import ChatThread from '../components/ChatThread';
import ConversationList from '../components/ConversationList';
import Splash from '../components/Splash';
import { useAuth } from '../hooks/useAuth';

/**
 * Chat 1:1.
 *
 * La carga inicial son dos queries, no un join: primero las conversaciones del
 * usuario, y después `profiles.in('id', ids)` con la otra persona de cada hilo.
 * El mapeo se hace en el cliente porque así RLS sigue siendo simple de razonar
 * y evitamos exponer la tabla de perfiles por una relación.
 */
export default function ChatPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();

  const [state, setState] = useState({
    status: 'loading',
    conversations: [],
    peers: {},
    previews: {},
  });

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (!active) return;

      if (error) {
        setState({ status: 'error', conversations: [], peers: {}, previews: {} });
        return;
      }

      const conversations = (data || []).map((conversation) => ({
        ...conversation,
        peer_id:
          conversation.user_low === user.id ? conversation.user_high : conversation.user_low,
      }));

      // Un hilo, una query: los perfiles de todos los interlocutores juntos.
      const peers = {};
      const peerIds = [...new Set(conversations.map((c) => c.peer_id))];
      if (peerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', peerIds);

        (profiles || []).forEach((profile) => {
          peers[profile.id] = profile;
        });
      }

      // Vista previa del último mensaje de cada hilo.
      const previews = {};
      await Promise.all(
        conversations.map(async (conversation) => {
          const { data: last } = await supabase
            .from('messages')
            .select('body, created_at')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (last) previews[conversation.id] = last;
        }),
      );

      if (!active) return;
      setState({ status: 'ready', conversations, peers, previews });
    })();

    return () => {
      active = false;
    };
  }, [user.id]);

  if (state.status === 'loading') return <Splash label="Cargando conversaciones…" />;

  if (state.status === 'error') {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface max-w-md">
          <p className="font-display text-2xl text-ink-soft mb-2">Chat no disponible</p>
          <p className="text-sm text-ink-muted">
            Revisá que la migración 0004 esté aplicada en Supabase.
          </p>
        </div>
      </main>
    );
  }

  const activeConversation = conversationId
    ? state.conversations.find((c) => c.id === conversationId)
    : null;

  // Si abren /chat/:id de una conversación ajena, RLS devuelve vacío. No es un
  // error: simplemente no la tienen, y se lo decimos sin mostrar un error crudo.
  if (conversationId && !activeConversation) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface max-w-md">
          <p className="font-display text-2xl text-ink-soft mb-2">Conversación no disponible</p>
          <p className="text-sm text-ink-muted mb-6">
            No participás de este hilo, o ya no existe.
          </p>
          <Link
            to="/chat"
            className="inline-block bg-accent px-5 py-3 rounded-2xl font-bold text-sm shadow-paper hover:shadow-paper-hover transition-all"
            style={{ color: 'var(--on-accent)' }}
          >
            Volver a mis chats
          </Link>
        </div>
      </main>
    );
  }

  const hasThread = Boolean(activeConversation);

  return (
    <div className="flex-1 flex min-h-0 w-full max-w-6xl mx-auto">
      <aside
        className={`${
          hasThread ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 shrink-0 flex-col border-r border-rule bg-surface min-h-0 overflow-y-auto custom-scrollbar`}
      >
        <div className="px-4 py-4 border-b border-rule">
          <h1 className="font-display text-2xl text-ink">Mensajes</h1>
        </div>
        <ConversationList
          conversations={state.conversations}
          peers={state.peers}
          previews={state.previews}
          activeId={conversationId}
        />
      </aside>

      <section className={`${hasThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0`}>
        {activeConversation ? (
          <>
            <div className="md:hidden px-4 py-3 border-b border-rule bg-surface">
              <Link
                to="/chat"
                className="text-accent font-bold text-sm flex items-center gap-2"
              >
                ← Volver
              </Link>
            </div>
            <ChatThread
              key={activeConversation.id}
              conversationId={activeConversation.id}
              peer={state.peers[activeConversation.peer_id]}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center max-w-xs">
              <p className="font-display text-2xl text-ink-soft mb-2">Elegí una conversación</p>
              <p className="text-sm text-ink-muted">
                O buscá a alguien en <span className="font-bold">Explorar</span> para empezar a
                hablar.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
