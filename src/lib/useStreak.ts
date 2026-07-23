import { useCallback, useEffect, useState } from 'react';
import { getDayKey } from './daily';

const STREAK_KEY = 'wpc:streak';
const LAST_PLAY_KEY = 'wpc:lastPlayed';
const SCORE_KEY = 'wpc:lastScore';

interface StreakState {
  streak: number;
  lastPlayed: string | null;
  todayScore: number | null;
}

function readState(): StreakState {
  try {
    const streak = parseInt(localStorage.getItem(STREAK_KEY) ?? '0', 10) || 0;
    const lastPlayed = localStorage.getItem(LAST_PLAY_KEY);
    const todayScore = localStorage.getItem(SCORE_KEY)
      ? parseInt(localStorage.getItem(SCORE_KEY)!, 10)
      : null;
    return { streak, lastPlayed, todayScore };
  } catch {
    return { streak: 0, lastPlayed: null, todayScore: null };
  }
}

export function useStreak() {
  const [state, setState] = useState<StreakState>(() => readState());

  // Refresh on mount in case another tab updated it.
  useEffect(() => {
    const handler = () => setState(readState());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const recordResult = useCallback((score: number) => {
    const today = getDayKey();
    const current = readState();
    let newStreak = current.streak;

    if (current.lastPlayed === today) {
      // already played today — keep streak, just update score
    } else {
      const yesterday = getDayKey(new Date(Date.now() - 86400000));
      if (current.lastPlayed === yesterday) {
        newStreak = current.streak + 1;
      } else {
        newStreak = 1;
      }
    }

    try {
      localStorage.setItem(STREAK_KEY, String(newStreak));
      localStorage.setItem(LAST_PLAY_KEY, today);
      localStorage.setItem(SCORE_KEY, String(score));
    } catch {
      // ignore quota errors
    }
    setState({ streak: newStreak, lastPlayed: today, todayScore: score });
  }, []);

  const hasPlayedToday = state.lastPlayed === getDayKey();

  return { ...state, recordResult, hasPlayedToday };
}
