import Logo from './Logo';

export default function Auth({
  email,
  setEmail,
  password,
  setPassword,
  username,
  setUsername,
  handleAuth,
  message,
}) {
  return (
    <div className="min-h-screen bg-app grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8 lg:p-16 anim-fade-in">
        <div className="w-full max-w-sm">
          <Logo size={32} className="mb-10" />
          <h1 className="font-display text-4xl text-ink leading-tight">
            Tu cuaderno de <span className="italic text-accent">palabras</span>
          </h1>
          <p className="text-ink-muted mt-3 font-display-italic text-lg">
            Memorá con calma. Estudio tras estudio.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAuth('login');
            }}
            className="mt-10 space-y-4"
          >
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-surface border border-rule rounded-2xl outline-none focus:border-accent font-medium"
              style={{ color: 'var(--ink)' }}
            />

            <div>
              <input
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 bg-surface border border-rule rounded-2xl outline-none focus:border-accent font-medium"
                style={{ color: 'var(--ink)' }}
              />
              <p className="text-xs text-ink-muted mt-2 px-1">
                Solo al crear cuenta. Así te encuentran los demás:{' '}
                <span className="font-bold">
                  @{(username || 'usuario').toLowerCase().replace(/[^a-z0-9_]/g, '')}
                </span>
              </p>
            </div>

            <input
              type="password"
              required
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-surface border border-rule rounded-2xl outline-none focus:border-accent font-medium"
              style={{ color: 'var(--ink)' }}
            />

            {message.text && (
              <div
                className={`p-4 rounded-2xl text-sm font-medium border ${
                  message.type === 'error'
                    ? 'bg-danger-surface text-danger border-rule'
                    : 'bg-accent-surface text-accent-ink border-rule'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-accent py-4 rounded-2xl font-bold shadow-paper hover:shadow-paper-hover transition-all"
              style={{ color: 'var(--on-accent)' }}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => handleAuth('register')}
              className="w-full bg-surface border border-rule py-4 rounded-2xl font-bold text-ink-soft hover:bg-app transition-all"
            >
              Crear cuenta
            </button>
          </form>
        </div>
      </div>

      <aside className="hidden md:flex relative bg-surface border-l border-rule items-center justify-center p-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, var(--accent-soft) 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--accent-soft) 0%, transparent 35%)',
          }}
        />
        <div className="relative max-w-md text-center anim-fade-in">
          <div className="font-display-italic text-2xl text-ink-soft leading-relaxed">
            "Una palabra al día, repetida con cariño, se queda para siempre."
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.3em] text-ink-muted">
            Kathe · Cuaderno digital
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            <span className="px-3 py-1 rounded-full border border-rule">Repaso espaciado</span>
            <span className="px-3 py-1 rounded-full border border-rule">Mazos públicos</span>
            <span className="px-3 py-1 rounded-full border border-rule">Chat</span>
            <span className="px-3 py-1 rounded-full border border-rule">Modo oscuro</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
