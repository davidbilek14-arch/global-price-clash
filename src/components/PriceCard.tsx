import type { PriceItem } from '@/lib/types';
import { useCountUp } from '@/lib/useCountUp';

interface PriceCardProps {
  item: PriceItem;
  side: 'A' | 'B';
  revealed: boolean;
  correct?: boolean;
  guess?: 'higher' | 'lower' | null;
}

function formatPrice(value: number): string {
  if (value >= 1000) {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }
  const decimals = value < 10 ? 2 : value < 100 ? 2 : 0;
  return `$${value.toFixed(decimals)}`;
}

export function PriceCard({ item, side, revealed, correct, guess }: PriceCardProps) {
  const animated = useCountUp(item.price, 900, revealed);
  const isHidden = side === 'B' && !revealed;

  const sideLabel = side === 'A' ? 'CARD A' : 'CARD B';
  const sideColor = side === 'A' ? 'text-sky-400' : 'text-amber-400';

  // Reveal feedback border
  const borderTone = revealed && side === 'B'
    ? correct
      ? 'border-emerald-500/70 shadow-emerald-500/20'
      : 'border-rose-500/70 shadow-rose-500/20'
    : 'border-white/10';

  return (
    <div
      className={`relative flex flex-col items-center rounded-3xl border-2 ${borderTone} bg-slate-900/70 backdrop-blur p-6 sm:p-8 transition-all duration-500 ${
        revealed && side === 'B' ? 'shadow-2xl' : ''
      }`}
    >
      <span className={`text-xs font-bold tracking-widest ${sideColor}`}>{sideLabel}</span>

      <div className="mt-4 text-6xl sm:text-7xl select-none" aria-hidden>
        {item.emoji}
      </div>

      <h3 className="mt-4 text-lg sm:text-xl font-semibold text-white text-center leading-tight">
        {item.name}
      </h3>

      <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
        <span className="text-base">{item.countryCode === 'UK' ? '🇬🇧' : flagEmoji(item.countryCode)}</span>
        <span>{item.country}</span>
      </div>

      {/* Price area */}
      <div className="mt-6 w-full">
        {isHidden ? (
          <div className="flex flex-col items-center justify-center h-20">
            <div className="text-3xl font-black text-slate-600 tracking-widest select-none">
              ??.??
            </div>
            <div className="mt-1 text-xs text-slate-500">{item.unit}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-20">
            <div
              className={`text-3xl sm:text-4xl font-black transition-colors duration-300 ${
                revealed && side === 'B'
                  ? correct
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                  : 'text-white'
              }`}
            >
              {formatPrice(animated)}
            </div>
            <div className="mt-1 text-xs text-slate-500">{item.unit}</div>
          </div>
        )}
      </div>

      {revealed && side === 'B' && guess && (
        <div
          className={`mt-3 text-sm font-semibold ${
            correct ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {correct ? 'Correct!' : 'Wrong!'} You guessed {guess.toUpperCase()}
        </div>
      )}
    </div>
  );
}

function flagEmoji(countryCode: string): string {
  if (countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}
