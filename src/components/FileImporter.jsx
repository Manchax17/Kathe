import { supabase } from '../supabaseClient';

export default function FileImporter({ decks, setDecks, userId }) {
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // El nombre del mazo será el nombre del archivo sin la extensión .txt
    const deckNameFromFile = file.name.replace('.txt', '').trim();

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      
      const newWords = {};

      lines.forEach(line => {
        // Ignorar encabezados de Anki y líneas vacías
        if (line.startsWith('#') || !line.trim()) return;

        // Separar por tabulación (\t)
        const columns = line.split('\t'); 
        
        // Formato nuevo: Col 0 es Pregunta, Col 1 es Respuesta
        if (columns.length >= 2) {
          const question = columns[0].trim();  
          let answer = columns[1].trim();    

          // Limpieza de comillas dobles de Anki
          answer = answer.replace(/^"|"$/g, '').replaceAll('""', '"');

          if (question && answer) {
            newWords[question] = answer;
          }
        }
      });

      if (Object.keys(newWords).length === 0) {
        alert("No se detectaron datos válidos en el archivo.");
        return;
      }

      try {
        const existingDeck = decks.find(d => d.name === deckNameFromFile);

        if (existingDeck) {
          const updatedWords = { ...existingDeck.words, ...newWords };
          const { error } = await supabase
            .from('decks')
            .update({ words: updatedWords })
            .eq('id', existingDeck.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('decks')
            .insert([{ 
              name: deckNameFromFile, 
              words: newWords, 
              user_id: userId 
            }]);
          if (error) throw error;
        }

        alert(`Mazo "${deckNameFromFile}" sincronizado con éxito.`);
        window.location.reload(); 

      } catch (err) {
        console.error("Error:", err);
        alert("Fallo al guardar en base de datos.");
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-6 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 shadow-sm">
      <div className="text-center">
        <h3 className="font-black text-slate-800 uppercase tracking-tighter">Importador Clave-Valor</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Mazo destino: { "{Nombre del Archivo}" }
        </p>
      </div>
      
      <label className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all active:scale-95 text-sm">
        Seleccionar .txt
        <input 
          type="file" 
          accept=".txt" 
          className="hidden" 
          onChange={handleFileUpload} 
        />
      </label>
    </div>
  );
}