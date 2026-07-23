import { useState } from 'react';
import { Flame, Globe, Play, Trophy } from 'lucide-react';
import { COUNTRIES, getStoredCountry, setStoredCountry, type CountryChoice } from '@/lib/countries';

interface StartScreenProps {
  streak: number;
  hasPlayedToday: boolean;
  todayScore: number | null;
  onStart: (country: CountryChoice) => void;
}

function flagEmoji(code: string): string {
  if (code.length !== 2) return '🏳️';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function StartScreen({ streak, hasPlayedToday, todayScore, onStart }: StartScreenProps) {
  const [country, setCountry] = useState<CountryChoice | null>(() => getStoredCountry());

  const handleStart = () => {
    if (!country) return;
    setStoredCountry(country);
    onStart(country);
  };

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto animate-[fadeIn_0.5s_ease]">
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        Daily Challenge · 5 Rounds
      </div>

      <h1 className="mt-6 text-5xl sm:text-6xl font-black tracking-tight text-white">
        World Price
        <span className="block bg-gradient-to-r from-sky-400 via-cyan-300 to-amber-400 bg-clip-text text-transparent">
          Clash
        </span>
      </h1>

      <p className="mt-4 text-slate-400 text-base sm:text-lg leading-relaxed">
        Guess whether the hidden price is <span className="text-emerald-400 font-semibold">higher</span> or{' '}
        <span className="text-rose-400 font-semibold">lower</span> than the one you can see.
        Five absurd comparisons from around the globe, every day.
      </p>

      {streak > 0 && (
        <div className="mt-6 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/30">
          <Flame className="h-6 w-6 text-orange-400" />
          <div className="text-left">
            <div className="text-2xl font-black text-white leading-none">{streak}</div>
            <div className="text-xs text-orange-300/80 font-medium">day streak</div>
          </div>
        </div>
      )}

      {hasPlayedToday && todayScore !== null && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Trophy className="h-4 w-4 text-amber-400" />
          You scored {todayScore}/5 today. Play again to beat it!
        </div>
      )}

      {/* Country picker */}
      <div className="mt-8 w-full max-w-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
          <Globe className="h-4 w-4 text-sky-400" />
          Pick your country for the leaderboard
        </label>
        <div className="relative">
          <select
            value={country?.code ?? ''}
            onChange={(e) => {
              const choice = COUNTRIES.find((c) => c.code === e.target.value);
              if (choice) setCountry(choice);
            }}
            className="w-full appearance-none rounded-2xl bg-slate-900/80 border border-white/10 px-4 py-3.5 pr-10 text-white font-medium focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition-all cursor-pointer"
          >
            <option value="" disabled>Select your country…</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {flagEmoji(c.code)} {c.name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
            ▾
          </span>
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!country}
        className="mt-6 group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-lg shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Play className="h-5 w-5 fill-white" />
        {hasPlayedToday ? 'Play Again' : 'Start Playing'}
      </button>

      <div className="mt-10 grid grid-cols-3 gap-3 w-full max-w-sm text-left">
        <Feature emoji="🌍" label="Real prices" />
        <Feature emoji="⚡" label="5 rounds" />
        <Feature emoji="🏆" label="Country ranks" />
      </div>
    </div>
  );
}

function Feature({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/5 border border-white/10">
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}
