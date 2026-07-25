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

  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [rounds, setRounds] = useState<GamePair[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState<boolean>(false);

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('questions').select('*');
        
        if (error) throw error;
        if (!data || data.length < 2) {
          throw new Error('Not enough items in the database for comparison (minimum is 2).');
        }

        setAllItems(data);
      } catch (err: any) {
        setError(err.message || 'Error loading data.');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  function getDailySeed(dateStr: string): number {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function generateRounds(): GamePair[] {
    const todayStr = new Date().toISOString().split('T')[0];
    let pool = [...allItems];

    let seed = getDailySeed(todayStr);
    pool.sort(() => {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280) - 0.5;
    });

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

  const startGame = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastPlayedDate = localStorage.getItem('valuer_last_played_date');
    
    if (lastPlayedDate === todayStr) {
      setAlreadyPlayedToday(true);
    }

    const newRounds = generateRounds();
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

    // Posun do dalšího kola nebo konec po 2 sekundách (hráč vždy projde všech 5 kol)
    setTimeout(() => {
      if (currentRoundIndex + 1 < rounds.length) {
        setCurrentRoundIndex((prev) => prev + 1);
        setSelectedChoice(null);
        setIsRevealed(false);
      } else {
        setGameOver(true);
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('valuer_last_played_date', todayStr);
      }
    }, 2000);
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

  // --- HOME SCREEN ---
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-slate-950">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            VALUER
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Compare items, experiences and commodities. Tap the one that costs more!
          </p>

          {alreadyPlayedToday && (
            <div className="bg-amber-950/40 border border-amber-600/40 text-amber-300 p-3 rounded-xl text-xs font-medium">
              You have already completed today's challenge. You can play again to practice!
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={startGame}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Play Daily Challenge
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- GAME OVER SCREEN ---
  if (gameOver) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500 selection:text-slate-950">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 p-8 rounded-3xl text-center space-y-6 shadow-2xl backdrop-blur-md">
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans max-w-5xl mx-auto selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar */}
      <div className="flex justify-between items-center w-full py-2">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            VALUER
          </span>
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
          Round {currentRoundIndex + 1} / {rounds.length}
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

      {/* Cards Container (Side by side on desktop, stacked on mobile) */}
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
