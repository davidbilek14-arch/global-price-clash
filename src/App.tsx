import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Trophy, CheckCircle2, XCircle, Share2, LogOut, X, Globe, CalendarCheck2, Coffee, Zap, Sparkles, HelpCircle, User, Percent, RotateCcw } from 'lucide-react';
import AuthModal from './AuthModal';

const EXCHANGE_RATES = {
  USD: { rate: 1, symbol: '$', name: 'USD ($)' },
  EUR: { rate: 0.92, symbol: '€', name: 'EUR (€)' },
  CZK: { rate: 23.5, symbol: 'Kč', name: 'CZK (Kč)' },
  GBP: { rate: 0.79, symbol: '£', name: 'GBP (£)' },
};

const FALLBACK_QUESTIONS = [
  {
    id: 9991,
    itemA: { name: 'Starbucks Caffe Latte (Large)', location: '🇨🇭 Zurich, Switzerland', priceUSD: 8.50 },
    itemB: { name: '1 Month of Netflix Premium', location: '🇮🇳 India', priceUSD: 7.90 },
    funFact: 'A single morning coffee in Switzerland costs more than an entire month of 4K Netflix streaming in India!'
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
  const [questions, setQuestions] = useState(FALLBACK_QUESTIONS);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'revealed' | 'ended' | 'already_played'>('playing');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [userCountry, setUserCountry] = useState('US');

  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [endlessStats, setEndlessStats] = useState<any>(null);

  const [leaderboardType, setLeaderboardType] = useState<'daily' | 'endless'>('daily');
  const [countryLeaders, setCountryLeaders] = useState<CountryStats[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [shareNotification, setShareNotification] = useState(false);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // Načtení všech řádků ze Supabase po dávkách (obejde limit 1000 záznamů)
  const fetchAllRows = async (tableName: string) => {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let fetchMore = true;

    while (fetchMore) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`CHYBA při načítání tabulky ${tableName}:`, error.message);
        break;
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < pageSize) {
          fetchMore = false;
        } else {
          page++;
        }
      } else {
        fetchMore = false;
      }
    }
    return allData;
  };

  const fetchQuestions = async (mode: 'daily' | 'endless', currentUser: any) => {
    const tableName = mode === 'endless' ? 'questions_endless' : 'questions_daily';
    const today = getTodayDateString();

    if (mode === 'endless' && currentUser) {
      const { data: eStats } = await supabase
        .from('stats_endless')
        .select('last_played_date')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (eStats && eStats.last_played_date === today) {
        setGameState('already_played');
        return;
      }
    }

    const data = await fetchAllRows(tableName);

    if (data && data.length > 0) {
      const formatted = data.map((q: any) => ({
        id: q.id,
        itemA: { name: q.item_a_name, location: q.item_a_location, priceUSD: Number(q.item_a_price) },
        itemB: { name: q.item_b_name, location: q.item_b_location, priceUSD: Number(q.item_b_price) },
        funFact: q.fun_fact
      }));

      if (currentUser) {
        // --- PRO PŘIHLÁŠENÉ UŽIVATELE (z databáze Supabase) ---
        if (mode === 'endless') {
          const { data: seenData } = await supabase
            .from('user_seen_cards')
            .select('question_id')
            .eq('user_id', currentUser.id);

          const seenIds = seenData ? seenData.map((s: any) => s.question_id) : [];
          let nevidene = formatted.filter((karta: any) => !seenIds.includes(karta.id));

          if (nevidene.length === 0) {
            await supabase.from('user_seen_cards').delete().eq('user_id', currentUser.id);
            nevidene = formatted;
          }

          setQuestions([...nevidene].sort(() => Math.random() - 0.5));
        } else {
          setQuestions([...formatted].sort(() => Math.random() - 0.5));
        }
      } else {
        // --- PRO NEPŘIHLÁŠENÉ UŽIVATELE (z localStorage v prohlížeči) ---
        const storageKeySeen = `valuer_seen_cards_${mode}`;
        let seenIds: number[] = [];
        try {
          const saved = localStorage.getItem(storageKeySeen);
          if (saved) seenIds = JSON.parse(saved);
        } catch (e) {
          seenIds = [];
        }

        let nevidene = formatted.filter((karta: any) => !seenIds.includes(karta.id));

        if (nevidene.length === 0) {
          localStorage.removeItem(storageKeySeen);
          nevidene = formatted;
        }

        setQuestions([...nevidene].sort(() => Math.random() - 0.5));
      }
    } else {
      setQuestions(FALLBACK_QUESTIONS);
    }
    setCurrentRound(0);
    if (gameState !== 'already_played') {
      setGameState('playing');
    }
  };

  useEffect(() => {
    fetch('https://ipwho.is/')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.country_code) {
          setUserCountry(data.country_code);
        }
      })
      .catch(() => console.log('IP detection failed'));
  }, []);

  useEffect(() => {
    const initAuthAndGame = async (currentUser: any) => {
      setUser(currentUser);
      const today = getTodayDateString();
      const storageKeyDaily = `valuer_played_daily_${today}`;

      if (currentUser) {
        const { data: dStats } = await supabase.from('stats').select('*').eq('user_id', currentUser.id).maybeSingle();
        if (dStats) {
          setDailyStats(dStats);
          if (gameMode === 'daily' && dStats.last_played_date === today) {
            setGameState('already_played');
            return;
          }
        }

        const { data: eStats } = await supabase.from('stats_endless').select('*').eq('user_id', currentUser.id).maybeSingle();
        if (eStats) {
          setEndlessStats(eStats);
          if (gameMode === 'endless' && eStats.last_played_date === today) {
            setGameState('already_played');
            return;
          }
        }

        fetchQuestions(gameMode, currentUser);
      } else {
        if (gameMode === 'daily' && localStorage.getItem(storageKeyDaily) === 'true') {
          setGameState('already_played');
        } else {
          fetchQuestions(gameMode, null);
        }
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      initAuthAndGame(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      initAuthAndGame(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [gameMode]);

  const switchMode = (mode: 'daily' | 'endless') => {
    setGameMode(mode);
    setScore(0);
    setCurrentRound(0);
  };

  const fetchLeaderboard = async (type: 'daily' | 'endless' = 'daily') => {
    setLoadingLeaderboard(true);
    setLeaderboardType(type);
    const tableName = type === 'daily' ? 'stats' : 'stats_endless';

    const allStats = await fetchAllRows(tableName);

    if (allStats) {
      const countryMap: Record<string, { total_score: number; player_count: number }> = {};
      allStats.forEach((item: any) => {
        const code = item.country_code || 'US';
        if (!countryMap[code]) countryMap[code] = { total_score: 0, player_count: 0 };
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
      if (gameMode === 'daily') {
        localStorage.setItem(`valuer_played_daily_${today}`, 'true');
      }

      if (user) {
        const saveStats = async () => {
          try {
            const tableName = gameMode === 'daily' ? 'stats' : 'stats_endless';
            const { data: currentStats } = await supabase.from(tableName).select('high_score, total_games').eq('user_id', user.id).maybeSingle();

            const newHighScore = Math.max(currentStats?.high_score || 0, score);
            const newTotalGames = (currentStats?.total_games || 0) + 1;

            if (currentStats) {
              await supabase.from(tableName).update({
                high_score: newHighScore,
                total_games: newTotalGames,
                country_code: userCountry,
                last_played_date: today,
                updated_at: new Date().toISOString()
              }).eq('user_id', user.id);
            } else {
              await supabase.from(tableName).insert({
                user_id: user.id,
                email: user.email,
                high_score: newHighScore,
                total_games: newTotalGames,
                country_code: userCountry,
                last_played_date: today,
                updated_at: new Date().toISOString()
              });
            }

            if (gameMode === 'daily') {
              const { data } = await supabase.from('stats').select('*').eq('user_id', user.id).maybeSingle();
              if (data) setDailyStats(data);
            } else {
              const { data } = await supabase.from('stats_endless').select('*').eq('user_id', user.id).maybeSingle();
              if (data) setEndlessStats(data);
            }
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

  const handleGuess = async (isHigher: boolean) => {
    const q = questions[currentRound];
    if (!q) return;

    const isCorrect = isHigher ? q.itemB.priceUSD >= q.itemA.priceUSD : q.itemB.priceUSD <= q.itemA.priceUSD;

    // Uložení viděné karty
    if (user) {
      if (gameMode === 'endless' && q.id) {
        await supabase.from('user_seen_cards').upsert({
          user_id: user.id,
          question_id: q.id
        }, { onConflict: 'user_id,question_id' });
      }
    } else {
      const storageKeySeen = `valuer_seen_cards_${gameMode}`;
      try {
        const saved = localStorage.getItem(storageKeySeen);
        let seenIds: number[] = saved ? JSON.parse(saved) : [];
        if (q.id && !seenIds.includes(q.id)) {
          seenIds.push(q.id);
          localStorage.setItem(storageKeySeen, JSON.stringify(seenIds));
        }
      } catch (e) {
        console.error('LocalStorage error:', e);
      }
    }

    setLastAnswerCorrect(isCorrect);
    if (isCorrect) {
      setScore(score + 1);
      setGameState('revealed');
    } else {
      setGameState('ended');
    }
  };

  const nextQuestion = () => {
    if (gameMode === 'daily') {
      if (currentRound + 1 < questions.length) {
        setCurrentRound(currentRound + 1);
        setGameState('playing');
      } else {
        setGameState('ended');
      }
    } else {
      const nextIdx = currentRound + 1;
      if (nextIdx >= questions.length) {
        setGameState('ended');
      } else {
        setCurrentRound(nextIdx);
        setGameState('playing');
      }
    }
  };

  const handleShare = () => {
    const text = gameMode === 'daily' 
      ? `🌍 Valuer Daily\nScore: ${score}/${questions.length}\nCan you beat my price guessing skills? 🎯` 
      : `🚀 Valuer Endless\nI scored ${score} points!\nTest your price intuition today! 💡`;
      
    navigator.clipboard.writeText(text);
    setShareNotification(true);
    setTimeout(() => setShareNotification(false), 2500);
  };

  const q = questions[currentRound] || questions[0];

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
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-1 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 px-2.5 py-2 rounded-lg text-xs text-slate-300 font-semibold transition cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()} 
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
                You have already completed today's <b>{gameMode === 'daily' ? 'Daily' : 'Endless'}</b> challenge. See you tomorrow!
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              {gameMode === 'daily' && (
                <button 
                  onClick={() => switchMode('endless')}
                  className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base border border-slate-700 flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                >
                  <Zap className="w-5 h-5 text-amber-400" /> Try Endless Mode
                </button>
              )}
              <button 
                onClick={() => openLeaderboard(gameMode)}
                className="w-full bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base border border-slate-800 flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <Globe className="w-5 h-5 text-amber-400" /> View Leaderboard
              </button>
            </div>
          </main>
        ) : gameState !== 'ended' && q ? (
          /* Main Game Screen */
          <main className="flex-1 flex flex-col justify-center gap-6 my-6 lg:my-10">
            <div className="flex justify-between items-center max-w-xl mx-auto w-full text-xs lg:text-sm text-slate-400 font-semibold tracking-wider">
              <span>{gameMode === 'daily' ? `ROUND ${currentRound + 1} OF ${questions.length}` : `ENDLESS MODE (Q: ${currentRound + 1})`}</span>
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
              <h2 className="text-3xl lg:text-4xl font-black">{gameMode === 'daily' ? 'Daily Complete!' : 'Endless Run Ended!'}</h2>
              <p className="text-slate-400 mt-2 text-sm lg:text-base">
                {gameMode === 'daily' 
                  ? `You got ${score} out of ${questions.length} correct` 
                  : `Your final score is ${score} points! Come back tomorrow for another run.`}
              </p>
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
        </footer>
      </div>

      {/* Modals */}
      {isProfileOpen && <AuthModal isOpen={false} onClose={() => setIsProfileOpen(false)} />}
      {isHelpOpen && <AuthModal isOpen={false} onClose={() => setIsHelpOpen(false)} />}
      {isLeaderboardOpen && <AuthModal isOpen={false} onClose={() => setIsLeaderboardOpen(false)} />}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
