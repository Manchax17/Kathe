import { Link } from 'react-router';
import FlashCardView from '../components/FlashCardView';
import Splash from '../components/Splash';
import { useRouteDeck } from '../hooks/useRouteDeck';

export default function DeckPage() {
  const { deck, loading, missing } = useRouteDeck();

  if (loading) return <Splash label="Abriendo mazo…" />;

  // RLS devuelve vacío si el mazo no existe o es privado y no es tuyo. No es un
  // error: es exactamente la respuesta correcta, así que la mostramos con calma.
  if (missing) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface max-w-md">
          <p className="font-display text-2xl text-ink-soft mb-2">Mazo no disponible</p>
          <p className="text-sm text-ink-muted mb-6">
            No existe, o su dueño todavía no lo hizo público.
          </p>
          <Link
            to="/"
            className="inline-block bg-accent px-5 py-3 rounded-2xl font-bold text-sm shadow-paper hover:shadow-paper-hover transition-all"
            style={{ color: 'var(--on-accent)' }}
          >
            Volver a mis mazos
          </Link>
        </div>
      </main>
    );
  }

  // La `key` reinicia el índice y el giro de la ficha al saltar de un mazo a otro.
  return <FlashCardView key={deck.id} deck={deck} />;
}
