import { useNavigate } from 'react-router';
import Splash from '../components/Splash';
import StudyMode from '../components/StudyMode';
import { useRouteDeck } from '../hooks/useRouteDeck';

export default function StudyPage() {
  const navigate = useNavigate();
  const { deck, loading, missing } = useRouteDeck();

  if (loading) return <Splash label="Preparando la sesión…" />;

  if (missing) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface max-w-md">
          <p className="font-display text-2xl text-ink-soft mb-2">Mazo no disponible</p>
          <p className="text-sm text-ink-muted">
            No se puede estudiar un mazo que no existe o que es privado.
          </p>
        </div>
      </main>
    );
  }

  // La `key` reinicia la sesión si se vuelve a entrar con el mazo ya cargado.
  return (
    <StudyMode
      key={deck.id}
      deck={deck}
      onExit={() => navigate(`/deck/${deck.id}`)}
    />
  );
}
