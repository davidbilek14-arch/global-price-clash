import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Trophy, Flame, CheckCircle2, XCircle, Share2 } from 'lucide-react';

const EXCHANGE_RATES = {
  USD: { rate: 1, symbol: '$', name: 'USD ($)' },
  EUR: { rate: 0.92, symbol: '€', name: 'EUR (€)' },
  CZK: { rate: 23.5, symbol: 'Kč', name: 'CZK (Kč)' },
  GBP: { rate: 0.79, symbol: '£', name: 'GBP (£)' },
};

const DAILY_QUESTIONS = [
  {
    id: 1,
    itemA: { name: 'Starbucks Caffe Latte (Large)', location: '🇨🇭 Zurich, Switzerland', priceUSD: 8.50 },
    itemB: { name: '1 Month of Netflix Premium', location: '🇮🇳 India', priceUSD: 7.90 },
    funFact: 'A single morning coffee in Switzerland costs more than an entire month of 4K Netflix streaming in India!'
  },
  {
    id: 2,
    itemA: { name: 'Full tank of petrol (50L)', location: '🇳🇴 Norway', priceUSD: 110.00 },
    itemB: { name: 'Nike Air Force 1 Sneakers', location: '🇺🇸 USA', priceUSD: 115.00 },
    funFact: 'Filling up your car just once in Norway costs almost as much as buying a brand new pair of classic Nikes in the US.'
  },
  {
    id: 3,
    itemA: { name: 'Big Mac Meal at McDonald\'s', location: '🇯🇵 Tokyo, Japan', priceUSD: 5.20 },
    itemB: { name: '1 Pint of Draught Beer', location: '🇬🇧 London, UK', priceUSD: 8.20 },
    funFact: 'A single pint of beer in London costs significantly more than a full burger meal with fries and a drink in Tokyo!'
  },
  {
    id: 4,
    itemA: { name: 'Sony PlayStation 5 Console', location: '🇺🇸 USA', priceUSD: 499.00 },
    itemB: { name: '100 km of Uber rides', location: '🇪🇬 Cairo, Egypt', priceUSD: 350.00 },
    funFact: 'For the price of one gaming console, you could ride Uber across Cairo for hundreds of kilometers.'
  },
  {
    id: 5,
    itemA: { name: 'Single IMAX Cinema Ticket', location: '🇺🇸 New York City', priceUSD: 28.00 },
    itemB: { name: 'Monthly pass for Vélib shared bikes', location: '🇫🇷 Paris, France', priceUSD: 31.00 },
    funFact: 'A single movie night in NYC costs almost the same as unlimited bike rides around Paris for a whole month.'
  }
];

