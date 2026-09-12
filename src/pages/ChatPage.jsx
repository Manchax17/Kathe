import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { supabase } from '../supabaseClient';
import ChatThread from '../components/ChatThread';
import ConversationList from '../components/ConversationList';
import GroupThread from '../components/GroupThread';
import NewGroupModal from '../components/NewGroupModal';
import Splash from '../components/Splash';
import { useAuth } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';

/**
 * Bandeja unificada: conversaciones 1:1 y grupos en la misma lista.
 *
 * Los dos tipos de hilo se distinguen por el prefijo de la ruta:
 * `/chat/<uuid>` es una conversación y `/chat/g/<uuid>` un grupo. Se eligió esto
 * y no una ruta `/grupos` aparte porque un grupo es un chat, no otra cosa: si
 * viviera en otro lado, habría que mirar en dos lugares para saber si te
 * escribieron. El prefijo `g/` es un namespace barato que evita cualquier
 * colisión con un id de conversación.
 *
 * La carga inicial son dos queries en paralelo (conversaciones y grupos) y
 * después los perfiles de los interlocutores. El mapeo se hace en el cliente
 * porque así RLS sigue siendo simple de razonar y no hay que exponer una vista
 * para armar la lista.
 */
export default function ChatPage() {
  const { conversationId, groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, available: groupsAvailable } = useGroups();

  const [state, setState] = useState({ status: 'loading', conversations: [], peers: {}, previews: {} });
  const [showNewGroup, setShowNewGroup] = useState(false);

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
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', peerIds);
        (profiles || []).forEach((profile) => {
          peers[profile.id] = profile;
        });
      }

      // Vista previa del último mensaje de cada hilo 1:1.
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

  const activeGroup = groupId ? groups.find((g) => g.id === groupId) : null;

  // Si abren /chat/:id de algo ajeno, RLS devuelve vacío. No es un error:
  // simplemente no lo tienen, y se lo decimos sin mostrar un error crudo.
  if (conversationId && !activeConversation) {
    return <Unavailable what="Conversación" hint="No participás de este hilo, o ya no existe." />;
  }

  if (groupId && !activeGroup) {
    return <Unavailable what="Grupo" hint="No pertenecés a este grupo, o ya no existe." />;
  }

  const hasThread = Boolean(activeConversation || activeGroup);

  return (
    <div className="flex-1 flex min-h-0 w-full max-w-6xl mx-auto">
      <aside
        className={`${
          hasThread ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 shrink-0 flex-col border-r border-rule bg-surface min-h-0 overflow-y-auto custom-scrollbar`}
      >
        <div className="px-4 py-4 border-b border-rule flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-ink">Mensajes</h1>
          {groupsAvailable && (
            <button
              onClick={() => setShowNewGroup(true)}
              className="text-xs uppercase tracking-[0.2em] font-bold text-accent hover:opacity-80 px-3 py-2 rounded-xl border border-rule transition-all shrink-0"
            >
              Nuevo grupo
            </button>
          )}
        </div>

        {groups.length > 0 && (
          <div className="border-b border-rule">
            <p className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted">
              Grupos
            </p>
            <nav className="flex flex-col pb-2">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/chat/g/${group.id}`}
                  className={`flex items-center gap-3 px-4 py-3 transition-all ${
                    group.id === groupId ? 'bg-accent-surface' : 'hover:bg-app'
                  }`}
                >
                  <span className="w-10 h-10 shrink-0 rounded-full border border-rule bg-accent-surface text-accent-ink inline-flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-5 h-5"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base text-ink truncate">{group.name}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {group.created_by === user.id ? 'Sos el administrador' : 'Grupo'}
                    </p>
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        )}

        <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.25em] font-bold text-ink-muted">
          Directos
        </div>
        <ConversationList
          conversations={state.conversations}
          peers={state.peers}
          previews={state.previews}
          activeId={conversationId}
        />
      </aside>

      <section className={`${hasThread ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-h-0`}>
        {activeConversation && (
          <>
            <div className="md:hidden px-4 py-3 border-b border-rule bg-surface">
              <Link to="/chat" className="text-accent font-bold text-sm flex items-center gap-2">
                ← Volver
              </Link>
            </div>
            <ChatThread
              key={activeConversation.id}
              conversationId={activeConversation.id}
              peer={state.peers[activeConversation.peer_id]}
            />
          </>
        )}

        {activeGroup && (
          <>
            <div className="md:hidden px-4 py-3 border-b border-rule bg-surface">
              <Link to="/chat" className="text-accent font-bold text-sm flex items-center gap-2">
                ← Volver
              </Link>
            </div>
            <GroupThread
              key={activeGroup.id}
              group={activeGroup}
              onLeft={() => navigate('/chat')}
            />
          </>
        )}

        {!hasThread && (
          <div className="flex-1 flex items-center justify-center p-10">
            <div className="text-center max-w-xs">
              <p className="font-display text-2xl text-ink-soft mb-2">Elegí una conversación</p>
              <p className="text-sm text-ink-muted">
                O buscá a alguien en <span className="font-bold">Explorar</span> para empezar a
                hablar, o armá un grupo con el botón de arriba.
              </p>
            </div>
          </div>
        )}
      </section>

      {showNewGroup && (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreated={(id) => {
            setShowNewGroup(false);
            navigate(`/chat/g/${id}`);
          }}
        />
      )}
    </div>
  );
}

/** Estado "no tenés acceso a esto", compartido por conversaciones y grupos. */
function Unavailable({ what, hint }) {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface max-w-md">
        <p className="font-display text-2xl text-ink-soft mb-2">{what} no disponible</p>
        <p className="text-sm text-ink-muted mb-6">{hint}</p>
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
