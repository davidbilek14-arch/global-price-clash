import { useCallback, useMemo, useState } from 'react';
import { Coffee, Globe } from 'lucide-react';
import type { GamePhase } from '@/lib/types';
import { getDailyComparisons, getDayKey } from '@/lib/daily';
import { useStreak } from '@/lib/useStreak';
import { submitScore } from '@/lib/leaderboard';
import type { CountryChoice } from '@/lib/countries';
import { StartScreen } from '@/components/StartScreen';
import { GameBoard } from '@/components/GameBoard';
import { EndScreen } from '@/components/EndScreen';

const TOTAL_ROUNDS = 5;

export default function App() {
  const [phase, setPhase] = useState<GamePhase>('start');
  const [round, setRound] = useState(0);
  const [guess, setGuess] = useState<'higher' | 'lower' | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const streakHook = useStreak();

  const comparisons = useMemo(() => getDailyComparisons(new Date(), TOTAL_ROUNDS), []);
  const dayKey = useMemo(() => getDayKey(), []);

  const current = comparisons[round];
  const revealed = phase === 'reveal';
  const correct = revealed && current
    ? guess === 'higher'
      ? current.b.price > current.a.price
      : current.b.price < current.a.price
    : null;

  const [country, setCountry] = useState<CountryChoice | null>(null);

  const handleStart = useCallback((chosen: CountryChoice) => {
    setCountry(chosen);
    setPhase('playing');
    setRound(0);
    setGuess(null);
    setResults([]);
  }, []);

  const handleGuess = useCallback(
    (g: 'higher' | 'lower') => {
      if (!current || phase !== 'playing') return;
      setGuess(g);
      const isCorrect = g === 'higher' ? current.b.price > current.a.price : current.b.price < current.a.price;
      setResults((prev) => [...prev, isCorrect]);
      setPhase('reveal');
    },
    [current, phase],
  );

  const handleNext = useCallback(() => {
    if (round + 1 >= TOTAL_ROUNDS) {
      // Finish: compute final score, record streak + submit to leaderboard.
      const finalScore = results.filter(Boolean).length;
      streakHook.recordResult(finalScore);
      if (country) {
        void submitScore(country.code, country.name, finalScore, TOTAL_ROUNDS, dayKey);
      }
      setPhase('end');
    } else {
      setRound((r) => r + 1);
      setGuess(null);
      setPhase('playing');
    }
  }, [round, results, streakHook, dayKey, country]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Ambient gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 shadow-lg shadow-sky-500/20">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <span className="font-black tracking-tight text-lg">
            World Price <span className="text-sky-400">Clash</span>
          </span>
        </div>
        {streakHook.streak > 0 && phase !== 'playing' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-sm">
            <span>🔥</span>
            <span className="font-bold text-orange-300">{streakHook.streak}</span>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
        {phase === 'start' && (
          <StartScreen
            streak={streakHook.streak}
            hasPlayedToday={streakHook.hasPlayedToday}
            todayScore={streakHook.todayScore}
            onStart={handleStart}
          />
        )}

        {(phase === 'playing' || phase === 'reveal') && current && (
          <GameBoard
            comparison={current}
            round={round + 1}
            totalRounds={TOTAL_ROUNDS}
            revealed={revealed}
            guess={guess}
            correct={correct}
            onGuess={handleGuess}
            onNext={handleNext}
          />
        )}

        {phase === 'end' && (
          <EndScreen
            comparisons={comparisons}
            results={results}
            streak={streakHook.streak}
            onRestart={() => country && handleStart(country)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
        <p className="text-xs text-slate-500">
          Prices are illustrative. New challenge every day.
        </p>
        <a
          href="https://www.buymeacoffee.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/20 transition-colors"
        >
          <Coffee className="h-4 w-4" />
          Buy Me a Coffee
        </a>
      </footer>
    </div>
  );
}
