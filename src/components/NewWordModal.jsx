export default function NewWordModal({
  open,
  onClose,
  newWordKey,
  setNewWordKey,
  newWordValue,
  setNewWordValue,
  handleAddWord,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade-in"
      style={{ backgroundColor: 'rgba(31, 24, 16, 0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          handleAddWord(e);
        }}
        className="bg-surface-elevated border border-rule rounded-3xl w-full max-w-md p-8 shadow-paper anim-pop"
      >
        <h3 className="font-display text-3xl text-ink mb-2">Nueva palabra</h3>
        <p className="text-ink-muted text-sm mb-6">
          Agregá una pareja al mazo. En la respuesta podés usar{' '}
          <code className="font-mono">&lt;br&gt;</code> para saltos de línea.
        </p>

        <label className="block text-xs uppercase tracking-[0.2em] font-bold text-ink-muted mb-2">
          Pregunta
        </label>
        <input
          autoFocus
          value={newWordKey}
          onChange={(e) => setNewWordKey(e.target.value)}
          placeholder="Ej: perro"
          className="w-full p-4 bg-app border border-rule rounded-2xl outline-none focus:border-accent font-display text-lg mb-4"
          style={{ color: 'var(--ink)' }}
        />

        <label className="block text-xs uppercase tracking-[0.2em] font-bold text-ink-muted mb-2">
          Respuesta
        </label>
        <textarea
          value={newWordValue}
          onChange={(e) => setNewWordValue(e.target.value)}
          placeholder="Ej: dog"
          rows={3}
          className="w-full p-4 bg-app border border-rule rounded-2xl outline-none focus:border-accent font-display text-lg mb-6 resize-none custom-scrollbar"
          style={{ color: 'var(--ink)' }}
        />

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-accent py-3 rounded-2xl font-bold shadow-paper hover:shadow-paper-hover transition-all"
            style={{ color: 'var(--on-accent)' }}
          >
            Agregar palabra
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-app py-3 rounded-2xl font-bold text-ink-soft hover:bg-surface transition-all"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
