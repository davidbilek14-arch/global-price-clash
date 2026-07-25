import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface Question {
  id: number;
  title: string;
  price: number;
  image_url?: string;
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [user, setUser] = useState<any>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [authSent, setAuthSent] = useState<boolean>(false);

  // Game state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [guessResult, setGuessResult] = useState<boolean | null>(null);
  const [revealedPrice, setRevealedPrice] = useState<number | null>(null);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);

        const { data, error } = await supabase.from('questions').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('No questions found in the database.');
        }

        // Zamíchání otázek
        setQuestions(data.sort(() => Math.random() - 0.5));
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

  const currentItem = questions[currentIndex];
  const nextItem = questions[(currentIndex + 1) % questions.length];

  const handleGuess = (higher: boolean) => {
    if (guessResult !== null) return;

    const isHigher = nextItem.price >= currentItem.price;
    const correct = higher === isHigher;

    setGuessResult(correct);
    setRevealedPrice(nextItem.price);

    setTimeout(() => {
      if (correct) {
        setScore((prev) => prev + 1);
        setCurrentIndex((prev) => (prev + 1) % questions.length);
        setGuessResult(null);
        setRevealedPrice(null);
      } else {
        setGameOver(true);
        if (user) {
          saveScore(score + 1);
        }
      }
    }, 2000);
  };

  async function saveScore(finalScore: number) {
    await supabase.from('scores').insert([{ user_id: user.id, score: finalScore }]);
    fetchLeaderboard();
  }

  const restartGame = () => {
    setQuestions([...questions].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setScore(0);
    setGameOver(false);
    setGuessResult(null);
    setRevealedPrice(null);
  };

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
            Score: <strong className="text-emerald-400">{score}</strong>
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
            <h2 className="text-3xl font-black tracking-tight">Game Over</h2>
            <div className="text-xl text-slate-300">
              Final Score: <span className="font-black text-emerald-400">{score}</span>
            </div>

            <button
              onClick={restartGame}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Play Again
            </button>
          </div>
        ) : currentItem && nextItem ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl items-center">
            
            {/* LEFT CARD (Current) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[360px] shadow-xl">
              {currentItem.image_url && (
                <div className="w-full h-48 mb-4 rounded-2xl overflow-hidden bg-slate-800">
                  <img src={currentItem.image_url} alt={currentItem.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-center my-auto">
                <h3 className="text-xl font-bold text-slate-100">{currentItem.title}</h3>
                <p className="text-xs text-slate-400 mt-1">costs</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800 w-full text-center">
                <span className="text-2xl font-black text-emerald-400">{currentItem.price.toLocaleString()} CZK</span>
              </div>
            </div>

            {/* RIGHT CARD (Next / Guess) */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-between min-h-[360px] shadow-xl relative">
              {nextItem.image_url && (
                <div className="w-full h-48 mb-4 rounded-2xl overflow-hidden bg-slate-800">
                  <img src={nextItem.image_url} alt={nextItem.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-center my-auto">
                <h3 className="text-xl font-bold text-slate-100">{nextItem.title}</h3>
                <p className="text-xs text-slate-400 mt-1">costs...</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 w-full text-center">
                {revealedPrice !== null ? (
                  <span className={`text-2xl font-black ${guessResult ? 'text-emerald-400' : 'text-red-400'}`}>
                    {revealedPrice.toLocaleString()} CZK
                  </span>
                ) : (
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleGuess(true)}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-md active:scale-95"
                    >
                      Higher 📈
                    </button>
                    <button
                      onClick={() => handleGuess(false)}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition border border-slate-700 active:scale-95"
                    >
                      Lower 📉
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : null}
      </main>

      {/* FOOTER */}
      <footer className="text-center pt-6 border-t border-slate-800 text-xs text-slate-500">
        VALUER • Compare prices and test your knowledge.
      </footer>
    </div>
  );
}
