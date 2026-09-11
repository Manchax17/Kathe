import { Link } from 'react-router';
import Avatar from './Avatar';

/** Tarjeta de resultado en Explorar: avatar, @usuario y cuántos mazos públicos tiene. */
export default function UserCard({ profile, publicDeckCount = 0 }) {
  return (
    <Link
      to={`/u/${profile.username}`}
      className="flex items-center gap-4 bg-surface-elevated border border-rule rounded-3xl p-5 shadow-paper hover:shadow-paper-hover transition-all anim-fade-in"
    >
      <Avatar profile={profile} size={48} />

      <div className="min-w-0 flex-1">
        <p className="font-display text-lg text-ink truncate">
          {profile.display_name || profile.username}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-accent truncate">
          @{profile.username}
        </p>
        {profile.bio && (
          <p className="text-sm text-ink-muted mt-1 line-clamp-2">{profile.bio}</p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="font-display text-xl text-ink">{publicDeckCount}</p>
        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-ink-muted">
          {publicDeckCount === 1 ? 'mazo' : 'mazos'}
        </p>
      </div>
    </Link>
  );
}
