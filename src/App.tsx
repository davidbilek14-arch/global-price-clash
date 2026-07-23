import React, { useState } from 'react';
import { Trophy, Flame, CheckCircle2, XCircle, Share2, Globe } from 'lucide-react';

// Kurzy vůči USD
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
  const [gameState, setGameState] = useState('playing'); // 'playing', 'revealed', 'ended'
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(null);
  const [streak, setStreak] = useState(3);

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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 max-w-4xl mx-auto font-sans">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-black tracking-wider text-emerald-400">VALUER</h1>
          <span className="text-xs bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-full font-bold border border-emerald-800">DAILY</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Currency Selector */}
          <select 
            value={currency} 
            onChange={(e) => setCurrency(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs md:text-sm font-bold rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {Object.keys(EXCHANGE_RATES).map(code => (
              <option key={code} value={code}>{EXCHANGE_RATES[code].name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm md:text-base bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-800/50">
            <Flame className="w-4 h-4 md:w-5 md:h-5 fill-amber-400" />
            <span>{streak}</span>
          </div>
        </div>
      </header>

      {/* Main Game Screen */}
      {gameState !== 'ended' ? (
        <main className="flex-1 flex flex-col justify-center gap-6 my-6">
          <div className="text-center text-xs md:text-sm text-slate-400 font-semibold tracking-wider">
            ROUND {currentRound + 1} OF {DAILY_QUESTIONS.length}
          </div>

          {/* Desktop/Mobile Cards Grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center">
            
            {/* Item A (Base) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between h-48 md:h-64 shadow-xl">
              <div>
                <span className="text-xs md:text-sm text-slate-400 font-medium">{q.itemA.location}</span>
                <h2 className="text-lg md:text-2xl font-bold mt-1">{q.itemA.name}</h2>
              </div>
              <div className="text-3xl md:text-4xl font-black text-emerald-400 mt-4">{formatPrice(q.itemA.priceUSD)}</div>
            </div>

            {/* VS Badge in Center */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-slate-950 border border-slate-800 text-slate-400 font-black text-xs md:text-sm px-3 py-1.5 rounded-full shadow-2xl hidden md:block">
              VS
            </div>

            {/* Item B (Target) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col justify-between h-48 md:h-64 shadow-xl">
              <div>
                <span className="text-xs md:text-sm text-slate-400 font-medium">{q.itemB.location}</span>
                <h2 className="text-lg md:text-2xl font-bold mt-1">{q.itemB.name}</h2>
              </div>
              
              {gameState === 'revealed' ? (
                <div className="text-3xl md:text-4xl font-black text-emerald-400 mt-4 animate-bounce">
                  {formatPrice(q.itemB.priceUSD)}
                </div>
              ) : (
                <div className="text-3xl md:text-4xl font-black text-slate-700 mt-4">? ? ?</div>
              )}
            </div>
          </div>

          {/* Actions & Feedback */}
          {gameState === 'playing' ? (
            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto w-full mt-2">
              <button 
                onClick={() => handleGuess(true)}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition font-bold py-4 rounded-xl text-lg md:text-xl shadow-lg cursor-pointer"
              >
                HIGHER ▲
              </button>
              <button 
                onClick={() => handleGuess(false)}
                className="bg-rose-600 hover:bg-rose-500 active:scale-95 transition font-bold py-4 rounded-xl text-lg md:text-xl shadow-lg cursor-pointer"
              >
                LOWER ▼
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-lg mx-auto w-full mt-2">
              <div className={`p-4 md:p-5 rounded-xl border flex flex-col gap-1.5 ${lastAnswerCorrect ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-rose-950/60 border-rose-800 text-rose-300'}`}>
                <div className="flex items-center gap-2 font-bold text-base md:text-lg">
                  {lastAnswerCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <XCircle className="w-6 h-6 text-rose-400" />}
                  <span>{lastAnswerCorrect ? 'Correct!' : 'Wrong!'}</span>
                </div>
                <p className="text-xs md:text-sm opacity-90 leading-relaxed">{q.funFact}</p>
              </div>

              <button 
                onClick={nextQuestion}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 transition font-bold py-3.5 rounded-xl text-sm md:text-base border border-slate-700 cursor-pointer"
              >
                NEXT ROUND →
              </button>
            </div>
          )}
        </main>
      ) : (
        /* Game Over Summary */
        <main className="flex-1 flex flex-col justify-center items-center text-center gap-6 my-6 max-w-md mx-auto w-full">
          <div className="w-20 h-20 bg-emerald-950 border border-emerald-700 rounded-full flex items-center justify-center shadow-lg">
            <Trophy className="w-10 h-10 text-emerald-400" />
          </div>

          <div>
            <h2 className="text-3xl font-black">Daily Complete!</h2>
            <p className="text-slate-400 mt-1">You got <span className="text-emerald-400 font-bold">{score}</span> out of {DAILY_QUESTIONS.length} correct</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full flex justify-around">
            <div>
              <div className="text-xs text-slate-400 font-medium">Streak</div>
              <div className="text-2xl font-black text-amber-400 flex items-center justify-center gap-1 mt-1">
                <Flame className="w-6 h-6 fill-amber-400" /> {streak + 1}
              </div>
            </div>
            <div className="border-r border-slate-800"></div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Accuracy</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{(score / DAILY_QUESTIONS.length) * 100}%</div>
            </div>
          </div>

          <button 
            onClick={() => alert("Copied score to clipboard!")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer"
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
  );
}
