import type { JournalEntry, EmotionType } from '@/types/database'

export type InsightSeverity = 'info' | 'warning' | 'success' | 'danger'
export type InsightTag =
  | 'emotion'
  | 'instrument'
  | 'time'
  | 'risk'
  | 'discipline'
  | 'streak'
  | 'pattern'

export interface Insight {
  id: string
  severity: InsightSeverity
  tag: InsightTag
  title: string
  message: string
  stat?: string
  icon: string
}

const EMOTION_LABELS: Record<EmotionType, string> = {
  calm: 'calm',
  confident: 'confident',
  anxious: 'anxious',
  fearful: 'fearful',
  greedy: 'greedy',
  frustrated: 'frustrated',
  neutral: 'neutral',
}

const NEGATIVE_EMOTIONS: EmotionType[] = ['anxious', 'fearful', 'greedy', 'frustrated']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function winRate(entries: JournalEntry[]): number {
  const decided = entries.filter((e) => e.outcome === 'win' || e.outcome === 'loss')
  if (decided.length === 0) return 0
  return decided.filter((e) => e.outcome === 'win').length / decided.length
}

function avgR(entries: JournalEntry[]): number {
  const withR = entries.filter((e) => e.r_multiple !== null)
  if (withR.length === 0) return 0
  return withR.reduce((sum, e) => sum + (e.r_multiple ?? 0), 0) / withR.length
}

