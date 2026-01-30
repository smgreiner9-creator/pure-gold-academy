-- Phase 4B: Automated Progress Reports
-- Creates progress_reports table for teacher-generated student progress reports

CREATE TABLE IF NOT EXISTS progress_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_data JSONB NOT NULL DEFAULT '{}',
  teacher_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_progress_reports_user ON progress_reports(user_id);
CREATE INDEX idx_progress_reports_classroom ON progress_reports(classroom_id);
CREATE UNIQUE INDEX idx_progress_reports_unique ON progress_reports(user_id, classroom_id, period_start, period_end);

-- RLS
ALTER TABLE progress_reports ENABLE ROW LEVEL SECURITY;

-- Students can read their own reports
CREATE POLICY "Students can read own reports"
  ON progress_reports
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- Teachers can read reports for students in their classrooms
CREATE POLICY "Teachers can read classroom reports"
  ON progress_reports
  FOR SELECT
  USING (classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

-- Teachers can insert reports for students in their classrooms
CREATE POLICY "Teachers can create classroom reports"
  ON progress_reports
  FOR INSERT
  WITH CHECK (classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));

-- Teachers can update reports for students in their classrooms
CREATE POLICY "Teachers can update classroom reports"
  ON progress_reports
  FOR UPDATE
  USING (classroom_id IN (
    SELECT id FROM classrooms WHERE teacher_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  ));
