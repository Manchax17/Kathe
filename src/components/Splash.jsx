export default function Splash({ label = 'Cargando…' }) {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center text-ink-muted font-display text-lg">
      {label}
    </div>
  );
}
