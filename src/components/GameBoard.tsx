import { ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';
import type { Comparison } from '@/lib/types';
import { PriceCard } from './PriceCard';

interface GameBoardProps {
  comparison: Comparison;
  round: number;
  totalRounds: number;
  revealed: boolean;
  guess: 'higher' | 'lower' | null;
  correct: boolean | null;
  onGuess: (g: 'higher' | 'lower') => void;
  onNext: () => void;
}

export function GameBoard({
  comparison,
  round,
  totalRounds,
  revealed,
  guess,
  correct,
  onGuess,
  onNext,
}: GameBoardProps) {
  const { a, b } = comparison;

  return (
    <div className="w-full max-w-4xl mx-auto animate-[fadeIn_0.4s_ease]">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-semibold text-slate-400">
          Round {round} / {totalRounds}
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                i < round - 1
                  ? 'bg-emerald-500'
                  : i === round - 1
                    ? 'bg-sky-500'
                    : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <PriceCard item={a} side="A" revealed />
        <PriceCard item={b} side="B" revealed={revealed} correct={correct ?? undefined} guess={guess} />
      </div>

      {/* VS divider hint */}
      <p className="mt-4 text-center text-sm text-slate-500">
        Is Card B's price <span className="text-white font-semibold">higher</span> or{' '}
        <span className="text-white font-semibold">lower</span> than Card A's?
      </p>

      {/* Controls */}
      {!revealed ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
          <button
            onClick={() => onGuess('higher')}
            className="group flex flex-col items-center gap-1 py-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 font-bold text-lg hover:bg-emerald-500/20 hover:border-emerald-400 active:scale-95 transition-all"
          >
            <ArrowUp className="h-7 w-7 group-hover:-translate-y-0.5 transition-transform" />
            HIGHER
          </button>
          <button
            onClick={() => onGuess('lower')}
            className="group flex flex-col items-center gap-1 py-5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-400 font-bold text-lg hover:bg-rose-500/20 hover:border-rose-400 active:scale-95 transition-all"
          >
            <ArrowDown className="h-7 w-7 group-hover:translate-y-0.5 transition-transform" />
            LOWER
          </button>
        </div>
      ) : (
        <div className="mt-6 max-w-md mx-auto">
          {/* Commentary / fact */}
          <div
            className={`rounded-2xl p-4 border text-center text-sm leading-relaxed ${
              correct
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-100'
            }`}
          >
            {b.fact}
          </div>
          <button
            onClick={onNext}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-white text-slate-900 font-bold text-base hover:bg-slate-100 active:scale-95 transition-all"
          >
            {round >= totalRounds ? 'See Results' : 'Next Round'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
