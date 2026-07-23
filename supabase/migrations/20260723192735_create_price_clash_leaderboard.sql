/*
# Create leaderboard table for World Price Clash

1. New Tables
- `leaderboard`
  - `id` (uuid, primary key)
  - `country_code` (text, not null) — ISO 2-letter country code (e.g. "US", "CZ")
  - `country_name` (text, not null) — human-readable country name
  - `score` (integer, not null) — number of correct answers out of 5
  - `total` (integer, not null, default 5) — total questions
  - `day_key` (text, not null) — date string YYYY-MM-DD the result belongs to
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `leaderboard`.
- Allow anon + authenticated to INSERT and SELECT (public/shared leaderboard data, no sign-in).
- No UPDATE or DELETE needed.

3. Notes
- This is a single-tenant no-auth app; the leaderboard is intentionally public.
- One row per play per day per visitor (enforced in app logic, not DB).
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  country_name text NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL DEFAULT 5,
  day_key text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_day_key_idx ON leaderboard (day_key);
CREATE INDEX IF NOT EXISTS leaderboard_country_code_idx ON leaderboard (country_code);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leaderboard" ON leaderboard;
CREATE POLICY "anon_select_leaderboard" ON leaderboard FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_leaderboard" ON leaderboard;
CREATE POLICY "anon_insert_leaderboard" ON leaderboard FOR INSERT
  TO anon, authenticated WITH CHECK (true);
