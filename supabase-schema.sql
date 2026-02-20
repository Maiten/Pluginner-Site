-- Pluginner FX Beta Tester Database Schema
-- Run this in Supabase SQL Editor

-- 1. Beta testers (signup form)
CREATE TABLE beta_testers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  daws TEXT[] NOT NULL,          -- e.g. {'Ableton', 'Logic'}
  daw_other TEXT,                -- free text if "Other" selected
  os TEXT NOT NULL,              -- 'Mac', 'Windows', 'Other'
  os_other TEXT,                 -- free text if "Other" selected
  genre TEXT,                    -- music genre they mainly work in
  downloaded BOOLEAN DEFAULT false
);

-- 2. Free play log entries
CREATE TABLE free_play_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tester_id UUID REFERENCES beta_testers(id) ON DELETE CASCADE,
  prompt_typed TEXT NOT NULL,
  what_happened TEXT,
  match_rating TEXT CHECK (match_rating IN ('good', 'bad', 'meh')),
  notes TEXT
);

-- 3. Challenge entries
CREATE TABLE challenge_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tester_id UUID REFERENCES beta_testers(id) ON DELETE CASCADE,
  challenge_number INT NOT NULL CHECK (challenge_number BETWEEN 1 AND 4),
  prompt_typed TEXT NOT NULL,
  what_expected TEXT,
  what_happened TEXT,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  notes TEXT
);

-- 4. Survey ratings (1-5 scale)
CREATE TABLE survey_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tester_id UUID REFERENCES beta_testers(id) ON DELETE CASCADE,
  -- UX / UI / Look & Feel
  ui_polished INT CHECK (ui_polished BETWEEN 1 AND 5),
  ui_intuitive INT CHECK (ui_intuitive BETWEEN 1 AND 5),
  ui_visual_feedback INT CHECK (ui_visual_feedback BETWEEN 1 AND 5),
  -- Usability & Accuracy
  understood_input INT CHECK (understood_input BETWEEN 1 AND 5),
  sounds_matched INT CHECK (sounds_matched BETWEEN 1 AND 5),
  clear_difference INT CHECK (clear_difference BETWEEN 1 AND 5),
  autocomplete_helpful INT CHECK (autocomplete_helpful BETWEEN 1 AND 5),
  presets_useful INT CHECK (presets_useful BETWEEN 1 AND 5),
  -- Would You Use It?
  would_use INT CHECK (would_use BETWEEN 1 AND 5),
  would_recommend INT CHECK (would_recommend BETWEEN 1 AND 5)
);

-- 5. Survey open questions
CREATE TABLE survey_open (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  tester_id UUID REFERENCES beta_testers(id) ON DELETE CASCADE,
  look_and_feel TEXT,
  when_reach_for TEXT,
  who_recommend TEXT,
  more_accurate TEXT,
  more_fun TEXT,
  biggest_improvement TEXT,
  bugs TEXT,
  would_pay TEXT
);

-- Row Level Security: allow anonymous inserts (beta testers don't have accounts)
ALTER TABLE beta_testers ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_play_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_open ENABLE ROW LEVEL SECURITY;

-- Policies: allow inserts from anon role (public)
CREATE POLICY "Allow anonymous insert" ON beta_testers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON free_play_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON challenge_log FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON survey_ratings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON survey_open FOR INSERT TO anon WITH CHECK (true);

-- Policies: allow select for anon (needed to look up tester_id by email and load previous answers)
CREATE POLICY "Allow anonymous select" ON beta_testers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous select" ON free_play_log FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous select" ON challenge_log FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous select" ON survey_ratings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous select" ON survey_open FOR SELECT TO anon USING (true);

-- Policies: allow delete for anon (needed for re-save / update pattern)
CREATE POLICY "Allow anonymous delete" ON free_play_log FOR DELETE TO anon USING (true);
CREATE POLICY "Allow anonymous delete" ON challenge_log FOR DELETE TO anon USING (true);
CREATE POLICY "Allow anonymous delete" ON survey_ratings FOR DELETE TO anon USING (true);
CREATE POLICY "Allow anonymous delete" ON survey_open FOR DELETE TO anon USING (true);
