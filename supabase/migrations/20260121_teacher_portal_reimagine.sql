-- Teacher Portal Reimagination Migration
-- Phase 1-5: Trade Calls, Curriculum Tracks, Live Sessions, Classroom Enhancements

-- ============================================
-- PHASE 1: Trade Calls
-- ============================================

-- Trade call status enum
CREATE TYPE trade_call_status AS ENUM (
  'active',
  'hit_tp1',
  'hit_tp2',
  'hit_tp3',
  'hit_sl',
  'manual_close',
  'cancelled'
);

-- Trade calls table
CREATE TABLE trade_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Trade Setup
  instrument TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price DECIMAL(20, 8) NOT NULL,
  stop_loss DECIMAL(20, 8) NOT NULL,
  take_profit_1 DECIMAL(20, 8),
  take_profit_2 DECIMAL(20, 8),
  take_profit_3 DECIMAL(20, 8),
  risk_reward_ratio DECIMAL(10, 2),

  -- Analysis
  timeframe TEXT,
  analysis_text TEXT,
  chart_url TEXT,

  -- Status & Results
  status trade_call_status DEFAULT 'active',
  actual_exit_price DECIMAL(20, 8),
  result_pips DECIMAL(10, 2),
  result_percent DECIMAL(10, 2),
  closed_at TIMESTAMPTZ,
  close_notes TEXT,

  -- Metadata
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for trade_calls
CREATE INDEX idx_trade_calls_classroom_id ON trade_calls(classroom_id);
CREATE INDEX idx_trade_calls_teacher_id ON trade_calls(teacher_id);
CREATE INDEX idx_trade_calls_status ON trade_calls(status);
CREATE INDEX idx_trade_calls_published_at ON trade_calls(published_at DESC);

-- Student trade call follows (tracks which calls students copied/followed)
CREATE TABLE trade_call_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_call_id UUID NOT NULL REFERENCES trade_calls(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_call_id, student_id)
);

CREATE INDEX idx_trade_call_follows_trade_call ON trade_call_follows(trade_call_id);
CREATE INDEX idx_trade_call_follows_student ON trade_call_follows(student_id);

-- ============================================
-- PHASE 2: Curriculum Tracks
-- ============================================

-- Difficulty level enum
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Curriculum tracks table
CREATE TABLE curriculum_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_level difficulty_level DEFAULT 'beginner',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  prerequisite_track_id UUID REFERENCES curriculum_tracks(id) ON DELETE SET NULL,
  estimated_hours INTEGER,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_curriculum_tracks_classroom ON curriculum_tracks(classroom_id);
CREATE INDEX idx_curriculum_tracks_order ON curriculum_tracks(classroom_id, order_index);

-- Track modules table (groups content within tracks)
CREATE TABLE track_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES curriculum_tracks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_track_modules_track ON track_modules(track_id);
CREATE INDEX idx_track_modules_order ON track_modules(track_id, order_index);

-- Add module_id to learn_content for track-based organization
ALTER TABLE learn_content ADD COLUMN module_id UUID REFERENCES track_modules(id) ON DELETE SET NULL;
CREATE INDEX idx_learn_content_module ON learn_content(module_id);

-- Student track progress
CREATE TABLE track_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES curriculum_tracks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_module_id UUID REFERENCES track_modules(id) ON DELETE SET NULL,
  progress_percent INTEGER DEFAULT 0,
  UNIQUE(user_id, track_id)
);

CREATE INDEX idx_track_progress_user ON track_progress(user_id);
CREATE INDEX idx_track_progress_track ON track_progress(track_id);

-- Add current_track_id to profiles for tracking active learning path
ALTER TABLE profiles ADD COLUMN current_track_id UUID REFERENCES curriculum_tracks(id) ON DELETE SET NULL;

-- ============================================
-- PHASE 4: Live Sessions
-- ============================================

-- Live session status enum
CREATE TYPE live_session_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');

