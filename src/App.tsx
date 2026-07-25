import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Item {
  id: number;
  title: string;
  price: number;
  image_url?: string;
}

interface GamePair {
  itemA: Item;
  itemB: Item;
  correctAnswer: 'A' | 'B';
}

export default function App() {
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Auth & User state
  const [user, setUser] = useState<any>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [authSent, setAuthSent] = useState<boolean>(false);

  // Game states
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [dailyMode, setDailyMode] = useState<boolean>(false);
  const [rounds, setRounds] = useState<GamePair[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  
  // Round interactive states
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState<boolean>(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        // Check session
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        // Fetch items
        const { data, error } = await supabase.from('questions').select('*');
        if (error) throw error;
        if (!data || data.length < 2) {
          throw new Error('Not enough items in database for comparison (minimum 2).');
        }
        setAllItems(data);

        // Fetch leaderboard
        fetchLeaderboard();
      } catch (err: any) {
        setError(err.message || 'Initialization error.');
      } finally {
        setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('scores')
      .select('score, profiles(email)')
      .order('score', { ascending: false })
      .limit(5);
    if (data) setLeaderboard(data);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email: emailInput });
    if (!error) setAuthSent(true);
  }

  function getDailySeed(dateStr: string): number {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function generateRounds(isDaily: boolean): GamePair[] {
    const todayStr = new Date().toISOString().split('T')[0];
    let pool = [...allItems];

    if (isDaily) {
      let seed = getDailySeed(todayStr);
      pool.sort(() => {
        seed = (seed * 9301 + 49297) % 233280;
        return (seed / 233280) - 0.5;
      });
    } else {
      pool.sort(() => Math.random() - 0.5);
    }

    const generatedPairs: GamePair[] = [];
    const totalRoundsNeeded = 5;

    for (let i = 0; i < totalRoundsNeeded; i++) {
      const itemA = pool[(i * 2) % pool.length];
      let itemB = pool[(i * 2 + 1) % pool.length];

      if (itemA.id === itemB.id) {
        itemB = pool[(i * 2 + 2) % pool.length] || pool[0];
      }

      const correctAnswer: 'A' | 'B' = itemA.price >= itemB.price ? 'A' : 'B';
      generatedPairs.push({ itemA, itemB, correctAnswer });
    }

    return generatedPairs;
  }

  const startGame = (isDaily: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (isDaily) {
      const lastPlayedDate = localStorage.getItem('valuer_last_played_date');
      if (lastPlayedDate === todayStr) {
        setAlreadyPlayedToday(true);
      }
    }

    setDailyMode(isDaily);
    const newRounds = generateRounds(isDaily);
    setRounds(newRounds);
    setCurrentRoundIndex(0);
    setScore(0);
    setSelectedChoice(null);
    setIsRevealed(false);
    setGameOver(false);
    setGameStarted(true);
  };

  const handleChoice = (choice: 'A' | 'B') => {
    if (isRevealed || gameOver) return;

    setSelectedChoice(choice);
    setIsRevealed(true);

    const currentPair = rounds[currentRoundIndex];
    const isCorrect = choice === currentPair.correctAnswer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setTimeout(() => {
      if (currentRoundIndex + 1 < rounds.length) {
        setCurrentRoundIndex((prev) => prev + 1);
        setSelectedChoice(null);
        setIsRevealed(false);
      } else {
        setGameOver(true);
        if (dailyMode) {
          const todayStr = new Date().toISOString().split('T')[0];
          localStorage.setItem('valuer_last_played_date', todayStr);
        }
      }
    }, 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="text-xl animate-pulse text-emerald-400 font-medium">Loading Valuer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-red-950/50 border border-red-500/50 p-6 rounded-2xl max-w-md text-center shadow-2xl">
          <h2 className="text-lg font-bold mb-2 text-red-400">Error</h2>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  // --- HOME SCREEN ---
  if (!gameStarted) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-between p-4 md:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
        {/* Top bar with auth info */}
        <div className="w-full max-w-4xl flex justify-between items-center py-2">
          <h1 className="text-xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            VALUER
          </h1>
          <div>
            {user ? (
              <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                {user.email}
              </span>
            ) : (
              <span className="text-xs text-slate-500">Guest mode</span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-md w-full text-center space-y-6 my-auto">
          <h2 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            VALUER
          </h2>
          <p className="text-slate-400 text-sm">
            Compare items and commodities. Tap the one that costs more!
          </p>

          {alreadyPlayedToday && (
            <div className="bg-amber-950/40 border border-amber-600/40 text-amber-300 p-3 rounded-xl text-xs font-medium">
              You already completed today's daily challenge. You can play free mode!
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={() => startGame(true)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              📅 Daily Challenge
            </button>
            <button
              onClick={() => startGame(false)}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition border border-slate-800 active:scale-[0.98]"
            >
              🎮 Free Play
            </button>
          </div>

          {/* Auth section if not logged in */}
          {!user && !authSent && (
            <form onSubmit={handleLogin} className="pt-4 border-t border-slate-900 space-y-3">
              <p className="text-xs text-slate-400">Sign in to save your progress & leaderboard rank</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <button type="submit" className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl transition border border-slate-700">
                  Login
                </button>
              </div>
            </form>
          )}
          {authSent && (
            <div className="text-xs text-emerald-400 bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30">
              Check your email for the magic link login!
            </div>
          )}
        </div>

        {/* Footer / Leaderboard preview */}
        <div className="w-full max-w-md bg-slate-900/50 border border-slate-800/80 p-4 rounded-2xl text-left">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Top Players</h3>
          {leaderboard.length === 0 ? (
            <p className="text-xs text-slate-500">No scores yet.</p>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-300 py-1 border-b border-slate-800/50 last:border-0">
                  <span>{entry.profiles?.email || 'Anonymous'}</span>
                  <span className="font-bold text-emerald-400">{entry.score} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- GAME OVER SCREEN ---
  if (gameOver) {
    return (
      <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-slate-950">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-2xl backdrop-blur-md">
          <h2 className="text-3xl font-black tracking-tight">Challenge Completed!</h2>
          <div className="text-xl text-slate-300">
            Your Score: <span className="font-black text-emerald-400">{score}</span> / {rounds.length}
          </div>

          <button
            onClick={() => setGameStarted(false)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // --- GAME SCREEN (CARD A vs CARD B) ---
  const currentPair = rounds[currentRoundIndex];

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans max-w-5xl mx-auto selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar */}
      <div className="flex justify-between items-center w-full py-2">
        <span className="text-lg font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          VALUER
        </span>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
          Round {currentRoundIndex + 1} / {rounds.length} {dailyMode && '• Daily'}
        </div>
        <button 
          onClick={() => setGameStarted(false)} 
          className="text-xs font-medium text-slate-400 hover:text-white transition bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800"
        >
          Quit
        </button>
      </div>

      {/* Title */}
      <div className="text-center my-4">
        <h2 className="text-2xl md:text-4xl font-black tracking-tight">
          Which one costs <span className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-4">more</span>?
        </h2>
      </div>

      {/* Cards Container */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 my-auto w-full max-w-4xl mx-auto">
        {/* CARD A */}
        <div
          onClick={() => handleChoice('A')}
          className={`relative group cursor-pointer bg-slate-900/90 border-2 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[320px] md:min-h-[360px] transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl ${
            isRevealed
              ? currentPair.correctAnswer === 'A'
                ? 'border-emerald-500 bg-emerald-950/20'
                : selectedChoice === 'A'
                ? 'border-red-500 bg-red-950/20'
                : 'border-slate-800 opacity-40'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          {currentPair.itemA.image_url && (
            <div className="w-full h-40 md:h-48 mb-4 rounded-2xl overflow-hidden bg-slate-800">
              <img 
                src={currentPair.itemA.image_url} 
                alt={currentPair.itemA.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          )}
          <div className="text-center my-auto px-2">
            <h3 className="text-lg md:text-xl font-bold text-slate-100">{currentPair.itemA.title}</h3>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 w-full text-center">
            {isRevealed ? (
              <span className="text-2xl font-black text-emerald-400 animate-fade-in">
                {currentPair.itemA.price.toLocaleString()} CZK
              </span>
            ) : (
              <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                Tap to select
              </span>
            )}
          </div>
        </div>

        {/* CARD B */}
        <div
          onClick={() => handleChoice('B')}
          className={`relative group cursor-pointer bg-slate-900/90 border-2 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[320px] md:min-h-[360px] transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl ${
            isRevealed
              ? currentPair.correctAnswer === 'B'
                ? 'border-emerald-500 bg-emerald-950/20'
                : selectedChoice === 'B'
                ? 'border-red-500 bg-red-950/20'
                : 'border-slate-800 opacity-40'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          {currentPair.itemB.image_url && (
            <div className="w-full h-40 md:h-48 mb-4 rounded-2xl overflow-hidden bg-slate-800">
              <img 
                src={currentPair.itemB.image_url} 
                alt={currentPair.itemB.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          )}
          <div className="text-center my-auto px-2">
            <h3 className="text-lg md:text-xl font-bold text-slate-100">{currentPair.itemB.title}</h3>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 w-full text-center">
            {isRevealed ? (
              <span className="text-2xl font-black text-emerald-400 animate-fade-in">
                {currentPair.itemB.price.toLocaleString()} CZK
              </span>
            ) : (
              <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                Tap to select
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-center py-4 text-xs font-medium text-slate-500">
        {isRevealed ? 'Evaluating round...' : 'Select the card with the higher value'}
      </div>
    </div>
  );
}
