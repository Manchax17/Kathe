import { useState } from 'react';
import { initialsOf } from '../utils/username';

/**
 * Avatar circular. Muestra la imagen de `profile.avatar_url` y, si no hay
 * (o falla la carga), cae a las iniciales con la misma paleta de la app.
 */
export default function Avatar({ profile, size = 40, className = '' }) {
  const [failed, setFailed] = useState(false);

  const label = profile?.display_name || profile?.username || '';
  const initials = initialsOf(label);
  const showImage = Boolean(profile?.avatar_url) && !failed;

  const box = { width: size, height: size };
  const shell = `shrink-0 rounded-full border border-rule ${className}`;

  if (showImage) {
    return (
      <img
        src={profile.avatar_url}
        alt={label || 'Avatar'}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${shell} object-cover bg-surface`}
        style={box}
      />
    );
  }

  return (
    <span
      className={`${shell} bg-accent-surface text-accent-ink inline-flex items-center justify-center font-display font-bold select-none`}
      style={{ ...box, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
