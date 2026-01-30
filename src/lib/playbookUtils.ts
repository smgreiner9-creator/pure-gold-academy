import type { JournalEntry } from '@/types/database'

export interface SetupStats {
  setupType: string
  label: string
  totalTrades: number
  wins: number
  losses: number
  breakevens: number
  winRate: number
  avgR: number
  totalR: number
  isEdge: boolean
}

const SETUP_LABELS: Record<string, string> = {
  breakout: 'Breakout',
  pullback: 'Pullback',
  reversal: 'Reversal',
  range: 'Range',
  trend_continuation: 'Trend Continuation',
  news: 'News',
  custom: 'Custom',
}

export function getSetupLabel(setupType: string): string {
  return SETUP_LABELS[setupType] || setupType
}

export function calculatePlaybookStats(entries: JournalEntry[]): SetupStats[] {
  const grouped = new Map<string, JournalEntry[]>()

  for (const entry of entries) {
    if (!entry.setup_type) continue

    let key: string

    if (entry.setup_type === 'custom') {
      const customName = entry.setup_type_custom?.trim()
      if (!customName) continue
      key = `custom:${customName.toLowerCase()}`
    } else {
      key = entry.setup_type
    }

    const group = grouped.get(key)
    if (group) {
      group.push(entry)
    } else {
      grouped.set(key, [entry])
    }
  }

  const stats: SetupStats[] = []

  for (const [key, group] of grouped) {
    const wins = group.filter((e) => e.outcome === 'win').length
    const losses = group.filter((e) => e.outcome === 'loss').length
    const breakevens = group.filter((e) => e.outcome === 'breakeven').length
    const closedTrades = wins + losses + breakevens
    const winRate = closedTrades > 0 ? (wins / closedTrades) * 100 : 0

    const rMultiples = group
      .filter((e) => e.r_multiple !== null)
      .map((e) => e.r_multiple as number)
    const totalR = rMultiples.reduce((sum, r) => sum + r, 0)
    const avgR = rMultiples.length > 0 ? totalR / rMultiples.length : 0

    const setupType = key.startsWith('custom:') ? key : key
    const label = key.startsWith('custom:')
      ? key.slice('custom:'.length)
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : getSetupLabel(key)

    stats.push({
      setupType,
      label,
      totalTrades: group.length,
      wins,
      losses,
      breakevens,
      winRate: Math.round(winRate * 10) / 10,
      avgR: Math.round(avgR * 100) / 100,
      totalR: Math.round(totalR * 100) / 100,
      isEdge: group.length >= 5 && winRate > 55,
    })
  }

  stats.sort((a, b) => b.totalTrades - a.totalTrades)

  return stats
}
