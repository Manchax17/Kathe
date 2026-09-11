import { Link, NavLink, Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import Avatar from './Avatar';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

const NAV = [
  { to: '/', label: 'Mazos', end: true },
  { to: '/explorar', label: 'Explorar' },
  { to: '/chat', label: 'Chat' },
];

function navClass({ isActive }) {
  return [
    'px-3 py-2 rounded-xl text-xs uppercase tracking-[0.2em] font-bold transition-all',
    isActive ? 'text-accent bg-accent-surface' : 'text-ink-muted hover:text-ink hover:bg-app',
  ].join(' ');
}

export default function AppShell() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-app flex flex-col">
      <header className="border-b border-rule bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-5 flex-wrap">
            <Link to="/" aria-label="Ir a mis mazos">
              <Logo size={24} />
            </Link>

            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              to="/ajustes"
              className="p-2.5 rounded-xl border border-rule text-ink-soft hover:bg-app transition-all"
              title="Ajustes y perfil"
              aria-label="Ajustes y perfil"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>

            <Link
              to={profile?.username ? `/u/${profile.username}` : '/ajustes'}
              title={profile?.username ? `Mi perfil: @${profile.username}` : 'Configurá tu perfil'}
              aria-label="Mi perfil"
              className="rounded-full hover:opacity-80 transition-all"
            >
              <Avatar profile={profile} size={32} />
            </Link>

            <button
              onClick={() => signOut()}
              className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted hover:text-danger px-3 py-2 rounded-xl transition-all"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
