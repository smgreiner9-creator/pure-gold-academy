-- Phase 1B: Add pre-trade mindset capture to journal entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS pre_trade_mindset JSONB DEFAULT NULL;

COMMENT ON COLUMN journal_entries.pre_trade_mindset IS 'Pre-trade mental state: readiness score (1-5) and psychological tags';
