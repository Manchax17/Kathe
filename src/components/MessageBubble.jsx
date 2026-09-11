const TIME_FMT = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' });

/**
 * Burbuja de chat. La propia va alineada a la derecha sobre `bg-accent`; el texto
 * se fuerza a `var(--on-accent)` porque el acento cambia según el tema y un
 * blanco fijo quedaba ilegible con acentos claros.
 */
export default function MessageBubble({ body, createdAt, own }) {
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          own ? 'bg-accent' : 'bg-surface-elevated border border-rule'
        }`}
        style={own ? { color: 'var(--on-accent)' } : undefined}
      >
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
