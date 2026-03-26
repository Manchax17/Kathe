import React, { useState, useEffect, useCallback } from 'react';

export default function StudyMode({ currentDeck, onExit }) {
  const [sessionQueue, setSessionQueue] = useState(Object.entries(currentDeck.words || {}));
  const [totalInitial] = useState(Object.entries(currentDeck.words || {}).length);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [failCounts, setFailCounts] = useState({});
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [wordsSeen, setWordsSeen] = useState(new Set());
  const currentPair = sessionQueue[currentIndex];
  const handleAnswer = useCallback((isCorrect) => {
    if (!isFlipped) return;

    const wordKey = currentPair[0];
    setIsFlipped(false);
    
    setTimeout(() => {
      if (isCorrect) {
        setScore(prev => prev + 1);
        if (!wordsSeen.has(wordKey)) setFirstTryCorrect(prev => prev + 1);

        const newQueue = [...sessionQueue];
        newQueue.splice(currentIndex, 1);
        
        if (newQueue.length === 0) {
          setFinished(true);
        } else {
          setSessionQueue(newQueue);
          if (currentIndex >= newQueue.length) setCurrentIndex(0);
        }
      } else {
        setScore(prev => prev - 1);
        setFailCounts(prev => ({ ...prev, [wordKey]: (prev[wordKey] || 0) + 1 }));

        const newQueue = [...sessionQueue];
        const [failedWord] = newQueue.splice(currentIndex, 1);
        const randomPos = Math.floor(Math.random() * (newQueue.length)) + 1;
        newQueue.splice(randomPos, 0, failedWord);
        setSessionQueue(newQueue);
      }
      setWordsSeen(prev => new Set(prev).add(wordKey));
    }, 300);
  }, [isFlipped, currentIndex, sessionQueue, currentPair, wordsSeen]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === '1') {
        handleAnswer(false);
      } 
      else if (event.key === '2') {
        handleAnswer(true);
      }
      else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault(); 
        setIsFlipped(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnswer]); 
  const formatContent = (text) => {
    if (!text) return "";
    return text.replaceAll('<br>', '\n').replaceAll('<br />', '\n').replaceAll('&nbsp;', ' ').replaceAll('<div>', '\n').replaceAll('</div>', '');
  };

  if (finished) {
    const percentageFirstTry = ((firstTryCorrect / totalInitial) * 100).toFixed(0);
    const mostFailed = Object.entries(failCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
      <div className="flex flex-col items-center max-w-2xl mx-auto p-6 bg-white rounded-[3rem] shadow-xl my-10 border border-slate-100 font-sans">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Sesión Terminada</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full mb-10">
          <div className="bg-blue-50 p-6 rounded-[2rem] text-center border border-blue-100">
            <p className="text-3xl font-black text-blue-600">{percentageFirstTry}%</p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Dominio a la primera</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100">
            <p className="text-3xl font-black text-slate-700">{score}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Puntos Totales</p>
          </div>
        </div>
        {mostFailed.length > 0 && (
          <div className="w-full mb-10">
            <h3 className="text-xs font-black text-red-400 uppercase tracking-[0.2em] mb-4 px-2">Repasar estos conceptos:</h3>
            <div className="space-y-2">
              {mostFailed.map(([word, count]) => (
                <div key={word} className="flex justify-between items-center bg-red-50 p-4 rounded-2xl border border-red-100">
                  <span className="font-bold text-slate-700 text-sm truncate max-w-[80%]">{word}</span>
                  <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-lg font-black">{count} {count === 1 ? 'ERROR' : 'ERRORES'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onExit} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-tighter hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200">
          Volver a mis Mazos
        </button>
      </div>
    );
  }

  if (!currentPair) return null;

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-8 px-6">
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
          {totalInitial - sessionQueue.length} / {totalInitial} completas
        </div>
        <div className={`font-black text-sm ${score >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          PTS: {score}
        </div>
      </div>

      <div className="h-[480px] w-full [perspective:1200px] cursor-pointer mb-10" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`relative h-full w-full rounded-[3rem] shadow-2xl transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
          <div className="absolute inset-0 h-full w-full rounded-[3rem] bg-white p-10 flex flex-col [backface-visibility:hidden] border-4 border-slate-50">
             <div className="flex-1 flex items-center justify-center">
                <h2 className="text-3xl font-bold text-slate-800 text-center whitespace-pre-wrap">{formatContent(currentPair[0])}</h2>
             </div>
          </div>
          <div className="absolute inset-0 h-full w-full rounded-[3rem] bg-blue-600 p-10 flex flex-col [backface-visibility:hidden] [transform:rotateY(180deg)] text-white shadow-inner">
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
               <div className="text-lg leading-relaxed whitespace-pre-wrap font-medium">
                  {formatContent(currentPair[1])}
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        <button 
          onClick={() => handleAnswer(false)}
          className="group bg-white border-2 border-red-500 text-red-500 py-6 rounded-[2rem] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all shadow-lg flex flex-col items-center"
        >
          <span>Incorrecto</span>
          <span className="text-[10px] opacity-50 group-hover:opacity-100 mt-1">Tecla [1]</span>
        </button>
        <button 
          onClick={() => handleAnswer(true)}
          className="group bg-green-500 text-white py-6 rounded-[2rem] font-black uppercase tracking-tighter hover:bg-green-600 transition-all shadow-lg shadow-green-100 flex flex-col items-center"
        >
          <span>Correcto</span>
          <span className="text-[10px] text-green-100 mt-1">Tecla [2]</span>
        </button>
      </div>

      {!isFlipped && (
        <p className="text-center text-slate-300 font-black uppercase text-[10px] tracking-[0.3em] animate-pulse">
          Presiona Espacio o toca para revelar
        </p>
      )}
    </div>
  );
}