export default function App() {
  const [currency, setCurrency] = useState('USD');
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('playing');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
  const [streak, setStreak] = useState(3);

  // Automatické uložení výsledku do Supabase po dokončení hry
  useEffect(() => {
    if (gameState === 'ended') {
      console.log("Hra skončila, ukládám skóre do Supabase...");

      const saveStats = async () => {
        try {
          const finalStreak = streak + 1;
          const { data: { user } } = await supabase.auth.getUser();

          const { error } = await supabase
            .from('stats')
            .upsert({
              user_id: user?.id || null,
              best_streak: finalStreak,
              total_games: 1,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error('Chyba zápisu do Supabase:', error.message);
          } else {
            console.log('Skóre bylo úspěšně zapsáno do Supabase!');
          }
        } catch (err) {
          console.error('Chyba při volání:', err);
        }
      };

      saveStats();
    }
  }, [gameState]);

  const formatPrice = (priceUSD) => {
    const { rate, symbol } = EXCHANGE_RATES[currency];
    const converted = Math.round(priceUSD * rate);
    return currency === 'CZK' ? `${converted} ${symbol}` : `${symbol}${converted}`;
  };

  const handleGuess = (isHigher) => {
    const q = DAILY_QUESTIONS[currentRound];
    const isCorrect = isHigher ? q.itemB.priceUSD >= q.itemA.priceUSD : q.itemB.priceUSD <= q.itemA.priceUSD;

    setLastAnswerCorrect(isCorrect);
    if (isCorrect) setScore(score + 1);
    setGameState('revealed');
  };

  const nextQuestion = () => {
    if (currentRound + 1 < DAILY_QUESTIONS.length) {
      setCurrentRound(currentRound + 1);
      setGameState('playing');
    } else {
      setGameState('ended');
    }
  };

  const q = DAILY_QUESTIONS[currentRound];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 lg:p-8 relative overflow-hidden font-sans">
      {/* Vizuální efekty pozadí na desktopu */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Container */}
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-between z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-4xl font-black tracking-wider text-emerald-400">VALUER</h1>
            <span className="text-xs lg:text-sm bg-emerald-950/80 text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-800/60">DAILY</span>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs lg:text-sm font-bold rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {Object.keys(EXCHANGE_RATES).map(code => (
                <option key={code} value={code}>{EXCHANGE_RATES[code].name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm lg:text-base bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-800/50">
              <Flame className="w-4 h-4 lg:w-5 lg:h-5 fill-amber-400" />
              <span>{streak}</span>
            </div>
          </div>
        </header>

        {/* Main Game Screen */}
        {gameState !== 'ended' ? (
          <main className="flex-1 flex flex-col justify-center gap-6 my-6 lg:my-10">
            <div className="text-center text-xs lg:text-sm text-slate-400 font-semibold tracking-wider">
              ROUND {currentRound + 1} OF {DAILY_QUESTIONS.length}
            </div>

            {/* Desktop / Mobile Grid */}
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-12 items-stretch">
              
              {/* Item A */}
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 lg:p-10 flex flex-col justify-between shadow-2xl min-h-[220px] lg:min-h-[300px]">
                <div>
                  <span className="text-xs lg:text-sm text-slate-400 font-medium uppercase tracking-wider">{q.itemA.location}</span>
                  <h2 className="text-xl lg:text-3xl font-bold mt-2 leading-snug">{q.itemA.name}</h2>
                </div>
                <div className="text-3xl lg:text-5xl font-black text-emerald-400 mt-6">{formatPrice(q.itemA.priceUSD)}</div>
              </div>

              {/* VS Badge na PC */}
              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950 border-2 border-slate-800 text-slate-400 font-black text-sm w-12 h-12 rounded-full items-center justify-center shadow-2xl">
                VS
              </div>

              {/* Item B */}
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 lg:p-10 flex flex-col justify-between shadow-2xl min-h-[220px] lg:min-h-[300px]">
                <div>
                  <span className="text-xs lg:text-sm text-slate-400 font-medium uppercase tracking-wider">{q.itemB.location}</span>
                  <h2 className="text-xl lg:text-3xl font-bold mt-2 leading-snug">{q.itemB.name}</h2>
                </div>
                
                {gameState === 'revealed' ? (
                  <div className="text-3xl lg:text-5xl font-black text-emerald-400 mt-6 animate-bounce">
                    {formatPrice(q.itemB.priceUSD)}
                  </div>
                ) : (
                  <div className="text-3xl lg:text-5xl font-black text-slate-700 mt-6">? ? ?</div>
                )}
              </div>
            </div>

            {/* Ovládací tlačítka a Výsledky */}
            {gameState === 'playing' ? (
              <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto w-full mt-4">
                <button 
                  onClick={() => handleGuess(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all font-black py-4 lg:py-5 rounded-2xl text-lg lg:text-2xl shadow-xl shadow-emerald-950/50 cursor-pointer"
                >
                  HIGHER ▲
                </button>
                <button 
                  onClick={() => handleGuess(false)}
                  className="bg-rose-600 hover:bg-rose-500 active:scale-95 transition-all font-black py-4 lg:py-5 rounded-2xl text-lg lg:text-2xl shadow-xl shadow-rose-950/50 cursor-pointer"
                >
                  LOWER ▼
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-xl mx-auto w-full mt-2">
                <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col gap-2 ${lastAnswerCorrect ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300' : 'bg-rose-950/70 border-rose-800 text-rose-300'}`}>
                  <div className="flex items-center gap-2 font-bold text-lg lg:text-xl">
                    {lastAnswerCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <XCircle className="w-6 h-6 text-rose-400" />}
                    <span>{lastAnswerCorrect ? 'Correct!' : 'Wrong!'}</span>
                  </div>
                  <p className="text-xs lg:text-sm opacity-90 leading-relaxed">{q.funFact}</p>
                </div>

                <button 
                  onClick={nextQuestion}
                  className="bg-slate-800 hover:bg-slate-700 active:scale-95 transition font-bold py-4 rounded-2xl text-base lg:text-lg border border-slate-700 cursor-pointer shadow-lg"
                >
                  NEXT ROUND →
                </button>
              </div>
            )}
          </main>
        ) : (
          /* Game Over */
          <main className="flex-1 flex flex-col justify-center items-center text-center gap-6 my-6 max-w-md mx-auto w-full">
            <div className="w-20 h-20 bg-emerald-950 border border-emerald-700 rounded-full flex items-center justify-center shadow-2xl">
              <Trophy className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-3xl lg:text-4xl font-black">Daily Complete!</h2>
              <p className="text-slate-400 mt-2 text-sm lg:text-base">You got <span className="text-emerald-400 font-bold">{score}</span> out of {DAILY_QUESTIONS.length} correct</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 w-full flex justify-around shadow-xl">
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Streak</div>
                <div className="text-2xl lg:text-3xl font-black text-amber-400 flex items-center justify-center gap-1 mt-1">
                  <Flame className="w-6 h-6 fill-amber-400" /> {streak + 1}
                </div>
              </div>
              <div className="border-r border-slate-800"></div>
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Accuracy</div>
                <div className="text-2xl lg:text-3xl font-black text-emerald-400 mt-1">{(score / DAILY_QUESTIONS.length) * 100}%</div>
              </div>
            </div>

            <button 
              onClick={() => alert("Copied score to clipboard!")}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base lg:text-lg flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <Share2 className="w-5 h-5" /> Share Results
            </button>
          </main>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pt-4 border-t border-slate-900">
          Valuer © 2026 • Everyday Global Price Clash
        </footer>
      </div>
    </div>
  );
}
