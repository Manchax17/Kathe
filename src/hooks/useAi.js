import { useContext } from 'react';
import { AiContext } from '../context/aiContext';

export function useAi() {
  const ctx = useContext(AiContext);
  if (!ctx) {
    throw new Error('useAi() debe usarse dentro de <AiProvider>.');
  }
  return ctx;
}
