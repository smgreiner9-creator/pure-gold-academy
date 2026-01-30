-- Phase 2A: Public Teacher Profiles
-- Add profile fields for public teacher pages
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(100) DEFAULT NULL;

-- Unique index on slug for URL routing
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug) WHERE slug IS NOT NULL;

-- Topic reviews table
CREATE TABLE IF NOT EXISTS topic_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  teacher_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topic_reviews_classroom ON topic_reviews(classroom_id);
CREATE INDEX IF NOT EXISTS idx_topic_reviews_student ON topic_reviews(student_id);

-- Unique constraint: one review per student per classroom
CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_reviews_unique ON topic_reviews(student_id, classroom_id);

-- RLS
ALTER TABLE topic_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Reviews are publicly readable" ON topic_reviews FOR SELECT USING (true);

-- Students can insert their own reviews
CREATE POLICY "Students can create reviews" ON topic_reviews FOR INSERT
  WITH CHECK (student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Students can update their own reviews
CREATE POLICY "Students can update own reviews" ON topic_reviews FOR UPDATE
  USING (student_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Teachers can respond to reviews on their classrooms
CREATE POLICY "Teachers can respond to reviews" ON topic_reviews FOR UPDATE
  USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

COMMENT ON TABLE topic_reviews IS 'Student ratings and reviews for classrooms/topics';
COMMENT ON COLUMN profiles.bio IS 'Teacher bio displayed on public profile';
COMMENT ON COLUMN profiles.social_links IS 'Teacher social media links as JSON';
COMMENT ON COLUMN profiles.slug IS 'URL-safe unique slug for public teacher profile';
