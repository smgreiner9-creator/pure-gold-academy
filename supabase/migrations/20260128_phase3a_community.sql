-- Phase 3A: Threaded Discussions + Voting
-- Add new columns to community_posts
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS post_type VARCHAR DEFAULT 'discussion';

-- Add parent_comment_id for threaded comments
ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id UUID DEFAULT NULL REFERENCES community_comments(id) ON DELETE CASCADE;

-- Create community_votes table
CREATE TABLE IF NOT EXISTS community_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_post_vote UNIQUE (user_id, post_id),
  CONSTRAINT unique_user_comment_vote UNIQUE (user_id, comment_id),
  CONSTRAINT vote_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Index for faster vote lookups
CREATE INDEX IF NOT EXISTS idx_community_votes_post ON community_votes(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_votes_comment ON community_votes(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_votes_user ON community_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_parent ON community_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON community_posts(category);

-- RLS policies for community_votes
ALTER TABLE community_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all votes" ON community_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own votes" ON community_votes
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = community_votes.user_id));

CREATE POLICY "Users can update their own votes" ON community_votes
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = community_votes.user_id));

CREATE POLICY "Users can delete their own votes" ON community_votes
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = community_votes.user_id));