export function generateInsights(entries: JournalEntry[]): Insight[] {
  if (entries.length < 5) return []

  const insights: Insight[] = []
  const overallWinRate = winRate(entries)

  // ── 1. Emotion-based insights ──
  const emotionGroups = new Map<EmotionType, JournalEntry[]>()
  for (const e of entries) {
    if (!emotionGroups.has(e.emotion_before)) {
      emotionGroups.set(e.emotion_before, [])
    }
    emotionGroups.get(e.emotion_before)!.push(e)
  }

  for (const emotion of NEGATIVE_EMOTIONS) {
    const group = emotionGroups.get(emotion)
    if (!group || group.length < 3) continue

    const emotionWR = winRate(group)
    const diff = overallWinRate - emotionWR

    if (diff > 0.15) {
      const lossRate = Math.round((1 - emotionWR) * 100)
      insights.push({
        id: `emotion-${emotion}`,
        severity: 'warning',
        tag: 'emotion',
        title: 'Emotional Trading Pattern',
        message: `You lose ${lossRate}% of trades when feeling ${EMOTION_LABELS[emotion]}. Consider skipping trades in that emotional state.`,
        stat: `${lossRate}% loss rate`,
        icon: 'psychology',
      })
    }
  }

  // Best emotion
  let bestEmotion: EmotionType | null = null
  let bestEmotionWR = 0
  for (const [emotion, group] of emotionGroups) {
    if (group.length < 3) continue
    const wr = winRate(group)
    if (wr > bestEmotionWR) {
      bestEmotionWR = wr
      bestEmotion = emotion
    }
  }
  if (bestEmotion && bestEmotionWR > overallWinRate + 0.1) {
    insights.push({
      id: 'emotion-best',
      severity: 'success',
      tag: 'emotion',
      title: 'Optimal Trading State',
      message: `You win ${Math.round(bestEmotionWR * 100)}% of trades when ${EMOTION_LABELS[bestEmotion]}. Try to trade more often in this state.`,
      stat: `${Math.round(bestEmotionWR * 100)}% win rate`,
      icon: 'mood',
    })
  }

  // ── 2. Day-of-week insights ──
  const dayGroups = new Map<number, JournalEntry[]>()
  for (const e of entries) {
    const day = new Date(e.trade_date).getDay()
    if (!dayGroups.has(day)) dayGroups.set(day, [])
    dayGroups.get(day)!.push(e)
  }

  for (const [day, group] of dayGroups) {
    if (group.length < 3) continue
    const dayWR = winRate(group)

    if (dayWR < 0.35 && overallWinRate - dayWR > 0.15) {
      insights.push({
        id: `day-worst-${day}`,
        severity: 'danger',
        tag: 'time',
        title: `${DAY_NAMES[day]} Performance`,
        message: `Your ${DAY_NAMES[day]} win rate is ${Math.round(dayWR * 100)}%. Consider reducing trading on ${DAY_NAMES[day]}s.`,
        stat: `${Math.round(dayWR * 100)}% win rate`,
        icon: 'calendar_today',
      })
    }

    if (dayWR > overallWinRate + 0.15 && dayWR > 0.6) {
      insights.push({
        id: `day-best-${day}`,
        severity: 'success',
        tag: 'time',
        title: `${DAY_NAMES[day]} is Your Best Day`,
        message: `You win ${Math.round(dayWR * 100)}% of trades on ${DAY_NAMES[day]}s. Consider increasing your ${DAY_NAMES[day]} activity.`,
        stat: `${Math.round(dayWR * 100)}% win rate`,
        icon: 'calendar_today',
      })
    }
  }

  // ── 3. Instrument insights ──
  const instrumentGroups = new Map<string, JournalEntry[]>()
  for (const e of entries) {
    const inst = e.instrument.toUpperCase()
    if (!instrumentGroups.has(inst)) instrumentGroups.set(inst, [])
    instrumentGroups.get(inst)!.push(e)
  }

  let bestInstrument = ''
  let bestInstrumentWR = 0
  let worstInstrument = ''
  let worstInstrumentWR = 1

  for (const [inst, group] of instrumentGroups) {
    if (group.length < 3) continue
    const wr = winRate(group)
    if (wr > bestInstrumentWR) {
      bestInstrumentWR = wr
      bestInstrument = inst
    }
    if (wr < worstInstrumentWR) {
      worstInstrumentWR = wr
      worstInstrument = inst
    }
  }

  if (bestInstrument && bestInstrumentWR > 0.6) {
    insights.push({
      id: 'instrument-best',
      severity: 'success',
      tag: 'instrument',
      title: 'Best Instrument',
      message: `Your best instrument is ${bestInstrument} (${Math.round(bestInstrumentWR * 100)}% win rate). Consider specializing.`,
      stat: `${Math.round(bestInstrumentWR * 100)}% win rate`,
      icon: 'candlestick_chart',
    })
  }

  if (worstInstrument && worstInstrumentWR < 0.35 && worstInstrument !== bestInstrument) {
    const group = instrumentGroups.get(worstInstrument)!
    insights.push({
      id: 'instrument-worst',
      severity: 'danger',
      tag: 'instrument',
      title: 'Underperforming Instrument',
      message: `You only win ${Math.round(worstInstrumentWR * 100)}% on ${worstInstrument} (${group.length} trades). Consider dropping it.`,
      stat: `${Math.round(worstInstrumentWR * 100)}% win rate`,
      icon: 'candlestick_chart',
    })
  }

  // ── 4. Stop loss discipline ──
  const noSL = entries.filter((e) => e.stop_loss === null || e.stop_loss === undefined)
  const withSL = entries.filter((e) => e.stop_loss !== null && e.stop_loss !== undefined)

  if (noSL.length >= 3 && entries.length >= 10) {
    const noSLPercent = Math.round((noSL.length / entries.length) * 100)
    if (noSLPercent > 20) {
      const avgLossNoSL = avgR(noSL.filter((e) => e.outcome === 'loss'))
      const avgLossWithSL = avgR(withSL.filter((e) => e.outcome === 'loss'))

      let extra = ''
      if (avgLossNoSL < avgLossWithSL - 0.3) {
        extra = ` Average loss without SL: ${avgLossNoSL.toFixed(1)}R vs ${avgLossWithSL.toFixed(1)}R with SL.`
      }

      insights.push({
        id: 'discipline-sl',
        severity: 'warning',
        tag: 'discipline',
        title: 'Missing Stop Losses',
        message: `You skip stop losses on ${noSLPercent}% of trades.${extra} Always define your risk before entering.`,
        stat: `${noSLPercent}% without SL`,
        icon: 'shield',
      })
    }
  }

  // ── 5. Risk/reward insights ──
  const withR = entries.filter((e) => e.r_multiple !== null)
  if (withR.length >= 10) {
    const overall = avgR(withR)

    if (overall < 0) {
      insights.push({
        id: 'risk-negative-expectancy',
        severity: 'danger',
        tag: 'risk',
        title: 'Negative Expectancy',
        message: `Your average R-multiple is ${overall.toFixed(2)}R. You are losing money over time. Review your entry criteria and risk management.`,
        stat: `${overall.toFixed(2)}R avg`,
        icon: 'trending_down',
      })
    } else if (overall > 0.5) {
      insights.push({
        id: 'risk-positive-edge',
        severity: 'success',
        tag: 'risk',
        title: 'Positive Edge Detected',
        message: `Your average R-multiple is +${overall.toFixed(2)}R. You have a quantifiable edge — protect it by staying disciplined.`,
        stat: `+${overall.toFixed(2)}R avg`,
        icon: 'trending_up',
      })
    }
  }

  // ── 6. Streak insights ──
  if (entries.length >= 10) {
    let currentStreak = 0
    let streakType: 'win' | 'loss' | null = null

    for (let i = entries.length - 1; i >= 0; i--) {
      const outcome = entries[i].outcome
      if (!outcome || outcome === 'breakeven') break

      if (streakType === null) {
        streakType = outcome as 'win' | 'loss'
        currentStreak = 1
      } else if (outcome === streakType) {
        currentStreak++
      } else {
        break
      }
    }

    if (streakType === 'win' && currentStreak >= 3) {
      insights.push({
        id: 'streak-win',
        severity: 'info',
        tag: 'streak',
        title: 'Winning Streak',
        message: `You're on a ${currentStreak}-trade winning streak. Stay focused — don't let overconfidence creep in.`,
        stat: `${currentStreak} wins`,
        icon: 'local_fire_department',
      })
    }

    if (streakType === 'loss' && currentStreak >= 3) {
      insights.push({
        id: 'streak-loss',
        severity: 'warning',
        tag: 'streak',
        title: 'Losing Streak',
        message: `You've lost ${currentStreak} trades in a row. Consider taking a break to reset mentally before your next trade.`,
        stat: `${currentStreak} losses`,
        icon: 'warning',
      })
    }
  }

  // ── 7. Overall win rate context ──
  if (entries.length >= 10) {
    if (overallWinRate >= 0.55) {
      insights.push({
        id: 'overall-wr-good',
        severity: 'success',
        tag: 'pattern',
        title: 'Above-Average Win Rate',
        message: `Your overall win rate is ${Math.round(overallWinRate * 100)}%. You're winning more than you lose — focus on maximizing R on winners.`,
        stat: `${Math.round(overallWinRate * 100)}%`,
        icon: 'verified',
      })
    } else if (overallWinRate < 0.4) {
      insights.push({
        id: 'overall-wr-low',
        severity: 'warning',
        tag: 'pattern',
        title: 'Win Rate Below 40%',
        message: `Your win rate is ${Math.round(overallWinRate * 100)}%. Review your entry criteria — you may be taking low-probability setups.`,
        stat: `${Math.round(overallWinRate * 100)}%`,
        icon: 'query_stats',
      })
    }
  }

  // Sort: danger first, then warning, then info, then success
  const severityOrder: Record<InsightSeverity, number> = {
    danger: 0,
    warning: 1,
    info: 2,
    success: 3,
  }
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return insights
}

