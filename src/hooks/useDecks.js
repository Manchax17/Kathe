import { useContext } from 'react';
import { DecksContext } from '../context/decksContext';

export function useDecks() {
  const ctx = useContext(DecksContext);
  if (!ctx) {
    throw new Error('useDecks() debe usarse dentro de <DecksProvider>.');
  }
  return ctx;
}
