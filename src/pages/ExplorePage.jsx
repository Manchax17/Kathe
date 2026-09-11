import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import UserCard from '../components/UserCard';

const EMPTY = { q: '', status: 'idle', profiles: [], counts: {} };

// El filtro `or` de PostgREST separa condiciones con comas, así que una coma en
// la búsqueda rompería la query. La sacamos antes de armar el string.
const sanitize = (raw) => raw.replace(/[,()]/g, ' ').trim();

export default function ExplorePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(EMPTY);
  const [searching, setSearching] = useState(false);

  const runSearch = async (e) => {
    e.preventDefault();

    const q = sanitize(query);
    if (!q) {
      setResult(EMPTY);
      return;
    }

    setSearching(true);
    setResult((prev) => ({ ...prev, status: 'loading', q }));

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', user.id)
      .limit(20);

    if (error) {
      setResult({ q, status: 'error', profiles: [], counts: {} });
      setSearching(false);
      return;
    }

    const profiles = data || [];

    // Una sola query extra para los contadores, en vez de una por persona.
    const counts = {};
    const ids = profiles.map((p) => p.id);
    if (ids.length > 0) {
      const { data: rows } = await supabase
        .from('decks')
        .select('user_id')
        .in('user_id', ids)
        .eq('is_public', true);

      (rows || []).forEach((row) => {
        counts[row.user_id] = (counts[row.user_id] || 0) + 1;
      });
    }

    setResult({ q, status: 'done', profiles, counts });
    setSearching(false);
  };

  const showResults = result.status === 'done' || result.status === 'loading';

  return (
    <main className="w-full max-w-3xl mx-auto px-6 py-10">
      <section className="mb-8 anim-fade-in">
        <p className="font-display-italic text-ink-muted text-lg">Buscar personas</p>
        <h1 className="font-display text-5xl text-ink mt-1 leading-tight">
          Encontrá con quién <span className="text-accent italic">estudiar</span>
        </h1>
      </section>

      <form onSubmit={runSearch} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por @usuario o nombre…"
            className="w-full pl-10 pr-4 py-3 bg-surface border border-rule rounded-2xl text-sm outline-none focus:border-accent"
            style={{ color: 'var(--ink)' }}
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-5 py-3 rounded-2xl bg-accent text-sm font-bold shadow-paper hover:shadow-paper-hover disabled:opacity-60 transition-all"
          style={{ color: 'var(--surface)' }}
        >
          {searching ? 'Buscando…' : 'Buscar'}
        </button>
      </form>

      {result.status === 'error' && (
        <p className="text-sm text-danger bg-danger-surface px-4 py-3 rounded-2xl border border-rule">
          No se pudo buscar. Revisá que las migraciones 0002 y 0003 estén aplicadas.
        </p>
      )}

      {showResults && result.profiles.length > 0 && (
        <section className="space-y-3">
          {result.profiles.map((profile) => (
            <UserCard
              key={profile.id}
              profile={profile}
              publicDeckCount={result.counts[profile.id] || 0}
            />
          ))}
        </section>
      )}

      {result.status === 'done' && result.profiles.length === 0 && (
        <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface">
          <p className="font-display text-2xl text-ink-soft mb-2">Sin resultados</p>
          <p className="text-sm text-ink-muted">
            Nadie coincide con "{result.q}". Probá con otra parte del nombre.
          </p>
        </div>
      )}

      {result.status === 'idle' && (
        <div className="text-center p-12 border-2 border-dashed border-rule rounded-[2rem] bg-surface">
          <p className="font-display text-2xl text-ink-soft mb-2">A quién buscás</p>
          <p className="text-sm text-ink-muted">
            Escribí un nombre de usuario o parte de un nombre para encontrar personas.
          </p>
        </div>
      )}
    </main>
  );
}
