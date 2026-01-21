-- Pure Gold Trading Academy Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE subscription_tier AS ENUM ('free', 'premium');
CREATE TYPE emotion_type AS ENUM ('calm', 'confident', 'anxious', 'fearful', 'greedy', 'frustrated', 'neutral');
CREATE TYPE trade_direction AS ENUM ('long', 'short');
CREATE TYPE trade_outcome AS ENUM ('win', 'loss', 'breakeven');
CREATE TYPE content_type AS ENUM ('video', 'pdf', 'image', 'text');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'student',
  subscription_tier subscription_tier DEFAULT 'free',
  classroom_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms table
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  journaling_rules JSONB DEFAULT '{"required_fields": ["instrument", "direction", "entry_price", "emotion_before"], "custom_rules": []}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for profiles.classroom_id
ALTER TABLE profiles ADD CONSTRAINT profiles_classroom_fk FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL;

-- Journal entries table
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE SET NULL,
  instrument TEXT NOT NULL,
  direction trade_direction NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  exit_price DECIMAL(20, 8),
  position_size DECIMAL(20, 8) NOT NULL,
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  r_multiple DECIMAL(10, 2),
  pnl DECIMAL(20, 8),
  outcome trade_outcome,
  emotion_before emotion_type NOT NULL,
  emotion_during emotion_type,
  emotion_after emotion_type,
  rules_followed JSONB DEFAULT '[]',
  notes TEXT,
  screenshot_urls TEXT[] DEFAULT '{}',
  trade_date DATE NOT NULL,
  entry_time TIME,
  exit_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal feedback table
CREATE TABLE journal_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom rules table
CREATE TABLE classroom_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  rule_text TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learn content table
CREATE TABLE learn_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  explanation TEXT,
  content_type content_type NOT NULL,
  content_url TEXT,
  content_text TEXT,
  order_index INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  is_individually_priced BOOLEAN DEFAULT false,
  price DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learn progress table
CREATE TABLE learn_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES learn_content(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  progress_percent INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- Community posts table
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community comments table
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier subscription_tier DEFAULT 'free',
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watched instruments table
CREATE TABLE watched_instruments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_classroom_id ON profiles(classroom_id);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_trade_date ON journal_entries(trade_date);
CREATE INDEX idx_journal_entries_classroom_id ON journal_entries(classroom_id);
CREATE INDEX idx_lessons_classroom_id ON lessons(classroom_id);
CREATE INDEX idx_classroom_rules_classroom_id ON classroom_rules(classroom_id);
CREATE INDEX idx_learn_content_classroom_id ON learn_content(classroom_id);
CREATE INDEX idx_learn_content_lesson_id ON learn_content(lesson_id);
CREATE INDEX idx_learn_progress_user_id ON learn_progress(user_id);
CREATE INDEX idx_community_posts_classroom_id ON community_posts(classroom_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE learn_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE watched_instruments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Teachers can view students in their classroom" ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.role = 'teacher'
      AND p.id = (SELECT teacher_id FROM classrooms WHERE id = profiles.classroom_id)
    )
  );

-- Classrooms policies
CREATE POLICY "Teachers can manage their own classrooms" ON classrooms
  FOR ALL USING (
    teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Students can view their classroom" ON classrooms FOR SELECT
  USING (
    id IN (SELECT classroom_id FROM profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Anyone can view public classrooms" ON classrooms FOR SELECT
  USING (
    is_public = true
  );

-- Journal entries policies
CREATE POLICY "Users can manage their own journal entries" ON journal_entries
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Teachers can view student journal entries" ON journal_entries FOR SELECT
  USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Journal feedback policies
CREATE POLICY "Teachers can add feedback" ON journal_feedback
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'teacher')
  );
CREATE POLICY "Users can view feedback on their entries" ON journal_feedback FOR SELECT
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries WHERE user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR
    teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Lessons policies
CREATE POLICY "Teachers can manage their lessons" ON lessons
  FOR ALL USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Students can view lessons in their classroom" ON lessons FOR SELECT
  USING (
    classroom_id IN (SELECT classroom_id FROM profiles WHERE user_id = auth.uid())
  );

-- Classroom rules policies
CREATE POLICY "Teachers can manage classroom rules" ON classroom_rules
  FOR ALL USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY "Students can view classroom rules" ON classroom_rules FOR SELECT
  USING (
    classroom_id IN (SELECT classroom_id FROM profiles WHERE user_id = auth.uid())
  );

-- Learn content policies
CREATE POLICY "Teachers can manage their content" ON learn_content
  FOR ALL USING (
    teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Students can view classroom content" ON learn_content FOR SELECT
  USING (
    classroom_id IN (SELECT classroom_id FROM profiles WHERE user_id = auth.uid())
  );

-- Learn progress policies
CREATE POLICY "Users can manage their own progress" ON learn_progress
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Community posts policies
CREATE POLICY "Users can view posts in their classroom" ON community_posts FOR SELECT
  USING (
    classroom_id IN (SELECT classroom_id FROM profiles WHERE user_id = auth.uid())
    OR
    classroom_id IN (SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can create posts in their classroom" ON community_posts
  FOR INSERT WITH CHECK (
    (
      classroom_id IN (SELECT classroom_id FROM profiles WHERE user_id = auth.uid())
      OR
      classroom_id IN (SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    )
    AND title !~* '(buy now|sell now|entry:|tp:|sl:|take profit|stop loss|signal)'
    AND content !~* '(buy now|sell now|entry:|tp:|sl:|take profit|stop loss|signal)'
  );
CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ) WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND title !~* '(buy now|sell now|entry:|tp:|sl:|take profit|stop loss|signal)'
    AND content !~* '(buy now|sell now|entry:|tp:|sl:|take profit|stop loss|signal)'
  );
CREATE POLICY "Users can delete their own posts" ON community_posts
  FOR DELETE USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Community comments policies
CREATE POLICY "Users can view comments on posts they can see" ON community_comments FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM community_posts WHERE classroom_id IN (
        SELECT classroom_id FROM profiles WHERE user_id = auth.uid()
        UNION
        SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );
CREATE POLICY "Users can create comments on posts they can see" ON community_comments
  FOR INSERT WITH CHECK (
    post_id IN (
      SELECT id FROM community_posts WHERE classroom_id IN (
        SELECT classroom_id FROM profiles WHERE user_id = auth.uid()
        UNION
        SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      )
    )
  );
CREATE POLICY "Users can delete their own comments" ON community_comments
  FOR DELETE USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE
  USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON subscriptions FOR SELECT
  USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Watched instruments policies
CREATE POLICY "Users can manage their watched instruments" ON watched_instruments
  FOR ALL USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learn_content_updated_at BEFORE UPDATE ON learn_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classroom_rules_updated_at BEFORE UPDATE ON classroom_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON community_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage Buckets
-- Note: Run these in the Supabase SQL Editor or Dashboard

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-screenshots', 'journal-screenshots', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('learn-content', 'learn-content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for journal-screenshots bucket
CREATE POLICY "Users can upload journal screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'journal-screenshots' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view their own screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'journal-screenshots' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can delete their own screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'journal-screenshots' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Anyone can view public journal screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'journal-screenshots');

-- Storage policies for learn-content bucket
CREATE POLICY "Teachers can upload learn content"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'learn-content' AND
  auth.uid() IS NOT NULL AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'teacher')
);

CREATE POLICY "Anyone can view learn content"
ON storage.objects FOR SELECT
USING (bucket_id = 'learn-content');

CREATE POLICY "Teachers can delete their learn content"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'learn-content' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = (SELECT id::text FROM profiles WHERE user_id = auth.uid())
);
