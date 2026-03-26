import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import DeckList from './components/DeckList';
import FlashcardView from './components/FlashCardView';
import FileImporter from './components/FileImporter';
import StudyMode from './components/StudyMode'; // Importamos el nuevo componente

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [isStudying, setIsStudying] = useState(false); // <--- ESTADO NUEVO
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWordKey, setNewWordKey] = useState('');
  const [newWordValue, setNewWordValue] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  useEffect(() => {
    if (user) fetchDecks();
  }, [user]);

  const fetchDecks = async () => {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setDecks(data);
  };

  const handleAuth = async (type) => {
    if (!email || !password) return setMessage({ text: 'Completa todos los campos', type: 'error' });
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage({ text: error.message, type: 'error' });
    } else {
      setUser(data.user);
      setMessage({ text: '', type: '' });
    }
  };

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    const { data, error } = await supabase.from('decks').insert([{ name: newDeckName, user_id: user.id, words: {} }]).select();
    if (error) alert(error.message);
    else {
      setDecks([data[0], ...decks]);
      setNewDeckName('');
      setIsCreatingDeck(false);
    }
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!newWordKey.trim() || !newWordValue.trim()) return;
    const updatedWords = { ...currentDeck.words, [newWordKey]: newWordValue };
    const { data, error } = await supabase.from('decks').update({ words: updatedWords }).eq('id', currentDeck.id).select();
    if (error) alert(error.message);
    else {
      setCurrentDeck(data[0]);
      setDecks(decks.map(d => d.id === currentDeck.id ? data[0] : d));
      setNewWordKey(''); setNewWordValue(''); setIsAddingWord(false);
    }
  };

  // 1. Pantalla de Autenticación
  if (!user) {
    return <Auth email={email} setEmail={setEmail} password={password} setPassword={setPassword} handleAuth={handleAuth} message={message} />;
  }

  // 2. Pantalla de Selección de Mazos
  if (!currentDeck) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-10">
            <FileImporter decks={decks} setDecks={setDecks} userId={user.id} />
          </div>

          <DeckList 
            decks={decks} 
            isCreatingDeck={isCreatingDeck} 
            setIsCreatingDeck={setIsCreatingDeck} 
            newDeckName={newDeckName} 
            setNewDeckName={setNewDeckName} 
            handleCreateDeck={handleCreateDeck} 
            setCurrentDeck={setCurrentDeck} 
            setCurrentIndex={setCurrentIndex} 
            setIsFlipped={setIsFlipped} 
            signOut={() => supabase.auth.signOut().then(() => setUser(null))} 
          />
        </div>
      </div>
    );
  }

  // 3. MODO ESTUDIO (Si está activo)
  if (isStudying) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4">
        <StudyMode 
          currentDeck={currentDeck} 
          onExit={() => setIsStudying(false)} 
        />
      </div>
    );
  }

  // 4. VISTA NORMAL / EDICIÓN
  return (
    <FlashcardView 
      currentDeck={currentDeck} setCurrentDeck={setCurrentDeck} 
      currentIndex={currentIndex} setCurrentIndex={setCurrentIndex} 
      isFlipped={isFlipped} setIsFlipped={setIsFlipped} 
      isAddingWord={isAddingWord} setIsAddingWord={setIsAddingWord} 
      newWordKey={newWordKey} setNewWordKey={setNewWordKey} 
      newWordValue={newWordValue} setNewWordValue={setNewWordValue} 
      handleAddWord={handleAddWord} 
      setDecks={setDecks}
      decks={decks}
      onStartStudy={() => setIsStudying(true)} // <--- PASAMOS LA FUNCIÓN
    />
  );
}

export default App;