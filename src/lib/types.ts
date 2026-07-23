export interface PriceItem {
  emoji: string;
  name: string;
  country: string;
  countryCode: string;
  price: number;
  unit: string;
  fact: string;
}

export interface Comparison {
  id: string;
  a: PriceItem;
  b: PriceItem;
}

export interface LeaderboardEntry {
  country_code: string;
  country_name: string;
  avg_score: number;
  play_count: number;
  win_rate: number;
}

export type GamePhase = 'start' | 'playing' | 'reveal' | 'end';
