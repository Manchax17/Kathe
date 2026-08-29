const KEY = 'kathe:stats';

function defaultStats() {
  return {
    sessionsCompleted: 0,
    cardsMastered: 0,
    totalAnswered: 0,
    streak: 0,
    lastSessionDate: null,
  };
}

function readStats() {
  if (typeof window === 'undefined') return defaultStats();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw);
    return { ...defaultStats(), ...parsed };
  } catch {
    return defaultStats();
  }
}

export function getStats() {
  return readStats();
}

export function recordSession({ cardsAnswered, firstTryCorrect }) {
  const current = readStats();
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = current.lastSessionDate;
  let streak = current.streak ?? 0;
  if (lastDate !== today && lastDate) {
    const prev = new Date(lastDate);
    const now = new Date(today);
    const diffDays = Math.round((now - prev) / (1000 * 60 * 60 * 24));
    streak = diffDays === 1 ? streak + 1 : 1;
  } else if (!lastDate) {
    streak = 1;
  }

  const next = {
    ...current,
    sessionsCompleted: current.sessionsCompleted + 1,
    cardsMastered: current.cardsMastered + firstTryCorrect,
    totalAnswered: current.totalAnswered + cardsAnswered,
    streak,
    lastSessionDate: today,
  };

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // sin almacenamiento, ignorar
  }
  return next;
}

export function resetStats() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // sin almacenamiento, ignorar
  }
  return defaultStats();
}
