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

interface Item {
  id: number;
  title: string;
  price: number;
  image_url?: string;
}

interface CountryStats {
  country_code: string;
  total_score: number;
  player_count: number;
}

export default function App() {
  const [currency, setCurrency] = useState('USD');
  const [userCountry, setUserCountry] = useState('US');

  // Supabase items & game flow
  const [questions, setQuestions] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [gameState, setGameState] = useState<'playing' | 'revealed' | 'ended' | 'already_played'>('playing');
  const [guessResult, setGuessResult] = useState<boolean | null>(null);
  const [revealedPrice, setRevealedPrice] = useState<number | null>(null);

  // Auth & Modals
  const [user, setUser] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [countryLeaders, setCountryLeaders] = useState<CountryStats[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

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

  // Fetch items from DB and check daily play status
  useEffect(() => {
    async function init(currentUser: any) {
      setUser(currentUser);
      try {
        setLoading(true);

        if (currentUser) {
          const { data: stats, error: statsError } = await supabase
            .from('stats')
            .select('last_played_date')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (!statsError && stats) {
            const today = getTodayDateString();
            if (stats.last_played_date === today) {
              setGameState('already_played');
              setLoading(false);
              return;
            }
          }
        }

        const { data, error } = await supabase.from('questions').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('No questions found in the database.');
        }

        setQuestions(data.sort(() => Math.random() - 0.5));
      } catch (err: any) {
        setError(err.message || 'Initialization error.');
      } finally {
        setLoading(false);
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      init(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      init(session?.user ?? null);
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

  // Save game results securely when ended
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
          const newTotalGames = (currentStats?.total_games || 0) + 1;

          if (currentStats) {
            await supabase
              .from('stats')
              .update({
                high_score: newHighScore,
                total_games: newTotalGames,
                country_code: userCountry,
                last_played_date: today,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);
          } else {
            await supabase
              .from('stats')
              .insert({
                user_id: user.id,
                email: user.email,
                high_score: newHighScore,
                total_games: newTotalGames,
                country_code: userCountry,
                last_played_date: today,
                updated_at: new Date().toISOString()
              });
          }
        } catch (err) {
          console.error('Error saving score:', err);
        }
      };
      saveStats();
    }
  }, [gameState, user, score, userCountry]);

  const formatPrice = (priceInBase: number) => {
    const { rate, symbol } = EXCHANGE_RATES[currency as keyof typeof EXCHANGE_RATES];
    const converted = Math.round(priceInBase * rate);
    return currency === 'CZK' ? `${converted} ${symbol}` : `${symbol}${converted}`;
  };

  const currentItem = questions[currentIndex];
  const nextItem = questions[(currentIndex + 1) % questions.length];

  const handleGuess = (higher: boolean) => {
    if (gameState !== 'playing' || !currentItem || !nextItem) return;

    const isHigher = nextItem.price >= currentItem.price;
    const correct = higher === isHigher;

    setGuessResult(correct);
    setRevealedPrice(nextItem.price);
    setGameState('revealed');

    if (correct) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (!guessResult) {
      setGameState('ended');
      return;
    }

    if (currentIndex + 1 >= questions.length) {
      setGameState('ended');
    } else {
      setCurrentIndex(prev => prev + 1);
      setGameState('playing');
      setGuessResult(null);
      setRevealedPrice(null);
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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 lg:p-8 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-between z-10">
        
        {/* Header */}
        <header className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-4xl font-black tracking-wider text-emerald-400">VALUER</h1>
            <span className="text-xs lg:text-sm bg-slate-900 text-slate-300 px-3 py-1 rounded-full font-bold border border-slate-800">
              Score: <strong className="text-emerald-400">{score}</strong>
            </span>
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
          /* Main Game Screen (Higher / Lower Endless Stream) */
          <main className="flex-1 flex flex-col justify-center gap-6 my-6 lg:my-10">
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-12 items-stretch max-w-4xl mx-auto w-full">
              
              {/* CURRENT ITEM */}
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-2xl min-h-[320px]">
                {currentItem?.image_url && (
                  <div className="w-full h-36 mb-4 rounded-2xl overflow-hidden bg-slate-800">
                    <img src={currentItem.image_url} alt={currentItem.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold leading-snug">{currentItem?.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">costs</p>
                </div>
                <div className="text-2xl lg:text-4xl font-black text-emerald-400 mt-4 pt-4 border-t border-slate-800">
                  {formatPrice(currentItem?.price || 0)}
                </div>
              </div>

              <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-950 border-2 border-slate-800 text-slate-400 font-black text-sm w-12 h-12 rounded-full items-center justify-center shadow-2xl">
                VS
              </div>

              {/* NEXT ITEM */}
              <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-3xl p-6 lg:p-8 flex flex-col justify-between shadow-2xl min-h-[320px]">
                {nextItem?.image_url && (
                  <div className="w-full h-36 mb-4 rounded-2xl overflow-hidden bg-slate-800">
                    <img src={nextItem.image_url} alt={nextItem.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold leading-snug">{nextItem?.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">costs...</p>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  {gameState === 'revealed' ? (
                    <span className={`text-2xl lg:text-4xl font-black ${guessResult ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {revealedPrice !== null ? formatPrice(revealedPrice) : ''}
                    </span>
                  ) : (
                    <div className="text-2xl lg:text-4xl font-black text-slate-700">? ? ?</div>
                  )}
                </div>
              </div>
            </div>

            {gameState === 'playing' ? (
              <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto w-full mt-4">
                <button 
                  onClick={() => handleGuess(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all font-black py-4 lg:py-5 rounded-2xl text-lg lg:text-xl shadow-xl shadow-emerald-950/50 cursor-pointer"
                >
                  Higher 📈
                </button>
                <button 
                  onClick={() => handleGuess(false)}
                  className="bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all font-bold py-4 lg:py-5 rounded-2xl text-lg lg:text-xl border border-slate-700 shadow-xl cursor-pointer"
                >
                  Lower 📉
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-xl mx-auto w-full mt-2">
                <div className={`p-4 lg:p-5 rounded-2xl border flex items-center gap-3 ${guessResult ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300' : 'bg-rose-950/70 border-rose-800 text-rose-300'}`}>
                  {guessResult ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" /> : <XCircle className="w-6 h-6 text-rose-400 shrink-0" />}
                  <span className="font-bold text-base lg:text-lg">{guessResult ? 'Correct! Loading next item...' : 'Wrong! Game Over.'}</span>
                </div>

                <button 
                  onClick={nextQuestion}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition font-bold py-4 rounded-2xl text-base lg:text-lg cursor-pointer shadow-lg text-slate-950"
                >
                  {guessResult ? 'NEXT ITEM →' : 'VIEW RESULTS →'}
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
              <h2 className="text-3xl lg:text-4xl font-black">Game Over</h2>
              <p className="text-slate-400 mt-2 text-sm lg:text-base">Final Score: <span className="text-emerald-400 font-bold">{score}</span></p>
            </div>

            {!user ? (
              <p className="text-xs text-amber-400 bg-amber-950/40 p-3 rounded-xl border border-amber-800/40">
                ⚠️ Please sign in to record your score for your country!
              </p>
            ) : (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/40">
                ✅ Score saved to your country leaderboard!
              </p>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all font-bold py-4 rounded-2xl text-base lg:text-lg flex items-center justify-center gap-2 shadow-xl cursor-pointer text-slate-950"
            >
              Play Again
            </button>
          </main>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-slate-600 pt-4 border-t border-slate-900">
          Valuer © 2026 • Compare prices and test your knowledge.
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
              <div className="text-center py-8 text-slate-400">No country data recorded yet.</div>
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
