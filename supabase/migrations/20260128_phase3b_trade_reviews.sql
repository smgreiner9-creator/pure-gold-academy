-- Phase 3B: Chart Sharing & Trade Reviews
-- Add shared journal data columns to community_posts

ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS shared_journal_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID DEFAULT NULL;

-- Index for looking up posts by journal entry
CREATE INDEX IF NOT EXISTS idx_community_posts_journal_entry ON community_posts(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- Index for filtering by post_type
CREATE INDEX IF NOT EXISTS idx_community_posts_post_type ON community_posts(post_type);
