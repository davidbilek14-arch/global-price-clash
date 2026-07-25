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
  const [rounds, setRounds] = useState<GamePair[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  
  // Round interactive states
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        const { data, error } = await supabase.from('questions').select('*');
        if (error) throw error;
        if (!data || data.length < 2) {
          throw new Error('Not enough items in database for comparison (minimum 2).');
        }
        setAllItems(data);
        
        initNewGame(data);
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

  function initNewGame(itemsPool: Item[]) {
    let pool = [...itemsPool];
    pool.sort(() => Math.random() - 0.5);

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

    setRounds(generatedPairs);
    setCurrentRoundIndex(0);
    setScore(0);
    setSelectedChoice(null);
    setIsRevealed(false);
    setGameOver(false);
  }

  const handleChoice = (choice: 'A' | 'B') => {
    if (isRevealed || gameOver) return;

    setSelectedChoice(choice);
    setIsRevealed(true);

    const currentPair = rounds[currentRoundIndex];
    const isCorrect = choice === currentPair.correctAnswer;
    const newScore = score + (isCorrect ? 1 : 0);

    if (isCorrect) {
      setScore(newScore);
    }

    setTimeout(() => {
      if (currentRoundIndex + 1 < rounds.length) {
        setCurrentRoundIndex((prev) => prev + 1);
        setSelectedChoice(null);
        setIsRevealed(false);
      } else {
        setGameOver(true);
        if (user) {
          saveScore(newScore);
        }
      }
    }, 2000);
  };

  async function saveScore(finalScore: number) {
    await supabase.from('scores').insert([{ user_id: user.id, score: finalScore }]);
    fetchLeaderboard();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="text-xl animate-pulse text-emerald-400 font-medium">Loading Valuer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-red-950/50 border border-red-500/50 p-6 rounded-2xl max-w-md text-center shadow-2xl">
          <h2 className="text-lg font-bold mb-2 text-red-400">Error</h2>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans max-w-6xl mx-auto selection:bg-emerald-500 selection:text-slate-950">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            VALUER
          </h1>
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
            A vs B Challenge
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {leaderboard.length > 0 && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-bold">Top:</span>
              <span className="text-emerald-400 font-semibold">{leaderboard[0]?.profiles?.email || 'Anonymous'} ({leaderboard[0]?.score} pts)</span>
            </div>
          )}

          {user ? (
            <div className="bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
              {user.email}
            </div>
          ) : (
            !authSent ? (
              <form onSubmit={handleLogin} className="flex gap-1">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                  required
                />
                <button type="submit" className="bg-emerald-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-400 transition">
                  Sign In
                </button>
              </form>
            ) : (
              <span className="text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                Check email for login link!
              </span>
            )
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="my-auto py-8 flex flex-col items-center w-full">
        {gameOver ? (
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-2xl backdrop-blur-md">
            <h2 className="text-3xl font-black tracking-tight">Game Completed!</h2>
            <div className="text-xl text-slate-300">
              Your Score: <span className="font-black text-emerald-400">{score}</span> / {rounds.length}
            </div>

            <button
              onClick={() => initNewGame(allItems)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Play Again
            </button>
          </div>
        ) : rounds.length > 0 && rounds[currentRoundIndex] ? (
          <div className="w-full max-w-4xl flex flex-col items-center">
            <div className="flex justify-between w-full mb-6 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Round {currentRoundIndex + 1} / {rounds.length}</span>
              <span>Score: <strong className="text-emerald-400">{score}</strong></span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-8 text-center">
              Which one costs <span className="text-emerald-400 underline decoration-emerald-500/30 underline-offset-4">more</span>?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* CARD A */}
              <div
                onClick={() => handleChoice('A')}
                className={`relative group cursor-pointer bg-slate-900/90 border-2 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[360px] transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl ${
                  isRevealed
                    ? rounds[currentRoundIndex].correctAnswer === 'A'
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : selectedChoice === 'A'
                      ? 'border-red-500 bg-red-950/20'
                      : 'border-slate-800 opacity-40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {rounds[currentRoundIndex].itemA.image_url && (
                  <div className="w-full h-48 mb-4 rounded-2xl overflow-hidden bg-slate-800">
                    <img 
                      src={rounds[currentRoundIndex].itemA.image_url} 
                      alt={rounds[currentRoundIndex].itemA.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                )}
                <div className="text-center my-auto px-2">
                  <h3 className="text-xl font-bold text-slate-100">{rounds[currentRoundIndex].itemA.title}</h3>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 w-full text-center">
                  {isRevealed ? (
                    <span className="text-2xl font-black text-emerald-400 animate-fade-in">
                      {rounds[currentRoundIndex].itemA.price.toLocaleString()} CZK
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
                className={`relative group cursor-pointer bg-slate-900/90 border-2 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[360px] transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl ${
                  isRevealed
                    ? rounds[currentRoundIndex].correctAnswer === 'B'
                      ? 'border-emerald-500 bg-emerald-950/20'
                      : selectedChoice === 'B'
                      ? 'border-red-500 bg-red-950/20'
                      : 'border-slate-800 opacity-40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {rounds[currentRoundIndex].itemB.image_url && (
                  <div className="w-full h-48 mb-4 rounded-2xl overflow-hidden bg-slate-800">
                    <img 
                      src={rounds[currentRoundIndex].itemB.image_url} 
                      alt={rounds[currentRoundIndex].itemB.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  </div>
                )}
                <div className="text-center my-auto px-2">
                  <h3 className="text-xl font-bold text-slate-100">{rounds[currentRoundIndex].itemB.title}</h3>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/80 w-full text-center">
                  {isRevealed ? (
                    <span className="text-2xl font-black text-emerald-400 animate-fade-in">
                      {rounds[currentRoundIndex].itemB.price.toLocaleString()} CZK
                    </span>
                  ) : (
                    <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                      Tap to select
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* FOOTER */}
      <footer className="text-center pt-6 border-t border-slate-800 text-xs text-slate-500">
        VALUER • Compare items and test your pricing intuition.
      </footer>
    </div>
  );
}
