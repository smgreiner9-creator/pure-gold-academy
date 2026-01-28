-- Topic Simplification Migration
-- Adds content fields directly to lessons table for the new simplified teacher flow
-- Existing learn_content table and data remain unchanged for backward compatibility

-- ============================================
-- PHASE 1: Extend lessons table with content fields
-- ============================================

-- Content type for the lesson's primary content
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_type TEXT CHECK (content_type IN ('video', 'chart', 'pdf', 'text'));

-- URL for video/chart content (YouTube, Vimeo, TradingView URLs)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_url TEXT;

-- Text body for text-type lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS content_text TEXT;

-- Teacher's explanation/commentary (always present)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS explanation TEXT NOT NULL DEFAULT '';

-- Draft/published status
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published'));

-- File attachment URLs (supplementary PDFs, images)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';

-- Teacher who created the lesson (for RLS and ownership)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ============================================
-- PHASE 2: Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_lessons_teacher_id ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

-- ============================================
-- PHASE 3: Storage bucket for lesson attachments
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-attachments', 'lesson-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lesson-attachments bucket
CREATE POLICY "Teachers can upload lesson attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'teacher')
);

CREATE POLICY "Anyone can view lesson attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-attachments');

CREATE POLICY "Teachers can delete their lesson attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lesson-attachments' AND
  auth.uid() IS NOT NULL AND
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'teacher')
);
