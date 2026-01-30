import type { UnlockLevel } from '@/types/database'

export const PROGRESSIVE_LEVELS: UnlockLevel[] = [
  { level: 1, trades: 1, title: 'Journal Activated', unlocks: ['Dashboard', 'First trading tip'] },
  { level: 2, trades: 3, title: 'First Patterns', unlocks: ['First insights', 'Trading DNA preview'] },
  { level: 3, trades: 7, title: 'Consistency Tracker', unlocks: ['Consistency Score', 'Basic patterns'] },
  { level: 4, trades: 15, title: 'Pattern Seeker', unlocks: ['Weekly Review', 'Playbook'] },
  { level: 5, trades: 30, title: 'Disciplined Trader', unlocks: ['Pre-trade nudges', 'Full analytics'] },
  { level: 6, trades: 50, title: 'Trading Pro', unlocks: ['Advanced patterns', 'Historical comparisons', 'Export'] },
]

/**
 * Returns the current UnlockLevel for the given number of trades.
 * If the user has zero trades, they still get level 1 data (but with 0 progress).
 */
export function getLevelForTrades(trades: number): UnlockLevel {
  let current = PROGRESSIVE_LEVELS[0]
  for (const level of PROGRESSIVE_LEVELS) {
    if (trades >= level.trades) {
      current = level
    } else {
      break
    }
  }
  return current
}

/**
 * Returns the next UnlockLevel the user can reach, or null if they are at max level.
 */
export function getNextLevel(trades: number): UnlockLevel | null {
  const current = getLevelForTrades(trades)
  const nextIndex = PROGRESSIVE_LEVELS.findIndex((l) => l.level === current.level) + 1
  if (nextIndex >= PROGRESSIVE_LEVELS.length) return null
  return PROGRESSIVE_LEVELS[nextIndex]
}

/**
 * Returns progress toward the next level as current count, target count, and percent.
 * If the user is at max level, percent is 100 and target equals current.
 */
export function getProgressToNextLevel(trades: number): {
  current: number
  target: number
  percent: number
} {
  const current = getLevelForTrades(trades)
  const next = getNextLevel(trades)

  if (!next) {
    return { current: trades, target: current.trades, percent: 100 }
  }

  const base = current.trades
  const progress = trades - base
  const needed = next.trades - base
  const percent = Math.min(Math.round((progress / needed) * 100), 100)

  return { current: progress, target: needed, percent }
}

/**
 * Returns true if the user's trade count unlocks the given required level.
 */
export function isFeatureUnlocked(trades: number, requiredLevel: number): boolean {
  const current = getLevelForTrades(trades)
  return current.level >= requiredLevel
}
