import { useSyncExternalStore } from 'react';
import { getStatsSnapshot, subscribeStats } from '../utils/stats';

/** Estadísticas de estudio reactivas: se actualizan al terminar cada sesión. */
export function useStats() {
  return useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsSnapshot);
}
