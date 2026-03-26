import { supabase } from '../supabaseClient';

export default function FlashcardView({ 
  currentDeck, setCurrentDeck, currentIndex, setCurrentIndex, 
  isFlipped, setIsFlipped, isAddingWord, setIsAddingWord, 
  newWordKey, setNewWordKey, newWordValue, setNewWordValue, 
  handleAddWord, setDecks, decks, onStartStudy 
}) {
  
  const wordsArray = Object.entries(currentDeck.words || {});
  const currentPair = wordsArray[currentIndex];

  const handleDeleteWord = async () => {
    if (!currentPair) return;
    const wordKey = currentPair[0];
    const confirmed = window.confirm(`¿Eliminar la palabra "${wordKey}"?`);
    if (!confirmed) return;

    try {
      const updatedWords = { ...currentDeck.words };
      delete updatedWords[wordKey];

      const { data, error } = await supabase
        .from('decks')
        .update({ words: updatedWords })
        .eq('id', currentDeck.id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const newDeck = data[0];
        const newArray = Object.entries(newDeck.words || {});
        setIsFlipped(false);
        if (newArray.length > 0 && currentIndex >= newArray.length) {
          setCurrentIndex(newArray.length - 1);
        } else if (newArray.length === 0) {
          setCurrentIndex(0);
        }
        setCurrentDeck(newDeck);
        setDecks(decks.map(d => d.id === currentDeck.id ? newDeck : d));
      }
    } catch (err) {
      alert("No se pudo borrar la palabra.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center p-4">
      <header className="w-full max-w-5xl flex justify-between items-center py-6">
        <button 
          onClick={() => {setCurrentDeck(null); setIsFlipped(false);}} 
          className="text-blue-600 font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-2 rounded-xl transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
          Mazos
        </button>

        <h1 className="text-xl font-black uppercase tracking-tighter">{currentDeck.name}</h1>

        <div className="flex gap-2">
          <button 
            onClick={onStartStudy}
            className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
          >
            <span className="text-[10px]">▶</span> ESTUDIAR
          </button>

          <button 
            onClick={() => setIsAddingWord(true)} 
            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition-all"
          >
            + Palabra
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
        {wordsArray.length > 0 ? (
          <div className="w-full">
            <div className="flex justify-end mb-4">
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteWord(); }} 
                className="text-red-400 hover:text-red-600 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Borrar Palabra
              </button>
            </div>

            <div className="h-[500px] w-full [perspective:1200px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
              <div className={`relative h-full w-full rounded-[3rem] shadow-2xl transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
                
                <div className="absolute inset-0 h-full w-full rounded-[3rem] bg-white p-10 flex flex-col [backface-visibility:hidden] border border-slate-100 overflow-hidden">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 opacity-40 text-center">Pregunta</span>
                  <div className="flex-1 flex items-center justify-center">
                    <h2 className="text-3xl font-bold text-slate-800 text-center">{currentPair[0]}</h2>
                  </div>
                </div>

                <div className="absolute inset-0 h-full w-full rounded-[3rem] bg-blue-600 p-10 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)] text-white overflow-hidden">
                  <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4 opacity-40 text-center">Respuesta</span>
                  
                  <div 
                    className="flex-1 overflow-y-auto pr-2 custom-scrollbar text-left"
                    onClick={(e) => e.stopPropagation()} 
                  >
                    <div className="text-lg leading-relaxed whitespace-pre-wrap font-medium">
                      {currentPair[1]
                        .replaceAll('<br>', '\n')
                        .replaceAll('<br />', '\n')
                        .replaceAll('&nbsp;', ' ')
                        .replaceAll('<div>', '\n')
                        .replaceAll('</div>', '')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between w-full px-6 font-bold text-slate-400">
              <button disabled={currentIndex === 0} onClick={() => {setCurrentIndex(currentIndex - 1); setIsFlipped(false);}} className="hover:text-blue-600 disabled:opacity-0 transition-all">← ANTERIOR</button>
              <span className="text-xs tracking-[0.4em] uppercase">{currentIndex + 1} / {wordsArray.length}</span>
              <button disabled={currentIndex === wordsArray.length - 1} onClick={() => {setCurrentIndex(currentIndex + 1); setIsFlipped(false);}} className="hover:text-blue-600 disabled:opacity-0 transition-all">SIGUIENTE →</button>
            </div>
          </div>
        ) : (
          <div className="text-center p-20 border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/50 w-full text-slate-400">
            <p>Mazo vacío</p>
          </div>
        )}
      </main>
    </div>
  );
}