import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import DeckList from './components/DeckList';
import FlashcardView from './components/FlashCardView';
import FileImporter from './components/FileImporter';
import PdfImporter from './components/PdfImporter';
import StudyMode from './components/StudyMode';
import SettingsModal from './components/SettingsModal';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [isStudying, setIsStudying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [newWordKey, setNewWordKey] = useState('');
  const [newWordValue, setNewWordValue] = useState('');

  const fetchDecks = async () => {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setMessage({
        text: 'No se pudieron cargar tus mazos: ' + error.message,
        type: 'error',
      });
      return;
    }
    setDecks(data || []);
  };

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) fetchDecks();
      if (active) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchDecks();
      else setDecks([]);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (type) => {
    if (!email || !password) {
      return setMessage({ text: 'Completa todos los campos', type: 'error' });
    }
    const { data, error } =
      type === 'login'
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
    const { data, error } = await supabase
      .from('decks')
      .insert([{ name: newDeckName, user_id: user.id, words: {} }])
      .select();
    if (error) {
      alert(error.message);
      return;
    }
    setDecks((prev) => [data[0], ...prev]);
    setNewDeckName('');
    setIsCreatingDeck(false);
  };

  const handleAddWord = async (e) => {
    e.preventDefault();
    if (!newWordKey.trim() || !newWordValue.trim()) return;
    const updatedWords = { ...currentDeck.words, [newWordKey]: newWordValue };
    const { data, error } = await supabase
      .from('decks')
      .update({ words: updatedWords })
      .eq('id', currentDeck.id)
      .select();
    if (error) {
      alert(error.message);
      return;
    }
    setCurrentDeck(data[0]);
    setDecks((prev) => prev.map((d) => (d.id === currentDeck.id ? data[0] : d)));
    setNewWordKey('');
    setNewWordValue('');
    setIsAddingWord(false);
  };

  const updateStudyOrder = async (deckId, order) => {
    const { data, error } = await supabase
      .from('decks')
      .update({ study_order: order })
      .eq('id', deckId)
      .select();
    if (error) {
      alert('No se pudo actualizar el modo de estudio: ' + error.message);
      return;
    }
    if (data && data[0]) {
      const updated = data[0];
      setDecks((prev) => prev.map((d) => (d.id === deckId ? updated : d)));
      if (currentDeck && currentDeck.id === deckId) {
        setCurrentDeck(updated);
      }
    }
  };

  const handleRenameDeck = (updatedDeck) => {
    setDecks((prev) => prev.map((d) => (d.id === updatedDeck.id ? updatedDeck : d)));
    if (currentDeck && currentDeck.id === updatedDeck.id) {
      setCurrentDeck(updatedDeck);
    }
  };

  const handleDeleteDeck = (deckId) => {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    if (currentDeck && currentDeck.id === deckId) setCurrentDeck(null);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center text-ink-muted font-display text-lg">
        Cargando…
      </div>
    );
  }

  if (!user) {
    return (
      <Auth
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleAuth={handleAuth}
        message={message}
      />
    );
  }

  if (!currentDeck) {
    return (
      <>
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
          updateStudyOrder={updateStudyOrder}
          onRenameDeck={handleRenameDeck}
          onDeleteDeck={handleDeleteDeck}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="max-w-6xl mx-auto px-6 pb-16">
          <FileImporter decks={decks} userId={user.id} />
          <PdfImporter decks={decks} setDecks={setDecks} />
        </div>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          onStatsReset={() => fetchDecks()}
        />
      </>
    );
  }

  if (isStudying) {
    return <StudyMode currentDeck={currentDeck} onExit={() => setIsStudying(false)} />;
  }

  return (
    <FlashcardView
      currentDeck={currentDeck}
      setCurrentDeck={setCurrentDeck}
      currentIndex={currentIndex}
      setCurrentIndex={setCurrentIndex}
      isFlipped={isFlipped}
      setIsFlipped={setIsFlipped}
      isAddingWord={isAddingWord}
      setIsAddingWord={setIsAddingWord}
      newWordKey={newWordKey}
      setNewWordKey={setNewWordKey}
      newWordValue={newWordValue}
      setNewWordValue={setNewWordValue}
      handleAddWord={handleAddWord}
      setDecks={setDecks}
      decks={decks}
      onStartStudy={() => setIsStudying(true)}
    />
  );
}

export default App;
