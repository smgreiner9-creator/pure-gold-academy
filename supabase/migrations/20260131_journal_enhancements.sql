-- Journal Enhancement: Setup types, new columns, weekly focus tracking

-- Setup type for playbook feature
DO $$ BEGIN
  CREATE TYPE setup_type AS ENUM (
    'breakout', 'pullback', 'reversal', 'range',
    'trend_continuation', 'news', 'custom'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- New columns on journal_entries
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS setup_type setup_type DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS setup_type_custom text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS execution_rating smallint DEFAULT NULL CHECK (execution_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS reflection_notes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS import_source text DEFAULT NULL;

-- Weekly focus tracking
CREATE TABLE IF NOT EXISTS weekly_focus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  week_start date NOT NULL,
  focus_text text NOT NULL,
  focus_type text NOT NULL,
  improvement_score numeric(5,2) DEFAULT NULL,
  reviewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE weekly_focus ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users own weekly focus" ON weekly_focus
    FOR ALL USING (auth.uid()::text = user_id::text);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