/**
 * Get the most relevant insight for today's context (for PulseSection).
 * Prioritizes day-of-week warnings and streak alerts.
 */
export function getTodayInsight(entries: JournalEntry[]): Insight | null {
  if (entries.length < 5) return null

  const today = new Date().getDay()
  const todayName = DAY_NAMES[today]

  // Check day-of-week performance
  const todayEntries = entries.filter(
    (e) => new Date(e.trade_date).getDay() === today
  )

  if (todayEntries.length >= 3) {
    const todayWR = winRate(todayEntries)
    const overallWR = winRate(entries)

    if (todayWR < 0.35 && overallWR - todayWR > 0.15) {
      return {
        id: 'pulse-day-warning',
        severity: 'warning',
        tag: 'time',
        title: `${todayName} Alert`,
        message: `Heads up: You tend to lose on ${todayName}s (${Math.round(todayWR * 100)}% win rate).`,
        icon: 'warning',
      }
    }

    if (todayWR > overallWR + 0.15 && todayWR > 0.6) {
      return {
        id: 'pulse-day-good',
        severity: 'success',
        tag: 'time',
        title: `${todayName} Edge`,
        message: `${todayName}s are your best day (${Math.round(todayWR * 100)}% win rate). Look for setups.`,
        icon: 'trending_up',
      }
    }
  }

  // Check streak
  let currentStreak = 0
  let streakType: 'win' | 'loss' | null = null
  for (let i = entries.length - 1; i >= 0; i--) {
    const outcome = entries[i].outcome
    if (!outcome || outcome === 'breakeven') break
    if (streakType === null) {
      streakType = outcome as 'win' | 'loss'
      currentStreak = 1
    } else if (outcome === streakType) {
      currentStreak++
    } else {
      break
    }
  }

  if (streakType === 'loss' && currentStreak >= 3) {
    return {
      id: 'pulse-streak-loss',
      severity: 'warning',
      tag: 'streak',
      title: 'Losing Streak',
      message: `${currentStreak} losses in a row. Consider taking a mental reset before trading today.`,
      icon: 'pause_circle',
    }
  }

  if (streakType === 'win' && currentStreak >= 5) {
    return {
      id: 'pulse-streak-win',
      severity: 'info',
      tag: 'streak',
      title: 'Hot Streak',
      message: `${currentStreak} wins in a row — stay disciplined and stick to your rules.`,
      icon: 'local_fire_department',
    }
  }

  return null
}
