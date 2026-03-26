import { supabase } from '../supabaseClient';

export default function DeckList({ 
  decks, isCreatingDeck, setIsCreatingDeck, newDeckName, 
  setNewDeckName, handleCreateDeck, setCurrentDeck, 
  setCurrentIndex, setIsFlipped, signOut 
}) {

  const handleDeleteDeck = async (e, deckId, deckName) => {
    e.stopPropagation(); 
    
    const confirmed = window.confirm(`¿Seguro que quieres borrar el mazo "${deckName}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId);

      if (error) throw error;

      window.location.reload(); 
    } catch (err) {
      alert("Error al eliminar el mazo: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-3xl font-black tracking-tighter text-slate-900">MIS MAZOS</h1>
        <button onClick={signOut} className="text-slate-400 font-bold text-sm hover:text-red-500 transition-colors">CERRAR SESIÓN</button>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button 
          onClick={() => setIsCreatingDeck(true)}
          className="h-48 border-4 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
            <span className="text-2xl font-bold">+</span>
          </div>
          <span className="font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-widest text-xs">Nuevo Mazo</span>
        </button>

        {decks.map((deck) => (
          <div 
            key={deck.id}
            onClick={() => {
              setCurrentDeck(deck);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className="relative h-48 bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all group"
          >
            <button 
              onClick={(e) => handleDeleteDeck(e, deck.id, deck.name)}
              className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              title="Eliminar mazo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter truncate pr-8">{deck.name}</h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">
                {Object.keys(deck.words || {}).length} Palabras
              </p>
            </div>
            
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs tracking-widest uppercase">
              Estudiar ahora
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7-7 7" /></svg>
            </div>
          </div>
        ))}
      </main>

      {isCreatingDeck && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateDeck} className="bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-slate-800 tracking-tighter uppercase">Nombre del Mazo</h3>
            <input 
              autoFocus 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 mb-6" 
              placeholder="Ej: Verbos Irregulares" 
              value={newDeckName} 
              onChange={(e) => setNewDeckName(e.target.value)} 
            />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg">Crear</button>
              <button type="button" onClick={() => setIsCreatingDeck(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}