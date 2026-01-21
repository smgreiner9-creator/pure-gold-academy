-- Security and integrity policy updates

-- Allow students to create/update their own classroom subscriptions
CREATE POLICY "Students can insert their own subscriptions" ON classroom_subscriptions
  FOR INSERT WITH CHECK (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can update their own subscriptions" ON classroom_subscriptions
  FOR UPDATE USING (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ) WITH CHECK (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Enforce no-signal content in community posts
DROP POLICY IF EXISTS "Users can create posts in their classroom" ON community_posts;
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

DROP POLICY IF EXISTS "Users can update their own posts" ON community_posts;
CREATE POLICY "Users can update their own posts" ON community_posts
  FOR UPDATE USING (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ) WITH CHECK (
    user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    AND title !~* '(buy now|sell now|entry:|tp:|sl:|take profit|stop loss|signal)'
    AND content !~* '(buy now|sell now|entry:|tp:|sl:|take profit|stop loss|signal)'
  );
