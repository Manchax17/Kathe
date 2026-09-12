import { useState } from 'react';
import { supabase } from '../supabaseClient';
import Avatar from './Avatar';
import { useGroups } from '../hooks/useGroups';

/**
 * Modal para crear un grupo: nombre + a quiénes invitás.
 *
 * Alcanza con el nombre para crear el grupo y sumar gente después, así que la
 * lista de invitados puede quedar vacía — es válido (aunque poco útil) crear un
 * grupo en el que estés solo, y sirve para no bloquear a alguien que todavía no
 * sabe a quién invitar.
 */
export default function NewGroupModal({ onClose, onCreated }) {
  const { createGroup } = useGroups();
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const selectedIds = new Set(selected.map((p) => p.id));

  const search = async (e) => {
    e.preventDefault();
    const q = query.replace(/[,()@]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!q) {
      setResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(10);
    setSearching(false);

    setResults((data || []).filter((p) => !selectedIds.has(p.id)));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean || creating) return;

    setCreating(true);
    setError('');

    const id = await createGroup(
      clean,
      selected.map((p) => p.id),
    );

    setCreating(false);

    if (!id) {
      setError('No se pudo crear el grupo.');
      return;
    }

    onCreated(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 anim-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface border border-rule rounded-3xl shadow-paper p-6 anim-pop max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <h2 className="font-display text-2xl text-ink mb-1">Nuevo grupo</h2>
        <p className="text-sm text-ink-muted mb-5">
          Poné un nombre y elegí con quiénes. Podés sumar gente después.
        </p>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label
              htmlFor="group-name"
              className="block text-xs uppercase tracking-[0.2em] font-bold text-ink-muted mb-2"
            >
              Nombre
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
              placeholder="Estudio de anatomía"
              className="w-full px-4 py-3 bg-app border border-rule rounded-2xl text-sm outline-none focus:border-accent"
              style={{ color: 'var(--ink)' }}
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted mb-2">
              Invitados {selected.length > 0 && `· ${selected.length}`}
            </p>

            {selected.length > 0 && (
              <ul className="flex flex-wrap gap-2 mb-3">
                {selected.map((profile) => (
                  <li
                    key={profile.id}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 bg-app border border-rule rounded-full"
                  >
                    <Avatar profile={profile} size={22} />
                    <span className="text-xs text-ink">@{profile.username}</span>
                    <button
                      type="button"
                      onClick={() => setSelected((prev) => prev.filter((p) => p.id !== profile.id))}
                      className="text-ink-muted hover:text-danger text-sm leading-none"
                      aria-label={`Quitar a ${profile.username}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por @usuario o nombre…"
                className="flex-1 px-4 py-2.5 bg-app border border-rule rounded-2xl text-sm outline-none focus:border-accent"
                style={{ color: 'var(--ink)' }}
              />
              <button
                type="button"
                onClick={search}
                disabled={searching}
                className="px-4 py-2.5 rounded-2xl border border-rule text-xs uppercase tracking-[0.15em] font-bold text-ink-soft hover:bg-app disabled:opacity-50 transition-all"
              >
                {searching ? '…' : 'Buscar'}
              </button>
            </div>

            {results.length > 0 && (
              <ul className="mt-3 space-y-1">
                {results.map((profile) => (
                  <li key={profile.id} className="flex items-center gap-3 py-1.5">
                    <Avatar profile={profile} size={28} />
                    <p className="text-sm text-ink truncate flex-1">
                      {profile.display_name || profile.username}
                      <span className="text-ink-muted"> @{profile.username}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected((prev) => [...prev, profile]);
                        setResults((prev) => prev.filter((p) => p.id !== profile.id));
                      }}
                      className="text-[10px] uppercase tracking-[0.15em] font-bold text-accent hover:opacity-80 transition-all"
                    >
                      Sumar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!name.trim() || creating}
              className="flex-1 px-5 py-3 rounded-2xl bg-accent font-bold text-sm shadow-paper disabled:opacity-50 transition-all"
              style={{ color: 'var(--on-accent)' }}
            >
              {creating ? 'Creando…' : 'Crear grupo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-rule font-bold text-sm text-ink-soft hover:bg-app transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
