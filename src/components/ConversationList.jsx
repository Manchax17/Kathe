import { Link } from 'react-router';
import Avatar from './Avatar';

const TIME_FMT = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });
const DATE_FMT = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

function stampOf(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return TIME_FMT.format(date);

  const days = Math.round((now - date) / 86400000);
  if (days < 7) return DATE_FMT.format(date);
  return DATE_FMT.format(date);
}

/** Columna izquierda del chat: los hilos ordenados por actividad reciente. */
export default function ConversationList({ conversations, peers, previews, activeId }) {
  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="font-display-italic text-ink-muted">Todavía no hablás con nadie.</p>
        <p className="text-xs text-ink-muted mt-2">
          Buscá a alguien en <span className="font-bold">Explorar</span> y escribile.
        </p>
      </div>
    );
  }

  return (
    <nav className="flex flex-col">
      {conversations.map((conversation) => {
        const peer = peers[conversation.peer_id];
        const preview = previews[conversation.id];
        const isActive = conversation.id === activeId;

        return (
          <Link
            key={conversation.id}
            to={`/chat/${conversation.id}`}
            className={`flex items-center gap-3 px-4 py-3 border-b border-rule transition-all ${
              isActive ? 'bg-accent-surface' : 'hover:bg-app'
            }`}
          >
            <Avatar profile={peer} size={40} />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-display text-base text-ink truncate">
                  {peer?.display_name || peer?.username || 'Usuario'}
                </p>
                <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted shrink-0">
                  {stampOf(preview?.created_at || conversation.last_message_at)}
                </span>
              </div>
              <p
                className={`text-xs truncate ${
                  preview ? 'text-ink-muted' : 'text-ink-muted italic'
                }`}
              >
                {preview ? preview.body : 'Sin mensajes todavía'}
              </p>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
