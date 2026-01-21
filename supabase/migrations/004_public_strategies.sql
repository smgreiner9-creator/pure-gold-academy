-- Public strategy visibility

ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

CREATE POLICY "Anyone can view public classrooms" ON classrooms FOR SELECT
  USING (
    is_public = true
  );
