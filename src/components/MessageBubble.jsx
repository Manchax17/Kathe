const TIME_FMT = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

/**
 * Burbuja de chat. La propia va alineada a la derecha sobre `bg-accent`; el texto
 * se fuerza a `var(--on-accent)` porque el acento cambia según el tema y un
 * blanco fijo quedaba ilegible con acentos claros.
 *
 * En un grupo hace falta saber quién dijo qué, así que acepta `author` (el
 * perfil del emisor) y `showAuthor`. En un hilo 1:1 no se pasa ninguno de los
 * dos y la burbuja queda exactamente como antes: el nombre de la otra persona
 * ya está en el header, repetirlo en cada mensaje sería ruido.
 */
export default function MessageBubble({ body, createdAt, own, author, showAuthor = false }) {
  const authorName = author?.display_name || author?.username;

  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          own ? 'bg-accent' : 'bg-surface-elevated border border-rule'
        }`}
        style={own ? { color: 'var(--on-accent)' } : undefined}
      >
        {showAuthor && !own && authorName && (
          <p className="text-[11px] font-bold text-accent mb-1 truncate">{authorName}</p>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">{body}</p>

        <p
          className={`text-[10px] mt-1 text-right ${
            own ? 'opacity-70' : 'text-ink-muted'
          }`}
        >
          {createdAt ? TIME_FMT.format(new Date(createdAt)) : ''}
        </p>
      </div>
    </div>
  );
}
