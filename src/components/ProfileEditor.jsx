import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { validateUsername } from '../utils/username';
import AvatarUploader from './AvatarUploader';

const BIO_MAX = 280;

// 23505 = unique_violation. Es lo que devuelve Postgres si el username ya está
// tomado: lo mostramos con todas las letras en vez de inventar un mensaje propio.
const UNIQUE_VIOLATION = '23505';

/**
 * Editor de perfil (avatar, username, nombre, bio).
 *
 * Los campos arrancan desde `profile` y se comparan contra él para saber si hay
 * cambios. No hay ningún efecto que los sincronice: el padre monta este
 * componente con `key={profile?.id}`, así que cuando el perfil termina de cargar
 * (o cambia de usuario) React lo remonta y los inputs se rellenan solos.
 */
export default function ProfileEditor() {
  const { profile, saveProfile } = useAuth();

  const initialUsername = profile?.username ?? '';
  const initialDisplayName = profile?.display_name ?? '';
  const initialBio = profile?.bio ?? '';

  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const dirty =
    username !== initialUsername ||
    displayName !== initialDisplayName ||
    bio !== initialBio;

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    const invalid = validateUsername(username);
    if (invalid) {
      setError(invalid);
      return;
    }

    if (bio.length > BIO_MAX) {
      setError(`La biografía no puede pasar los ${BIO_MAX} caracteres.`);
      return;
    }

    setSaving(true);
    const { error: saveError } = await saveProfile({
      username,
      display_name: displayName.trim() || username,
      bio: bio.trim() === '' ? null : bio.trim(),
    });
    setSaving(false);

    if (saveError) {
      setError(
        saveError.code === UNIQUE_VIOLATION
          ? `El usuario @${username} ya está en uso. Probá con otro.`
          : saveError.message,
      );
      return;
    }
    setSaved(true);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <AvatarUploader />

      <label className="block">
        <span className="block text-xs uppercase tracking-[0.2em] text-ink-muted mb-2 font-bold">
          Nombre de usuario
        </span>
        <div className="flex items-center gap-2">
          <span className="text-ink-muted font-display text-lg">@</span>
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setSaved(false);
            }}
            placeholder="manchax"
            className="flex-1 p-3 bg-app border border-rule rounded-2xl outline-none focus:border-accent font-medium"
            style={{ color: 'var(--ink)' }}
          />
        </div>
        <span className="block text-xs text-ink-muted mt-2">
          Es tu dirección pública: <span className="font-bold">/u/{username || '…'}</span>.
          Minúsculas, números y guion bajo (3–24).
        </span>
      </label>

      <label className="block">
        <span className="block text-xs uppercase tracking-[0.2em] text-ink-muted mb-2 font-bold">
          Nombre para mostrar
        </span>
        <input
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            setSaved(false);
          }}
          placeholder="Cómo te ven los demás"
          className="w-full p-3 bg-app border border-rule rounded-2xl outline-none focus:border-accent font-medium"
          style={{ color: 'var(--ink)' }}
        />
      </label>

      <label className="block">
        <span className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-ink-muted mb-2 font-bold">
          Biografía
          <span className={bio.length > BIO_MAX ? 'text-danger' : ''}>
            {bio.length}/{BIO_MAX}
          </span>
        </span>
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setSaved(false);
          }}
          rows={3}
          placeholder="Contá algo breve sobre vos o sobre qué estás estudiando."
          className="w-full p-3 bg-app border border-rule rounded-2xl outline-none focus:border-accent resize-none custom-scrollbar"
          style={{ color: 'var(--ink)' }}
        />
      </label>

      {error && (
        <p className="text-sm text-danger bg-danger-surface px-4 py-3 rounded-2xl border border-rule">
          {error}
        </p>
      )}

      {saved && !error && (
        <p className="text-sm text-accent-ink bg-accent-surface px-4 py-3 rounded-2xl border border-rule">
          Perfil actualizado.
        </p>
      )}

      <button
        type="submit"
        disabled={saving || !dirty}
        className="w-full bg-accent py-3 rounded-2xl font-bold shadow-paper disabled:opacity-50 transition-all"
        style={{ color: 'var(--surface)' }}
      >
        {saving ? 'Guardando…' : dirty ? 'Guardar perfil' : 'Sin cambios'}
      </button>
    </form>
  );
}
