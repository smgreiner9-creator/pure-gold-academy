'use client'

import { useMemo } from 'react'
import type { JournalEntry, EmotionType } from '@/types/database'

interface EmotionCorrelationProps {
  entries: JournalEntry[]
  expanded?: boolean
}

const emotionConfig: Record<EmotionType, { label: string; icon: string; color: string }> = {
  calm: { label: 'Calm', icon: '😌', color: 'var(--success)' },
  confident: { label: 'Confident', icon: '💪', color: 'var(--gold)' },
  neutral: { label: 'Neutral', icon: '😐', color: 'var(--muted)' },
  anxious: { label: 'Anxious', icon: '😰', color: 'var(--warning)' },
  fearful: { label: 'Fearful', icon: '😨', color: 'var(--danger)' },
  greedy: { label: 'Greedy', icon: '🤑', color: 'var(--warning)' },
  frustrated: { label: 'Frustrated', icon: '😤', color: 'var(--danger)' },
}

export function EmotionCorrelation({ entries, expanded = false }: EmotionCorrelationProps) {
  const emotionStats = useMemo(() => {
    const stats: Record<string, { total: number; wins: number; avgR: number; totalR: number }> = {}

    entries
      .filter((e) => e.outcome !== null)
      .forEach((entry) => {
        const emotion = entry.emotion_before
        if (!stats[emotion]) {
          stats[emotion] = { total: 0, wins: 0, avgR: 0, totalR: 0 }
        }
        stats[emotion].total++
        if (entry.outcome === 'win') stats[emotion].wins++
        if (entry.r_multiple !== null) {
          stats[emotion].totalR += entry.r_multiple
        }
      })

    // Calculate averages
    Object.keys(stats).forEach((emotion) => {
      const s = stats[emotion]
      s.avgR = s.total > 0 ? s.totalR / s.total : 0
    })

    // Sort by win rate
    return Object.entries(stats)
      .map(([emotion, data]) => ({
        emotion: emotion as EmotionType,
        ...data,
        winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate)
  }, [entries])

  // Find best and worst emotions
  const bestEmotion = emotionStats[0]
  const worstEmotion = emotionStats[emotionStats.length - 1]

  if (emotionStats.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-bold text-lg mb-4">Emotion Analysis</h3>
        <p className="text-[var(--muted)] text-center py-8">
          No closed trades with emotion data to analyze.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg">Emotion Analysis</h3>
        <span className="material-symbols-outlined text-[var(--gold)]">psychology</span>
      </div>

      {/* Insight Card */}
      {bestEmotion && worstEmotion && bestEmotion.emotion !== worstEmotion.emotion && (
        <div className="p-4 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 mb-6">
          <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-2">
            Key Insight
          </p>
          <p className="text-sm">
            You perform best when feeling{' '}
            <span className="font-bold text-[var(--success)]">
              {emotionConfig[bestEmotion.emotion]?.icon} {emotionConfig[bestEmotion.emotion]?.label}
            </span>{' '}
            ({bestEmotion.winRate.toFixed(0)}% win rate) and worst when{' '}
            <span className="font-bold text-[var(--danger)]">
              {emotionConfig[worstEmotion.emotion]?.icon} {emotionConfig[worstEmotion.emotion]?.label}
            </span>{' '}
            ({worstEmotion.winRate.toFixed(0)}% win rate).
          </p>
        </div>
      )}

      {/* Emotion Bars */}
      <div className="space-y-4">
        {emotionStats.map(({ emotion, total, winRate, avgR }) => {
          const config = emotionConfig[emotion]
          if (!config) return null

          return (
            <div key={emotion}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-[var(--muted)]">({total} trades)</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-bold mono-num ${winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                    {winRate.toFixed(0)}%
                  </span>
                  {expanded && (
                    <span className={`text-xs mono-num ${avgR >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                      {avgR >= 0 ? '+' : ''}{avgR.toFixed(2)}R
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${winRate}%`,
                    backgroundColor: winRate >= 50 ? 'var(--success)' : 'var(--danger)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Expanded: Before/During/After comparison */}
      {expanded && (
        <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
          <h4 className="font-semibold mb-4">Emotion State Transitions</h4>
          <p className="text-sm text-[var(--muted)]">
            Track how your emotions change during trades in your journal entries to see patterns here.
          </p>
        </div>
      )}
    </div>
  )
}
