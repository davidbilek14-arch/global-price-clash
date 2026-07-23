import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Trophy, CheckCircle2, XCircle, Share2, LogOut, X, Globe, CalendarCheck2 } from 'lucide-react';
import AuthModal from './AuthModal';

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

interface CountryStats {
  country_code: string;
  total_score: number;
  player_count: number;
}

export default function App() {
  const [currency, setCurrency] = useState('USD');
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'revealed' | 'ended' | 'already_played'>('playing');
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [userCountry, setUserCountry] = useState('US');

  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [countryLeaders, setCountryLeaders] = useState<CountryStats[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // Auto-detect country via IP
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_code) {
          setUserCountry(data.country_code);
        }
      })
      .catch(() => console.log('IP detection failed, defaulting to US'));
  }, []);

  // Check Auth & Daily Played Status
  useEffect(() => {
    const checkUserAndDailyStatus = async (currentUser: any) => {
      setUser(currentUser);

      if (currentUser) {
        const { data: stats, error } = await supabase
          .from('stats')
          .select('last_played_date')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking user status:', error);
        }

        if (stats) {
          const today = getTodayDateString();
          if (stats.last_played_date === today) {
            setGameState('already_played');
          }
        }
      }
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      checkUserAndDailyStatus(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserAndDailyStatus(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Leaderboard
  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);

    const { data: allStats, error } = await supabase
      .from('stats')
      .select('country_code, high_score');

    if (error) {
      console.error('Error fetching leaderboard data:', error);
      setLoadingLeaderboard(false);
      return;
    }

    if (allStats) {
      console.log('Fetched raw stats for leaderboard:', allStats);
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

  const openLeaderboard = () => {
    fetchLeaderboard();
    setIsLeaderboardOpen(true);
  };

  // Save game results & lock for today
  useEffect(() => {
    if (gameState === 'ended' && user) {
      const saveStats = async () => {
        try {
          const today = getTodayDateString();

          const { data: currentStats } = await supabase
            .from('stats')
            .select('high_score, total_games')
            .eq('user_id', user.id)
            .maybeSingle();

          const newHighScore = Math.max(currentStats?.high_score || 0, score);

          const { error } = await supabase.from('stats').upsert({
            user_id: user.id,
            email: user.email,
            high_score: newHighScore,
            total_games: (currentStats?.total_games || 0) + 1,
            country_code: userCountry,
            last_played_date: today,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

          if (error) {
            console.error('Supabase upsert error:', error);
          } else {
            console.log('Score & Daily Status successfully recorded!');
          }
        } catch (err) {
          console.error('Error saving score:', err);
        }
      };

      saveStats();
    }
  }, [gameState, user, score, userCountry]);

  const formatPrice = (priceUSD: number) => {
    const { rate, symbol } = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES];
    const converted = Math.round(priceUSD * rate);
    return currency === 'CZK' ? `${converted} ${symbol}` : `${symbol}${converted}`;
  };

  const handleGuess = (isHigher: boolean) => {
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

  const q = DAILY_QUESTIONS[currentRound];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 lg:p-8 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-between z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-4xl font-black tracking-wider text-emerald-400">VALUER</h1>
            <span className="text-xs lg:text-sm bg-emerald-950/80 text-emerald-400 px-3 py-1 rounded-full font-bold border border-emerald-800/60">DAILY</span>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={openLeaderboard}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 hover:border-amber-500/50 text-amber-400 text-xs lg:text-sm font-bold px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Country Leaderboard</span>
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
              <h2 className="text-3xl lg:text-4xl font-black">Played Today!</h2>
              <p className="text-slate-400 mt-2 text-sm lg:text-base leading-relaxed">
                You have already completed today's challenge. Come back tomorrow for a new set of prices!
              </p>
            </div>

            <button 
              onClick={openLeaderboard}
              className="w-full bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base border border-slate-700 flex items-center justify-center gap-2 shadow-xl cursor-pointer"
            >
              <Globe className="w-5 h-5 text-amber-400" /> View Country Leaderboard
            </button>
          </main>
        ) : gameState !== 'ended' ? (
          /* Main Game Screen */
          <main className="flex-1 flex flex-col justify-center gap-6 my-6 lg:my-10">
            <div className="text-center text-xs lg:text-sm text-slate-400 font-semibold tracking-wider">
              ROUND {currentRound + 1} OF {DAILY_QUESTIONS.length}
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
              <h2 className="text-3xl lg:text-4xl font-black">Daily Complete!</h2>
              <p className="text-slate-400 mt-2 text-sm lg:text-base">You got <span className="text-emerald-400 font-bold">{score}</span> out of {DAILY_QUESTIONS.length} correct</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 w-full flex justify-center shadow-xl">
              <div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Accuracy</div>
                <div className="text-2xl lg:text-3xl font-black text-emerald-400 mt-1">{(score / DAILY_QUESTIONS.length) * 100}%</div>
              </div>
            </div>

            {!user ? (
              <p className="text-xs text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-800/40">
                ⚠️ Please sign in to record your score for your country!
              </p>
            ) : (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                ✅ Score saved! See you tomorrow for new questions.
              </p>
            )}

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

      {/* Modal - Country Leaderboard */}
      {isLeaderboardOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setIsLeaderboardOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center gap-2 mb-6">
              <Globe className="w-7 h-7 text-amber-400" />
              <h2 className="text-2xl font-black text-amber-400">COUNTRY LEADERBOARD</h2>
            </div>

            {loadingLeaderboard ? (
              <div className="text-center py-8 text-slate-400">Loading rankings...</div>
            ) : countryLeaders.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No country data recorded yet. (Play & save a score first!)</div>
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
