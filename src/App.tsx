import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
// Doporučuji mít tyto klíče v .env souboru (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
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

  // Herní stavy
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [dailyMode, setDailyMode] = useState<boolean>(false);
  const [rounds, setRounds] = useState<GamePair[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  
  // Interaktivní stav kola
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [alreadyPlayedToday, setAlreadyPlayedToday] = useState<boolean>(false);

  // 1. Načtení dat z Supabase při startu
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('questions').select('*');
        
        if (error) throw error;
        if (!data || data.length < 2) {
          throw new Error('V databázi není dostatek položek pro porovnávání (minimum je 2).');
        }

        setAllItems(data);
      } catch (err: any) {
        setError(err.message || 'Chyba při načítání dat.');
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  // Pomocná funkce: Pseudo-náhodný generátor s A-Z seedem (pro Daily Challenge)
  function getDailySeed(dateStr: string): number {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // Generování sekvence kol (5 kol)
  function generateRounds(isDaily: boolean): GamePair[] {
    const todayStr = new Date().toISOString().split('T')[0];
    let currentIndex = 0;

    let pool = [...allItems];

    if (isDaily) {
      // Deterministické zamíchání podle dne
      let seed = getDailySeed(todayStr);
      pool.sort(() => {
        seed = (seed * 9301 + 49297) % 233280;
        return (seed / 233280) - 0.5;
      });
    } else {
      // Náhodné zamíchání pro normální hru
      pool.sort(() => Math.random() - 0.5);
    }

    const generatedPairs: GamePair[] = [];
    const totalRoundsNeeded = 5;

    for (let i = 0; i < totalRoundsNeeded; i++) {
      // Potřebujeme 2 položky pro jedno kolo
      const itemA = pool[(i * 2) % pool.length];
      let itemB = pool[(i * 2 + 1) % pool.length];

      // Ochrana proti stejné položce
      if (itemA.id === itemB.id) {
        itemB = pool[(i * 2 + 2) % pool.length] || pool[0];
      }

      const correctAnswer: 'A' | 'B' = itemA.price >= itemB.price ? 'A' : 'B';

      generatedPairs.push({ itemA, itemB, correctAnswer });
    }

    return generatedPairs;
  }

  // Start hry (Denní výzva vs. Nekonečná hra)
  const startGame = (isDaily: boolean) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (isDaily) {
      const lastPlayedDate = localStorage.getItem('valuer_last_played_date');
      if (lastPlayedDate === todayStr) {
        setAlreadyPlayedToday(true);
        return;
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
    setAlreadyPlayedToday(false);
  };

  // Kliknutí na kartu A nebo B
  const handleChoice = (choice: 'A' | 'B') => {
    if (isRevealed || gameOver) return;

    setSelectedChoice(choice);
    setIsRevealed(true);

    const currentPair = rounds[currentRoundIndex];
    const isCorrect = choice === currentPair.correctAnswer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    // Po prodlevě přejdeme na další kolo nebo ukončíme hru
    setTimeout(() => {
      if (isCorrect) {
        if (currentRoundIndex + 1 < rounds.length) {
          setCurrentRoundIndex((prev) => prev + 1);
          setSelectedChoice(null);
          setIsRevealed(false);
        } else {
          // Konec hry - výhra / dokončení všech kol
          setGameOver(true);
          if (dailyMode) {
            const todayStr = new Date().toISOString().split('T')[0];
            localStorage.setItem('valuer_last_played_date', todayStr);
          }
        }
      } else {
        // Konec hry - prohra
        setGameOver(true);
        if (dailyMode) {
          const todayStr = new Date().toISOString().split('T')[0];
          localStorage.setItem('valuer_last_played_date', todayStr);
        }
      }
    }, 2000); // 2 sekundy na zobrazení cen a výsledku
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <div className="text-xl animate-pulse">Načítám Valuer...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
        <div className="bg-red-900/50 border border-red-500 p-6 rounded-xl max-w-md text-center">
          <h2 className="text-lg font-bold mb-2">Chyba</h2>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  // --- HLAVNÍ MENU ---
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            VALUER
          </h1>
          <p className="text-slate-400 text-sm">
            Porovnávej věci, zážitky a komodity. Klikni na to, co stojí víc!
          </p>

          {alreadyPlayedToday && (
            <div className="bg-amber-900/40 border border-amber-600/50 text-amber-200 p-3 rounded-lg text-sm">
              Dnešní denní výzvu už máš splněnou. Zkus volnou hru!
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              onClick={() => startGame(true)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20"
            >
              📅 Denní výzva (Daily Challenge)
            </button>
            <button
              onClick={() => startGame(false)}
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition border border-slate-700"
            >
              🎮 Volná hra
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- OBRAZOVKA KONCE HRY ---
  if (gameOver) {
    const currentPair = rounds[currentRoundIndex];
    const userWonAll = score === rounds.length;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-6 shadow-xl">
          <h2 className="text-3xl font-bold">
            {userWonAll ? '🎉 Skvělá práce!' + (dailyMode ? ' Výzva splněna!' : '') : '❌ Konec hry!'}
          </h2>
          <div className="text-xl text-slate-300">
            Skóre: <span className="font-bold text-emerald-400">{score}</span> / {rounds.length}
          </div>

          <button
            onClick={() => setGameStarted(false)}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
          >
            Zpět do menu
          </button>
        </div>
      </div>
    );
  }

  // --- HERNÍ OBRAZOVKA (KARTA A vs. KARTA B) ---
  const currentPair = rounds[currentRoundIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans max-w-4xl mx-auto">
      {/* Horní lišta / Skóre */}
      <div className="flex justify-between items-center w-full py-2">
        <button 
          onClick={() => setGameStarted(false)} 
          className="text-xs text-slate-400 hover:text-white transition"
        >
          ✕ Ukončit
        </button>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Kolo {currentRoundIndex + 1} / {rounds.length} {dailyMode && '• Denní výzva'}
        </div>
        <div className="text-sm font-bold text-emerald-400">
          Skóre: {score}
        </div>
      </div>

      {/* Hlavní nadpis */}
      <div className="text-center my-4">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight">
          Co stojí <span className="text-emerald-400 underline decoration-emerald-500/30">více</span>?
        </h2>
      </div>

      {/* Kontejner se dvěma kartami (Grid: vedle sebe na desktopu, pod sebou na mobilech) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-auto">
        {/* KARTA A */}
        <div
          onClick={() => handleChoice('A')}
          className={`relative group cursor-pointer bg-slate-900 border-2 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[260px] transition-all transform hover:scale-[1.02] ${
            isRevealed
              ? currentPair.correctAnswer === 'A'
                ? 'border-emerald-500 bg-emerald-950/20'
                : selectedChoice === 'A'
                ? 'border-red-500 bg-red-950/20'
                : 'border-slate-800 opacity-50'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          {currentPair.itemA.image_url && (
            <div className="w-full h-32 mb-4 rounded-xl overflow-hidden bg-slate-800">
              <img 
                src={currentPair.itemA.image_url} 
                alt={currentPair.itemA.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          )}
          <div className="text-center my-auto">
            <h3 className="text-lg md:text-xl font-bold text-slate-100">{currentPair.itemA.title}</h3>
          </div>

          {/* Odhalená cena */}
          <div className="mt-4 pt-4 border-t border-slate-800 w-full text-center">
            {isRevealed ? (
              <span className="text-xl font-black text-emerald-400 animate-fade-in">
                {currentPair.itemA.price.toLocaleString()} Kč
              </span>
            ) : (
              <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Klikni pro výběr
              </span>
            )}
          </div>
        </div>

        {/* KARTA B */}
        <div
          onClick={() => handleChoice('B')}
          className={`relative group cursor-pointer bg-slate-900 border-2 rounded-2xl p-6 flex flex-col items-center justify-between min-h-[260px] transition-all transform hover:scale-[1.02] ${
            isRevealed
              ? currentPair.correctAnswer === 'B'
                ? 'border-emerald-500 bg-emerald-950/20'
                : selectedChoice === 'B'
                ? 'border-red-500 bg-red-950/20'
                : 'border-slate-800 opacity-50'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          {currentPair.itemB.image_url && (
            <div className="w-full h-32 mb-4 rounded-xl overflow-hidden bg-slate-800">
              <img 
                src={currentPair.itemB.image_url} 
                alt={currentPair.itemB.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          )}
          <div className="text-center my-auto">
            <h3 className="text-lg md:text-xl font-bold text-slate-100">{currentPair.itemB.title}</h3>
          </div>

          {/* Odhalená cena */}
          <div className="mt-4 pt-4 border-t border-slate-800 w-full text-center">
            {isRevealed ? (
              <span className="text-xl font-black text-emerald-400 animate-fade-in">
                {currentPair.itemB.price.toLocaleString()} Kč
              </span>
            ) : (
              <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
                Klikni pro výběr
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Spodní info / stav */}
      <div className="text-center py-4 text-xs text-slate-500">
        {isRevealed ? 'Vyhodnocuji kolo...' : 'Zvol kartu, která má vyšší hodnotu'}
      </div>
    </div>
  );
}
