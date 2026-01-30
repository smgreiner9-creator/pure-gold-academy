import type { JournalEntry, PreTradeNudge, EmotionType } from '@/types/database'

interface NudgeContext {
  instrument?: string
  emotion?: EmotionType
}

const SEVERITY_ORDER: Record<PreTradeNudge['severity'], number> = {
  danger: 3,
  warning: 2,
  info: 1,
}

const NEGATIVE_EMOTIONS: EmotionType[] = ['anxious', 'fearful', 'greedy', 'frustrated']

function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' })
}

function checkLossStreak(entries: JournalEntry[]): PreTradeNudge | null {
  if (entries.length < 3) return null

  const sorted = [...entries].sort(
    (a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime()
  )

  let streakCount = 0
  for (const entry of sorted) {
    if (entry.outcome === 'loss') {
      streakCount++
    } else {
      break
    }
  }

  if (streakCount < 3) return null

  return {
    id: `nudge-loss-streak-${streakCount}`,
    type: 'loss_streak',
    severity: streakCount >= 5 ? 'danger' : 'warning',
    title: 'Loss Streak Detected',
    message: `Your last ${streakCount} trades were losses. Consider sizing down or taking a break.`,
    icon: 'local_fire_department',
  }
}

function checkInstrument(
  entries: JournalEntry[],
  instrument: string
): PreTradeNudge | null {
  const instrumentTrades = entries.filter(
    (e) => e.instrument.toLowerCase() === instrument.toLowerCase() && e.outcome !== null
  )

  if (instrumentTrades.length < 5) return null

  const wins = instrumentTrades.filter((e) => e.outcome === 'win').length
  const winRate = Math.round((wins / instrumentTrades.length) * 100)

  if (winRate >= 40) return null

  return {
    id: `nudge-instrument-${instrument.toLowerCase()}`,
    type: 'instrument',
    severity: winRate < 25 ? 'danger' : 'warning',
    title: `Low Win Rate on ${instrument}`,
    message: `Your ${instrument} win rate: ${winRate}% (${instrumentTrades.length} trades)`,
    icon: 'show_chart',
  }
}

function checkDayOfWeek(entries: JournalEntry[]): PreTradeNudge | null {
  const today = new Date()
  const todayDay = today.getDay()
  const dayName = getDayName(today)

  const dayTrades = entries.filter((e) => {
    const tradeDate = new Date(e.trade_date)
    return tradeDate.getDay() === todayDay && e.outcome !== null
  })

  if (dayTrades.length < 3) return null

  const wins = dayTrades.filter((e) => e.outcome === 'win').length
  const winRate = Math.round((wins / dayTrades.length) * 100)

  if (winRate >= 35) return null

  return {
    id: `nudge-day-${todayDay}`,
    type: 'day_of_week',
    severity: winRate < 20 ? 'danger' : 'warning',
    title: `Weak ${dayName} Performance`,
    message: `It's ${dayName}. Your ${dayName} win rate: ${winRate}%`,
    icon: 'calendar_today',
  }
}

function checkEmotion(
  entries: JournalEntry[],
  emotion: EmotionType
): PreTradeNudge | null {
  if (!NEGATIVE_EMOTIONS.includes(emotion)) return null

  const emotionTrades = entries.filter(
    (e) => e.emotion_before === emotion && e.outcome !== null
  )

  if (emotionTrades.length < 3) return null

  const losses = emotionTrades.filter((e) => e.outcome === 'loss').length
  const lossRate = Math.round((losses / emotionTrades.length) * 100)

  if (lossRate <= 60) return null

  return {
    id: `nudge-emotion-${emotion}`,
    type: 'emotion',
    severity: lossRate >= 80 ? 'danger' : 'warning',
    title: 'Emotional Pattern Detected',
    message: `Last time you felt ${emotion}, you lost ${losses} of ${emotionTrades.length} trades`,
    icon: 'psychology_alt',
  }
}

export function generateNudges(
  entries: JournalEntry[],
  context?: NudgeContext
): PreTradeNudge[] {
  const nudges: PreTradeNudge[] = []

  const lossStreakNudge = checkLossStreak(entries)
  if (lossStreakNudge) nudges.push(lossStreakNudge)

  if (context?.instrument) {
    const instrumentNudge = checkInstrument(entries, context.instrument)
    if (instrumentNudge) nudges.push(instrumentNudge)
  }

  const dayNudge = checkDayOfWeek(entries)
  if (dayNudge) nudges.push(dayNudge)

  if (context?.emotion) {
    const emotionNudge = checkEmotion(entries, context.emotion)
    if (emotionNudge) nudges.push(emotionNudge)
  }

  nudges.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])

  return nudges.slice(0, 2)
}
