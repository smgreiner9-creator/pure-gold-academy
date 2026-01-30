'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import type { ProgressReport as ProgressReportType, ProgressReportData } from '@/types/database'

interface ProgressReportProps {
  report: ProgressReportType
  studentName: string
  classroomName: string
  isTeacher?: boolean
  onNotesUpdate?: (reportId: string, notes: string) => Promise<void>
}

const EMOTION_COLORS: Record<string, string> = {
  calm: '#4ade80',
  confident: '#facc15',
  anxious: '#f97316',
  fearful: '#ef4444',
  greedy: '#a855f7',
  frustrated: '#ec4899',
  neutral: '#94a3b8',
}

function EmotionBarChart({ data, label }: { data: Record<string, number>; label: string }) {
  const entries = Object.entries(data)
  const max = Math.max(...entries.map(([, v]) => v), 1)
  const total = entries.reduce((sum, [, v]) => sum + v, 0)

  if (entries.length === 0) {
    return (
      <div>
        <p className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wider font-bold">{label}</p>
        <p className="text-xs text-[var(--muted)]">No data</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wider font-bold">{label}</p>
      <div className="space-y-1.5">
        {entries.map(([emotion, count]) => (
          <div key={emotion} className="flex items-center gap-2">
            <span className="text-xs w-20 text-right capitalize" style={{ color: EMOTION_COLORS[emotion] || '#94a3b8' }}>
              {emotion}
            </span>
            <div className="flex-1 h-4 bg-black/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(count / max) * 100}%`,
                  backgroundColor: EMOTION_COLORS[emotion] || '#94a3b8',
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="text-xs text-[var(--muted)] w-8">
              {Math.round((count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChangeIndicator({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-xs text-[var(--muted)]">--</span>
  const isPositive = value > 0
  return (
    <span className={`text-xs font-bold flex items-center gap-0.5 ${isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
      <span className="material-symbols-outlined text-xs">
        {isPositive ? 'trending_up' : 'trending_down'}
      </span>
      {isPositive ? '+' : ''}{value}{suffix}
    </span>
  )
}

export function ProgressReport({ report, studentName, classroomName, isTeacher, onNotesUpdate }: ProgressReportProps) {
  const [notes, setNotes] = useState(report.teacher_notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const data = useMemo(() => report.report_data as unknown as ProgressReportData, [report.report_data])

  const handleSaveNotes = useCallback(async () => {
    if (!onNotesUpdate) return
    setIsSaving(true)
    try {
      await onNotesUpdate(report.id, notes)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save notes:', err)
    } finally {
      setIsSaving(false)
    }
  }, [onNotesUpdate, report.id, notes])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-5 print:space-y-4">
      {/* Report Header */}
      <div className="p-6 rounded-xl glass-surface">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">{studentName}</h2>
            <p className="text-sm text-[var(--muted)]">{classroomName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {formatDate(report.period_start)} - {formatDate(report.period_end)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              Generated {new Date(report.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Trades */}
        <div className="p-4 rounded-xl glass-surface">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-sm text-[var(--gold)]">swap_vert</span>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Trades</p>
          </div>
          <p className="text-2xl font-bold">{data.totalTrades}</p>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-xl glass-surface">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-sm text-[var(--gold)]">percent</span>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Win Rate</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold">{data.winRate}%</p>
            {data.comparedToPrevious && (
              <ChangeIndicator value={data.comparedToPrevious.winRateChange} suffix="%" />
            )}
          </div>
        </div>

        {/* Avg R */}
        <div className="p-4 rounded-xl glass-surface">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-sm text-[var(--gold)]">trending_up</span>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Avg R</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold">{data.avgRMultiple}R</p>
            {data.comparedToPrevious && (
              <ChangeIndicator value={data.comparedToPrevious.avgRChange} suffix="R" />
            )}
          </div>
        </div>

        {/* Best Streak */}
        <div className="p-4 rounded-xl glass-surface">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-sm text-[var(--gold)]">local_fire_department</span>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Best Streak</p>
          </div>
          <p className="text-2xl font-bold">{data.streaks.bestWin}W</p>
          {data.streaks.currentWin > 0 && (
            <p className="text-xs text-[var(--success)]">Current: {data.streaks.currentWin}W</p>
          )}
          {data.streaks.currentLoss > 0 && (
            <p className="text-xs text-[var(--danger)]">Current: {data.streaks.currentLoss}L</p>
          )}
        </div>
      </div>

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Strengths */}
        <div className="p-4 rounded-xl border border-[var(--success)]/20 bg-[var(--success)]/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-sm text-[var(--success)]">check_circle</span>
            <p className="text-xs text-[var(--success)] uppercase tracking-wider font-bold">Strengths</p>
          </div>
          <div className="space-y-2">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-xs text-[var(--success)] mt-0.5">done</span>
                <p className="text-sm">{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Improvement Areas */}
        <div className="p-4 rounded-xl border border-[var(--warning)]/20 bg-[var(--warning)]/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-sm text-[var(--warning)]">lightbulb</span>
            <p className="text-xs text-[var(--warning)] uppercase tracking-wider font-bold">Areas to Improve</p>
          </div>
          <div className="space-y-2">
            {data.improvementAreas.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="material-symbols-outlined text-xs text-[var(--warning)] mt-0.5">arrow_right</span>
                <p className="text-sm">{a}</p>
              </div>
            ))}
          </div>

          {/* Recommended Learning Content */}
          {data.recommendedContent && data.recommendedContent.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--glass-surface-border)]">
              <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-2">Recommended Learning</p>
              <div className="space-y-1.5">
                {data.recommendedContent.map((content) => (
                  <Link
                    key={content.id}
                    href={`/learn/${content.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-[var(--gold)]">school</span>
                    <span className="text-sm font-medium">{content.title}</span>
                    <span className="text-[10px] text-[var(--muted)] uppercase">{content.content_type}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emotion Breakdown */}
      <div className="p-4 rounded-xl glass-surface">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-sm text-[var(--gold)]">psychology</span>
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Emotion Breakdown</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <EmotionBarChart data={data.emotionBreakdown.before} label="Before Trade" />
          <EmotionBarChart data={data.emotionBreakdown.during} label="During Trade" />
          <EmotionBarChart data={data.emotionBreakdown.after} label="After Trade" />
        </div>
      </div>

      {/* Rules Adherence */}
      {data.rulesFollowed.length > 0 && (
        <div className="p-4 rounded-xl glass-surface">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-sm text-[var(--gold)]">checklist</span>
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Rules Adherence</p>
          </div>
          <div className="space-y-3">
            {data.rulesFollowed.map((rule, i) => {
              const pct = Math.round((rule.count / rule.total) * 100)
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm">{rule.rule}</p>
                    <p className="text-xs font-bold text-[var(--muted)]">{pct}%</p>
                  </div>
                  <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Best / Worst Trade */}
      {(data.bestTrade || data.worstTrade) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.bestTrade && (
            <div className="p-4 rounded-xl glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-sm text-[var(--success)]">emoji_events</span>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Best Trade</p>
              </div>
              <p className="text-lg font-bold">{data.bestTrade.instrument}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[var(--success)]">{data.bestTrade.rMultiple}R</span>
                <span className="text-sm text-[var(--muted)]">
                  P&L: ${data.bestTrade.pnl.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          {data.worstTrade && (
            <div className="p-4 rounded-xl glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-sm text-[var(--danger)]">warning</span>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Worst Trade</p>
              </div>
              <p className="text-lg font-bold">{data.worstTrade.instrument}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-[var(--danger)]">{data.worstTrade.rMultiple}R</span>
                <span className="text-sm text-[var(--muted)]">
                  P&L: ${data.worstTrade.pnl.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teacher Notes */}
      <div className="p-4 rounded-xl glass-surface">
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-sm text-[var(--gold)]">edit_note</span>
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider font-bold">Teacher Notes</p>
        </div>
        {isTeacher ? (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add personalized feedback for this student..."
              className="w-full input-field rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:border-[var(--gold)]/50 resize-y placeholder:text-[var(--muted)]/50"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNotes}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg gold-gradient text-black text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Notes'}
              </button>
              {saved && (
                <span className="text-xs text-[var(--success)] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check</span>
                  Saved
                </span>
              )}
            </div>
          </div>
        ) : (
          <div>
            {report.teacher_notes ? (
              <p className="text-sm whitespace-pre-wrap">{report.teacher_notes}</p>
            ) : (
              <p className="text-sm text-[var(--muted)] italic">No teacher notes yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
