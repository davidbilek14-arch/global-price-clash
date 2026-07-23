import { supabase, supabaseConfigured } from './supabase';
import type { LeaderboardEntry } from './types';

export async function submitScore(
  countryCode: string,
  countryName: string,
  score: number,
  total: number,
  dayKey: string,
): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.from('leaderboard').insert({
    country_code: countryCode,
    country_name: countryName,
    score,
    total,
    day_key: dayKey,
  });
  if (error) {
    // Non-fatal: leaderboard just won't include this play.
    console.warn('Leaderboard submit failed:', error.message);
  }
}

export async function fetchLeaderboard(dayKey: string): Promise<LeaderboardEntry[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from('leaderboard')
    .select('country_code, country_name, score, total')
    .eq('day_key', dayKey);

  if (error) {
    console.warn('Leaderboard fetch failed:', error.message);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Aggregate by country.
  const byCountry = new Map<string, { name: string; totalScore: number; plays: number }>();
  for (const row of data) {
    const existing = byCountry.get(row.country_code);
    if (existing) {
      existing.totalScore += row.score;
      existing.plays += 1;
    } else {
      byCountry.set(row.country_code, {
        name: row.country_name,
        totalScore: row.score,
        plays: 1,
      });
    }
  }

  const entries: LeaderboardEntry[] = [];
  for (const [code, agg] of byCountry) {
    const avg = agg.totalScore / agg.plays;
    entries.push({
      country_code: code,
      country_name: agg.name,
      avg_score: avg,
      play_count: agg.plays,
      win_rate: (avg / 5) * 100,
    });
  }

  entries.sort((a, b) => b.win_rate - a.win_rate);
  return entries;
}
