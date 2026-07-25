import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Trophy, CheckCircle2, XCircle, Share2, LogOut, X, Globe, CalendarCheck2, Coffee, Zap, Sparkles, HelpCircle } from 'lucide-react';
import AuthModal from './AuthModal';

const EXCHANGE_RATES = {
  USD: { rate: 1, symbol: '$', name: 'USD ($)' },
  EUR: { rate: 0.92, symbol: '€', name: 'EUR (€)' },
  CZK: { rate: 23.5, symbol: 'Kč', name: 'CZK (Kč)' },
  GBP: { rate: 0.79, symbol: '£', name: 'GBP (£)' },
};

// Placeholder question pool (will be fetched from database soon)
const ALL_QUESTIONS = [
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

interface CountryStats {
  country_code: string;
  total_score: number;
  player_count: number;
}

export default function App() {
  const [gameMode, setGameMode] = useState<'daily' | 'endless'>('daily');
  const [currency, setCurrency] = useState('USD');
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'revealed' | 'ended' | 'already_played'>('playing');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [userCountry, setUserCountry] = useState('US');

  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState<'daily' | 'endless'>('daily');
  const [countryLeaders, setCountryLeaders] = useState<CountryStats[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [shareNotification, setShareNotification] = useState(false);

  const [endlessQuestions, setEndlessQuestions] = useState(ALL_QUESTIONS);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // Auto-detect country via ipwho.is
  useEffect(() => {
    fetch('https://ipwho.is/')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.country_code) {
          setUserCountry(data.country_code);
        }
      })
      .catch(() => console.log('IP detection failed, defaulting to US'));
  }, []);

  // Check Auth & Played Status for the selected mode (database + localStorage fallback)
  useEffect(() => {
    const checkUserAndPlayStatus = async (currentUser: any) => {
      setUser(currentUser);
      const today = getTodayDateString();
      const storageKey = `valuer_played_${gameMode}_${today}`;

      // 1. Check localStorage first
      if (localStorage.getItem(storageKey) === 'true') {
        setGameState('already_played');
        return;
      }

      // 2. If logged in, check Supabase database as secondary validation
      if (currentUser) {
        const tableName = gameMode === 'daily' ? 'stats' : 'stats_endless';
        const { data: stats, error } = await supabase
          .from(tableName)
          .select('last_played_date')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (!error && stats && stats.last_played_date === today) {
          localStorage.setItem(storageKey, 'true');
          setGameState('already_played');
          return;
        }
      }

      setGameState('playing');
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      checkUserAndPlayStatus(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserAndPlayStatus(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [gameMode]);

  const switchMode = (mode: 'daily' | 'endless') => {
    setGameMode(mode);
    setScore(0);
    setCurrentRound(0);
    if (mode === 'endless') {
      setEndlessQuestions([...ALL_QUESTIONS].sort(() => Math.random() - 0.5));
    }
  };

  const fetchLeaderboard = async (type: 'daily' | 'endless' = 'daily') => {
    setLoadingLeaderboard(true);
    setLeaderboardType(type);

    const tableName = type === 'daily' ? 'stats' : 'stats_endless';

    const { data: allStats, error } = await supabase
      .from(tableName)
      .select('country_code, high_score');

    if (error) {
      console.error('Error fetching leaderboard data:', error);
      setCountryLeaders([]);
      setLoadingLeaderboard(false);
      return;
    }

    if (allStats) {
      const countryMap: Record<string, { total_score: number; player_count: number }> = {};

      allStats.forEach((item) => {
        const code = item.country_code || 'US';
        if (!countryMap[code]) {
          countryMap[code] = { total_score: 0, player_count: 0 };
        }
        countryMap[code].total_score += Number(item.high_score) || 0;
        countryMap[code].player_count += 1;
      });

      const aggregated: CountryStats[] = Object.keys(countryMap).map((code) => ({
        country_code: code,
        total_score: countryMap[code].total_score,
        player_count: countryMap[code].player_count,
      })).sort((a, b) => b.total_score - a.total_score);

      setCountryLeaders(aggregated);
    }

    setLoadingLeaderboard(false);
  };

  const openLeaderboard = (type: 'daily' | 'endless' = 'daily') => {
    fetchLeaderboard(type);
    setIsLeaderboardOpen(true);
  };

  useEffect(() => {
    if (gameState === 'ended') {
      const today = getTodayDateString();
      const storageKey = `valuer_played_${gameMode}_${today}`;
      localStorage.setItem(storageKey, 'true');

      if (user) {
        const saveStats = async () => {
          try {
            const tableName = gameMode === 'daily' ? 'stats' : 'stats_endless';

            const { data: currentStats } = await supabase
              .from(tableName)
              .select('high_score, total_games')
              .eq('user_id', user.id)
              .maybeSingle();

            const newHighScore = Math.max(currentStats?.high_score || 0, score);
            const newTotalGames = (currentStats?.total_games || 0) + 1;

            let error;
            if (currentStats) {
              const res = await supabase
                .from(tableName)
                .update({
                  high_score: newHighScore,
                  total_games: newTotalGames,
                  country_code: userCountry,
                  last_played_date: today,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);
              error = res.error;
            } else {
              const res = await supabase
                .from(tableName)
                .insert({
                  user_id: user.id,
                  email: user.email,
                  high_score: newHighScore,
                  total_games: newTotalGames,
                  country_code: userCountry,
                  last_played_date: today,
                  updated_at: new Date().toISOString()
                });
              error = res.error;
            }

            if (error) console.error('Supabase save error:', error);
          } catch (err) {
            console.error('Error saving score:', err);
          }
        };

        saveStats();
      }
    }
  }, [gameState, user, score, userCountry, gameMode]);

  const formatPrice = (priceUSD: number) => {
    const { rate, symbol } = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES];
    const converted = Math.round(priceUSD * rate);
    return currency === 'CZK' ? `${converted} ${symbol}` : `${symbol}${converted}`;
  };

  const currentQuestionsList = gameMode === 'daily' ? ALL_QUESTIONS : endlessQuestions;

  const handleGuess = (isHigher: boolean) => {
    const q = currentQuestionsList[currentRound % currentQuestionsList.length];
    const isCorrect = isHigher ? q.itemB.priceUSD >= q.itemA.priceUSD : q.itemB.priceUSD <= q.itemA.priceUSD;

    setLastAnswerCorrect(isCorrect);
    if (isCorrect) {
      setScore(score + 1);
      setGameState('revealed');
    } else {
      if (gameMode === 'endless') {
        setGameState('ended');
      } else {
        setGameState('revealed');
      }
    }
  };

  const nextQuestion = () => {
    if (gameMode === 'daily') {
      if (currentRound + 1 < ALL_QUESTIONS.length) {
        setCurrentRound(currentRound + 1);
        setGameState('playing');
      } else {
        setGameState('ended');
      }
    } else {
      setCurrentRound(currentRound + 1);
      setGameState('playing');
    }
  };

  const handleShare = () => {
    const text = gameMode === 'daily' 
      ? `Valuer Daily - Score: ${score}/${ALL_QUESTIONS.length} 🌍` 
      : `Valuer Endless - I achieved a score of ${score} points! 🚀`;
      
    navigator.clipboard.writeText(text);
    setShareNotification(true);
    setTimeout(() => setShareNotification(false), 2500);
  };

  const getCountryDisplay = (code: string) => {
    const countries: Record<string, string> = {
      CZ: '🇨🇿 Czechia',
      SK: '🇸🇰 Slovakia',
      US: '🇺🇸 United States',
      DE: '🇩🇪 Germany',
      GB: '🇬🇧 United Kingdom',
      PL: '🇵🇱 Poland',
      AT: '🇦🇹 Austria',
      FR: '🇫🇷 France',
    };
    return countries[code] || `🌐 ${code}`;
  };

  const q = currentQuestionsList[currentRound % currentQuestionsList.length];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 lg:p-8 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-between z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800/80 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-4xl font-black tracking-wider text-emerald-400">VALUER</h1>
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => switchMode('daily')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${gameMode === 'daily' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Daily
              </button>
              <button 
                onClick={() => switchMode('endless')}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${gameMode === 'endless' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Zap className="w-3 h-3" /> Endless
              </button>
            </div>
          </div>
          
          <div className="flex items-center flex-wrap justify-center gap-2 lg:gap-3">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs lg:text-sm font-bold px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>How to play</span>
            </button>

            <button
              onClick={() => openLeaderboard(gameMode)}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-amber-400 text-xs lg:text-sm font-bold px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span>Leaderboard</span>
            </button>

            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs lg:text-sm font-bold rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {Object.keys(EXCHANGE_RATES).map(code => (
                <option key={code} value={code}>{EXCHANGE_RATES[code as keyof typeof EXCHANGE_RATES].name}</option>
              ))}
            </select>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  {user.email?.split('@')[0]}
                </span>
                <button 
                  onClick={() => supabase.auth.signOut()} 
                  title="Sign out"
                  className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs lg:text-sm font-bold px-3 py-2 rounded-lg transition cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* State: Already Played Today */}
        {gameState === 'already_played' ? (
          <main className="flex-1 flex flex-col justify-center items-center text-center gap-6 my-8 max-w-md mx-auto w-full">
            <div className="w-20 h-20 bg-amber-950/60 border border-amber-600/50 rounded-full flex items-center justify-center shadow-2xl">
              <CalendarCheck2 className="w-10 h-10 text-amber-400" />
            </div>

            <div>
              <h2 className="text-3xl lg:text-4xl font-black">Come back tomorrow!</h2>
              <p className="text-slate-400 mt-2 text-sm lg:text-base leading-relaxed">
                You have already completed today's <b>{gameMode === 'daily' ? 'Daily' : 'Endless'}</b> challenge. Both game modes reset every day, so make sure to return tomorrow and play them again!
              </p>
            </div>

            {/* Buy Me a Coffee Callout even when already played */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/40 rounded-2xl p-4 w-full text-left flex flex-col gap-2.5 shadow-lg">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Suggest a theme for the next round!</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Buy a coffee ☕, write your favorite topic in the note (e.g., technology, fast food, cars), and I will include it in the game with your name!
              </p>
              <a
                href="https://buymeacoffee.com/davidbilek"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-center"
              >
                <Coffee className="w-4 h-4" /> Support & Choose Theme
              </a>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={() => switchMode(gameMode === 'daily' ? 'endless' : 'daily')}
                className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base border border-slate-700 flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Zap className="w-5 h-5 text-amber-400" /> Check {gameMode === 'daily' ? 'Endless' : 'Daily'} Mode status
              </button>
              <button 
                onClick={() => openLeaderboard(gameMode)}
                className="w-full bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base border border-slate-800 flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Globe className="w-5 h-5 text-amber-400" /> View Leaderboard
              </button>
            </div>
          </main>
        ) : gameState !== 'ended' ? (
          /* Main Game Screen */
          <main className="flex-1 flex flex-col justify-center gap-6 my-6 lg:my-10">
            <div className="flex justify-between items-center max-w-xl mx-auto w-full text-xs lg:text-sm text-slate-400 font-semibold tracking-wider">
              <span>{gameMode === 'daily' ? `ROUND ${currentRound + 1} OF ${ALL_QUESTIONS.length}` : `ENDLESS MODE`}</span>
              <span className="text-emerald-400 font-bold">SCORE: {score}</span>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-12 items-stretch">
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 lg:p-10 flex flex-col justify-between shadow-2xl min-h-[220px] lg:min-h-[300px]">
                <div>
                  <span className="text-xs lg:text-sm text-slate-400 font-medium uppercase tracking-wider">{q.itemA.location}</span>
                  <h2 className="text-xl lg:text-3xl font-bold mt-2 leading-snug">{q.itemA.name}</h2>
                </div>
                <div className="text-3xl lg:text-5xl font-black text-emerald-400 mt-6">{formatPrice(q.itemA.priceUSD)}</div>
              </div>

              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950 border-2 border-slate-800 text-slate-400 font-black text-sm w-12 h-12 rounded-full items-center justify-center shadow-2xl">
                VS
              </div>

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
          /* Game Over Screen */
          <main className="flex-1 flex flex-col justify-center items-center text-center gap-6 my-6 max-w-md mx-auto w-full">
            <div className="w-20 h-20 bg-emerald-950 border border-emerald-700 rounded-full flex items-center justify-center shadow-2xl">
              <Trophy className="w-10 h-10 text-emerald-400" />
            </div>

            <div>
              <h2 className="text-3xl lg:text-4xl font-black">{gameMode === 'daily' ? 'Daily Complete!' : 'Game Over!'}</h2>
              <p className="text-slate-400 mt-2 text-sm lg:text-base">
                {gameMode === 'daily' 
                  ? `You got ${score} out of ${ALL_QUESTIONS.length} correct` 
                  : `You achieved a final score of ${score} points!`}
              </p>
            </div>

            {!user ? (
              <p className="text-xs text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-800/40">
                ⚠️ Please sign in to record your score for the country leaderboard!
              </p>
            ) : (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                ✅ Score successfully saved to {gameMode === 'daily' ? 'Daily' : 'Endless'} ranking!
              </p>
            )}

            {/* Buy Me a Coffee Callout with Topic Request */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/40 rounded-2xl p-4 w-full text-left flex flex-col gap-2.5 shadow-lg">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Suggest a theme for the next round!</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Buy a coffee ☕, write your favorite topic in the note (e.g., technology, fast food, cars), and I will include it in the game with your name!
              </p>
              <a
                href="https://buymeacoffee.com/davidbilek"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-center"
              >
                <Coffee className="w-4 h-4" /> Support & Choose Theme
              </a>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={handleShare}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base lg:text-lg flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Share2 className="w-5 h-5" /> {shareNotification ? 'Copied to clipboard! ✅' : 'Share Results'}
              </button>
            </div>
          </main>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-center gap-3">
          <span>Valuer © 2026 • Everyday Global Price Clash</span>
          <span className="hidden sm:inline">•</span>
          <a 
            href="https://buymeacoffee.com/davidbilek" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <Coffee className="w-3.5 h-3.5" /> Buy me a coffee
          </a>
        </footer>
      </div>

      {/* Modal - How to Play */}
      {isHelpOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsHelpOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-black text-emerald-400">HOW TO PLAY</h2>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white mb-1">🌍 The Core Concept</h3>
                <p className="text-xs text-slate-400">
                  Compare everyday items, food, technology, or services from different cities around the world and guess whether item B is <b>HIGHER ▲</b> or <b>LOWER ▼</b> in price compared to item A.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white mb-1">📅 Daily vs Endless Mode</h3>
                <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                  <li><b>Daily Mode:</b> Fixed set of rounds refreshed every day. Can be played once daily.</li>
                  <li><b>Endless Mode:</b> A continuous challenge to test your pricing intuition until you make a mistake. Can also be played once per day.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white mb-1">🏆 Country Leaderboard</h3>
                <p className="text-xs text-slate-400">
                  Sign in to record your scores and compete for your country on the global leaderboard!
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsHelpOpen(false)}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 font-bold py-3 rounded-xl text-sm transition cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Modal - Country Leaderboard */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsLeaderboardOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center gap-2 mb-4">
              <Globe className="w-7 h-7 text-amber-400" />
              <h2 className="text-xl font-black text-amber-400">COUNTRY LEADERBOARD</h2>
            </div>

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mb-6">
              <button 
                onClick={() => fetchLeaderboard('daily')}
                className={`flex-1 text-xs py-2 rounded-lg font-bold transition cursor-pointer ${leaderboardType === 'daily' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Daily Mode
              </button>
              <button 
                onClick={() => fetchLeaderboard('endless')}
                className={`flex-1 text-xs py-2 rounded-lg font-bold transition cursor-pointer ${leaderboardType === 'endless' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Endless Mode
              </button>
            </div>

            {loadingLeaderboard ? (
              <div className="text-center py-8 text-slate-400">Loading rankings...</div>
            ) : countryLeaders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No data recorded for this mode yet (or table missing).
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {countryLeaders.map((country, index) => (
                  <div 
                    key={country.country_code || index}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border ${
                      index === 0 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                        : 'bg-slate-800/50 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold w-6 text-center text-slate-400">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <span className="font-semibold">{getCountryDisplay(country.country_code)}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-base text-amber-400">{country.total_score} pts</div>
                      <div className="text-xs text-slate-400">{country.player_count} {country.player_count === 1 ? 'player' : 'players'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
