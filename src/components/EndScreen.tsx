import { useEffect, useState } from 'react';
import { Check, Copy, Coffee, Flame, RefreshCw, Trophy } from 'lucide-react';
import type { Comparison, LeaderboardEntry } from '@/lib/types';
import { fetchLeaderboard } from '@/lib/leaderboard';
import { getDayKey } from '@/lib/daily';

interface EndScreenProps {
  comparisons: Comparison[];
  results: boolean[];
  streak: number;
  onRestart: () => void;
}

function flagEmoji(code: string): string {
  if (code.length !== 2) return '🏳️';
  return String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

function buildShareText(results: boolean[], streak: number): string {
  const boxes = results.map((r) => (r ? '🟢' : '🔴')).join('');
  const score = results.filter(Boolean).length;
  return `World Price Clash\n${boxes}\n${score}/5 · 🔥 ${streak} day streak\nCan you beat me?`;
}

export function EndScreen({ comparisons, results, streak, onRestart }: EndScreenProps) {
  const score = results.filter(Boolean).length;
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard(getDayKey()).then((entries) => {
      if (!cancelled) {
        setLeaderboard(entries);
        setLoadingLb(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const shareText = buildShareText(results, streak);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text via a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    }
  };

  const verdict =
    score === 5 ? 'Flawless! Price whisperer!' :
    score === 4 ? 'Almost perfect!' :
    score === 3 ? 'Not bad — half right.' :
    score === 2 ? 'Tough round.' :
    score === 1 ? 'Ouch — rough day.' :
    'Total wipeout! Better luck tomorrow.';

  return (
    <div className="w-full max-w-2xl mx-auto animate-[fadeIn_0.5s_ease] flex flex-col items-center">
      {/* Score summary */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          Final Score
        </div>
        <div className="mt-4 flex items-end justify-center gap-2">
          <span className="text-7xl font-black text-white">{score}</span>
          <span className="text-3xl font-bold text-slate-500 mb-2">/ {comparisons.length}</span>
        </div>
        <p className="mt-2 text-slate-400">{verdict}</p>

        <div className="mt-4 flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/30">
          <Flame className="h-5 w-5 text-orange-400" />
          <span className="text-lg font-black text-white leading-none">{streak}</span>
          <span className="text-xs text-orange-300/80 font-medium">day streak</span>
        </div>
      </div>

      {/* Round recap */}
      <div className="mt-8 w-full grid grid-cols-5 gap-2">
        {results.map((r, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-1 py-3 rounded-xl border ${
              r
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-rose-500/10 border-rose-500/30'
            }`}
          >
            <span className="text-xs text-slate-400 font-medium">R{i + 1}</span>
            <span className={`text-lg ${r ? 'text-emerald-400' : 'text-rose-400'}`}>
              {r ? '🟢' : '🔴'}
            </span>
          </div>
        ))}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="mt-6 w-full max-w-sm inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold shadow-lg shadow-sky-500/30 hover:scale-[1.02] active:scale-95 transition-all"
      >
        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        {copied ? 'Copied to clipboard!' : 'Share Result'}
      </button>

      {/* Country leaderboard */}
      <div className="mt-10 w-full">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          🌍 Country Leaderboard
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Today's national averages — who's got the sharpest price instincts?
        </p>

        <div className="mt-4 space-y-2">
          {loadingLb ? (
            <div className="py-8 text-center text-slate-500 text-sm">Loading country stats…</div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm rounded-2xl bg-white/5 border border-white/10">
              No country data yet. Be the first to put your nation on the board!
            </div>
          ) : (
            leaderboard.slice(0, 8).map((entry, i) => (
              <div
                key={entry.country_code}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  i === 0
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <span className="w-6 text-center font-bold text-slate-400">{i + 1}</span>
                <span className="text-2xl">{flagEmoji(entry.country_code)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{entry.country_name}</div>
                  <div className="text-xs text-slate-500">{entry.play_count} {entry.play_count === 1 ? 'play' : 'plays'}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{entry.win_rate.toFixed(0)}%</div>
                  <div className="text-xs text-slate-500">avg {entry.avg_score.toFixed(1)}/5</div>
                </div>
                {i === 0 && <Trophy className="h-4 w-4 text-amber-400" />}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        <button
          onClick={onRestart}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/10 border border-white/15 text-white font-semibold hover:bg-white/15 active:scale-95 transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Play Again
        </button>
        <a
          href="https://www.buymeacoffee.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-semibold hover:bg-amber-500/25 active:scale-95 transition-all"
        >
          <Coffee className="h-4 w-4" />
          Buy Me a Coffee
        </a>
      </div>
    </div>
  );
}
