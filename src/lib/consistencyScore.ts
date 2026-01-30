import type { JournalEntry, ConsistencyScoreBreakdown } from '@/types/database'

const GOOD_EMOTIONS = new Set(['calm', 'confident', 'neutral'])
const MIN_RULES_COUNT = 4
const TARGET_UNIQUE_DAYS = 14
const RECENT_ENTRIES_LIMIT = 20

/**
 * Calculate the consistency score breakdown from a set of journal entries.
 * Uses the most recent 20 entries (or all if fewer).
 *
 * Weights:
 *  - Rule Adherence:          40%
 *  - Risk Management:         25%
 *  - Emotional Discipline:    20%
 *  - Journaling Consistency:  15%
 */
export function calculateConsistencyScore(
  entries: JournalEntry[],
): ConsistencyScoreBreakdown {
  if (entries.length === 0) {
    return {
      ruleAdherence: 0,
      riskManagement: 0,
      emotionalDiscipline: 0,
      journalingConsistency: 0,
      overall: 0,
    }
  }

  // Sort by trade_date descending and take the most recent entries
  const sorted = [...entries]
    .sort(
      (a, b) =>
        new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime(),
    )
    .slice(0, RECENT_ENTRIES_LIMIT)

  const total = sorted.length

  // --- 1. Rule Adherence (40%) ---
  // Percentage of trades where the trader followed 4+ rules
  const tradesWithEnoughRules = sorted.filter((e) => {
    const rules = Array.isArray(e.rules_followed) ? e.rules_followed : []
    return rules.length >= MIN_RULES_COUNT
  }).length

  const ruleAdherence = Math.round((tradesWithEnoughRules / total) * 100)

  // --- 2. Risk Management (25%) ---
  // Percentage of trades that have a stop-loss set
  const tradesWithSL = sorted.filter(
    (e) => e.stop_loss !== null && e.stop_loss !== undefined,
  ).length

  const riskManagement = Math.round((tradesWithSL / total) * 100)

  // --- 3. Emotional Discipline (20%) ---
  // Percentage of trades entered while calm, confident, or neutral
  const tradesWithGoodEmotion = sorted.filter((e) =>
    GOOD_EMOTIONS.has(e.emotion_before),
  ).length

  const emotionalDiscipline = Math.round(
    (tradesWithGoodEmotion / total) * 100,
  )

  // --- 4. Journaling Consistency (15%) ---
  // Based on unique trading days across the recent entries
  const uniqueDays = new Set(
    sorted.map((e) => e.trade_date.slice(0, 10)),
  ).size

  const journalingConsistency = Math.round(
    Math.min(100, (uniqueDays / TARGET_UNIQUE_DAYS) * 100),
  )

  // --- Overall weighted score ---
  const overall = Math.round(
    ruleAdherence * 0.4 +
      riskManagement * 0.25 +
      emotionalDiscipline * 0.2 +
      journalingConsistency * 0.15,
  )

  return {
    ruleAdherence,
    riskManagement,
    emotionalDiscipline,
    journalingConsistency,
    overall,
  }
}
