-- Backfill classroom_subscriptions for students who have profiles.classroom_id
-- but no matching subscription record. This ensures multi-classroom support
-- works for existing students.

INSERT INTO classroom_subscriptions (student_id, classroom_id, status, current_period_start)
SELECT
  p.id AS student_id,
  p.classroom_id,
  'active' AS status,
  NOW() AS current_period_start
FROM profiles p
WHERE p.classroom_id IS NOT NULL
  AND p.role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM classroom_subscriptions cs
    WHERE cs.student_id = p.id
      AND cs.classroom_id = p.classroom_id
  )
ON CONFLICT (student_id, classroom_id) DO NOTHING;
