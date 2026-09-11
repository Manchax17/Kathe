export default function Logo({ size = 28, className = '' }) {
  return (
    <span
      className={`font-display inline-flex items-center gap-2 ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      <span
        className="inline-flex items-center justify-center rounded-xl bg-accent"
        style={{
          width: size * 1.3,
          height: size * 1.3,
          color: 'var(--on-accent)',
        }}
        aria-hidden
      >
        <span style={{ fontWeight: 700, fontSize: size * 0.95 }}>K</span>
      </span>
      <span className="tracking-tight">kathe</span>
    </span>
  );
}
