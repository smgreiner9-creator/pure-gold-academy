-- Phase 1A: Add chart data to journal entries
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS chart_data JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN journal_entries.chart_data IS 'TradingView chart state with annotations, stored as JSON';
