-- Lessons, strategy rules, and content explanation migration

-- ============================================
-- NEW TABLES
-- ============================================

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE classroom_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  rule_text TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MODIFY EXISTING TABLES
-- ============================================

ALTER TABLE learn_content ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL;
ALTER TABLE learn_content ADD COLUMN IF NOT EXISTS explanation TEXT;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_lessons_classroom_id ON lessons(classroom_id);
CREATE INDEX idx_classroom_rules_classroom_id ON classroom_rules(classroom_id);
CREATE INDEX idx_learn_content_lesson_id ON learn_content(lesson_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_rules ENABLE ROW LEVEL SECURITY;

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

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classroom_rules_updated_at
  BEFORE UPDATE ON classroom_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
