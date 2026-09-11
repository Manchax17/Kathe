import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { supabase } from '../supabaseClient';
import Avatar from '../components/Avatar';
import DeckCard from '../components/DeckCard';
import Splash from '../components/Splash';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';

export default function ProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { fetchPublicDecks } = useDecks();

  // Guardamos el username junto al resultado: si la ruta cambia, el dato viejo
  // deja de coincidir y la página vuelve a mostrar la carga sin efectos de limpieza.
  const [state, setState] = useState({ username: null, profile: undefined, decks: [] });
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    (async () => {
      // `ilike` y no `eq`: el username se guarda en minúsculas (lo garantiza el
      // CHECK), pero si alguien escribe /u/Manchax2005 a mano, `eq` no lo
      // encontraría y daría "Perfil no encontrado" por una diferencia de caja.
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

      if (!active) return;

      if (!profile) {
        setState({ username, profile: null, decks: [] });
        return;
      }

      const decks = await fetchPublicDecks(profile.id);
      if (active) setState({ username, profile, decks });
    })();

    return () => {
      active = false;
    };
  }, [username, fetchPublicDecks]);

  const loaded = state.username === username;
  const profile = loaded ? state.profile : undefined;

  if (!loaded) return <Splash label="Cargando perfil…" />;

  if (profile === null) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface max-w-md">
          <p className="font-display text-2xl text-ink-soft mb-2">Perfil no encontrado</p>
          <p className="text-sm text-ink-muted mb-6">
            No hay nadie registrado con el usuario @{username}.
          </p>
          <Link
            to="/explorar"
            className="inline-block bg-accent px-5 py-3 rounded-2xl font-bold text-sm shadow-paper hover:shadow-paper-hover transition-all"
            style={{ color: 'var(--surface)' }}
          >
            Ir a Explorar
          </Link>
        </div>
      </main>
    );
  }

  const isOwn = profile.id === user?.id;

  const handleMessage = async () => {
    setMessaging(true);
    setError('');

    // La RPC crea el hilo si no existe y lo devuelve si ya existía. Es la única
    // forma de abrir una conversación: nadie tiene INSERT directo sobre la tabla.
    const { data, error: rpcError } = await supabase.rpc('get_or_create_conversation', {
      p_other: profile.id,
    });

    setMessaging(false);

    if (rpcError) {
      setError('No se pudo abrir la conversación: ' + rpcError.message);
      return;
    }
    navigate(`/chat/${data}`);
  };

  return (
    <main className="w-full max-w-4xl mx-auto px-6 py-10">
      <section className="flex flex-wrap items-start gap-6 mb-10 anim-fade-in">
        <Avatar profile={profile} size={96} />

        <div className="flex-1 min-w-[16rem]">
          <h1 className="font-display text-4xl text-ink leading-tight">
            {profile.display_name || profile.username}
          </h1>
          <p className="text-sm uppercase tracking-[0.25em] font-bold text-accent mt-1">
            @{profile.username}
          </p>
          {profile.bio && (
            <p className="text-ink-soft mt-4 whitespace-pre-wrap max-w-prose">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            {isOwn ? (
              <Link
                to="/ajustes"
                className="px-5 py-3 rounded-2xl bg-accent text-sm font-bold shadow-paper hover:shadow-paper-hover transition-all"
                style={{ color: 'var(--surface)' }}
              >
                Editar perfil
              </Link>
            ) : (
              <button
                onClick={handleMessage}
                disabled={messaging}
                className="px-5 py-3 rounded-2xl bg-accent text-sm font-bold shadow-paper hover:shadow-paper-hover disabled:opacity-60 transition-all"
                style={{ color: 'var(--surface)' }}
              >
                {messaging ? 'Abriendo…' : 'Enviar mensaje'}
              </button>
            )}
          </div>

          {error && <p className="text-sm text-danger mt-3">{error}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.25em] font-bold text-ink-muted mb-4">
          {isOwn ? 'Tus mazos públicos' : 'Mazos públicos'}
        </h2>

        {state.decks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {state.decks.map((deck) => (
              <DeckCard key={deck.id} deck={deck} onOpen={() => navigate(`/deck/${deck.id}`)} readOnly />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface">
            <p className="font-display text-2xl text-ink-soft mb-2">Nada público todavía</p>
            <p className="text-sm text-ink-muted">
              {isOwn
                ? 'Marcá un mazo como público desde el menú ⋯ para compartirlo acá.'
                : 'Esta persona todavía no compartió ningún mazo.'}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