-- Live sessions table
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_duration_minutes INTEGER DEFAULT 60,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status live_session_status DEFAULT 'scheduled',
  stream_url TEXT,
  recording_url TEXT,
  thumbnail_url TEXT,
  max_attendees INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_live_sessions_classroom ON live_sessions(classroom_id);
CREATE INDEX idx_live_sessions_teacher ON live_sessions(teacher_id);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_live_sessions_scheduled ON live_sessions(scheduled_start);

-- Session attendees (tracks who attended)
CREATE TABLE session_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_attendees_session ON session_attendees(session_id);
CREATE INDEX idx_session_attendees_user ON session_attendees(user_id);

-- ============================================
-- PHASE 5: Classroom Enhancements
-- ============================================

-- Add new columns to classrooms
ALTER TABLE classrooms ADD COLUMN tagline TEXT;
ALTER TABLE classrooms ADD COLUMN logo_url TEXT;
ALTER TABLE classrooms ADD COLUMN banner_url TEXT;
ALTER TABLE classrooms ADD COLUMN trading_style TEXT;
ALTER TABLE classrooms ADD COLUMN markets TEXT[];
ALTER TABLE classrooms ADD COLUMN trade_calls_enabled BOOLEAN DEFAULT false;
ALTER TABLE classrooms ADD COLUMN live_sessions_enabled BOOLEAN DEFAULT false;
ALTER TABLE classrooms ADD COLUMN curriculum_enabled BOOLEAN DEFAULT false;

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS on new tables
ALTER TABLE trade_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_call_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendees ENABLE ROW LEVEL SECURITY;

-- Trade Calls Policies
CREATE POLICY "Teachers can manage their own trade calls"
  ON trade_calls FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view trade calls from their classroom"
  ON trade_calls FOR SELECT
  USING (
    classroom_id IN (
      SELECT classroom_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Trade Call Follows Policies
CREATE POLICY "Students can manage their own follows"
  ON trade_call_follows FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Teachers can view follows for their trade calls"
  ON trade_call_follows FOR SELECT
  USING (
    trade_call_id IN (
      SELECT id FROM trade_calls WHERE teacher_id = auth.uid()
    )
  );

-- Curriculum Tracks Policies
CREATE POLICY "Teachers can manage their classroom tracks"
  ON curriculum_tracks FOR ALL
  USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view published tracks from their classroom"
  ON curriculum_tracks FOR SELECT
  USING (
    is_published = true AND
    classroom_id IN (
      SELECT classroom_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Track Modules Policies
CREATE POLICY "Teachers can manage modules in their tracks"
  ON track_modules FOR ALL
  USING (
    track_id IN (
      SELECT ct.id FROM curriculum_tracks ct
      JOIN classrooms c ON ct.classroom_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view modules from published tracks"
  ON track_modules FOR SELECT
  USING (
    track_id IN (
      SELECT ct.id FROM curriculum_tracks ct
      WHERE ct.is_published = true AND
      ct.classroom_id IN (
        SELECT classroom_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Track Progress Policies
CREATE POLICY "Users can manage their own track progress"
  ON track_progress FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view progress in their tracks"
  ON track_progress FOR SELECT
  USING (
    track_id IN (
      SELECT ct.id FROM curriculum_tracks ct
      JOIN classrooms c ON ct.classroom_id = c.id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Live Sessions Policies
CREATE POLICY "Teachers can manage their own sessions"
  ON live_sessions FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view sessions from their classroom"
  ON live_sessions FOR SELECT
  USING (
    classroom_id IN (
      SELECT classroom_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Session Attendees Policies
CREATE POLICY "Users can manage their own attendance"
  ON session_attendees FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view attendees for their sessions"
  ON session_attendees FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM live_sessions WHERE teacher_id = auth.uid()
    )
  );

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trade_calls_updated_at
  BEFORE UPDATE ON trade_calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_tracks_updated_at
  BEFORE UPDATE ON curriculum_tracks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_track_modules_updated_at
  BEFORE UPDATE ON track_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
