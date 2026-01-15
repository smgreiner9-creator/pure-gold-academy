'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SkeletonJournalEntry } from '@/components/ui/Skeleton'
import type { JournalEntry, TradeOutcome } from '@/types/database'

function exportToCSV(entries: JournalEntry[], filename: string) {
  // Define CSV headers
  const headers = [
    'Date',
    'Instrument',
    'Direction',
    'Outcome',
    'Entry Price',
    'Exit Price',
    'Stop Loss',
    'Take Profit',
    'Position Size',
    'P&L',
    'R-Multiple',
    'Emotion Before',
    'Emotion During',
    'Emotion After',
    'Rules Followed',
    'Notes',
    'Entry Time',
    'Exit Time',
  ]

  // Convert entries to CSV rows
  const rows = entries.map(entry => [
    entry.trade_date,
    entry.instrument,
    entry.direction,
    entry.outcome || '',
    entry.entry_price,
    entry.exit_price || '',
    entry.stop_loss || '',
    entry.take_profit || '',
    entry.position_size,
    entry.pnl !== null ? entry.pnl.toFixed(2) : '',
    entry.r_multiple !== null ? entry.r_multiple.toFixed(2) : '',
    entry.emotion_before,
    entry.emotion_during || '',
    entry.emotion_after || '',
    Array.isArray(entry.rules_followed) ? entry.rules_followed.join('; ') : '',
    entry.notes ? entry.notes.replace(/"/g, '""').replace(/\n/g, ' ') : '',
    entry.entry_time || '',
    entry.exit_time || '',
  ])

  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function JournalList() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({
    outcome: '',
    instrument: '',
    dateRange: '30',
  })
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id) {
      loadEntries()
    }
  }, [profile?.id, filter])

  const loadEntries = async () => {
    if (!profile?.id) return

    setIsLoading(true)
    try {
      let query = supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('trade_date', { ascending: false })

      if (filter.outcome) {
        query = query.eq('outcome', filter.outcome as TradeOutcome)
      }

      if (filter.instrument) {
        query = query.ilike('instrument', `%${filter.instrument}%`)
      }

      if (filter.dateRange !== 'all') {
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(filter.dateRange))
        query = query.gte('trade_date', daysAgo.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) throw error
      setEntries(data || [])
    } catch (error) {
      console.error('Error loading entries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)

      if (error) throw error
      setEntries(entries.filter(e => e.id !== id))
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  const handleExport = useCallback(() => {
    if (entries.length === 0) return
    const date = new Date().toISOString().split('T')[0]
    exportToCSV(entries, `trading-journal-${date}.csv`)
  }, [entries])

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'win':
        return 'text-[var(--success)] bg-[var(--success)]/10'
      case 'loss':
        return 'text-[var(--danger)] bg-[var(--danger)]/10'
      case 'breakeven':
        return 'text-[var(--warning)] bg-[var(--warning)]/10'
      default:
        return 'text-[var(--muted)] bg-white/5'
    }
  }

  const getEmotionEmoji = (emotion: string | null) => {
    switch (emotion) {
      case 'calm':
        return '😌'
      case 'confident':
        return '💪'
      case 'anxious':
        return '😰'
      case 'fearful':
        return '😨'
      case 'greedy':
        return '🤑'
      case 'frustrated':
        return '😤'
      default:
        return '😐'
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <SkeletonJournalEntry key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filter.outcome}
            onChange={(e) => setFilter(prev => ({ ...prev, outcome: e.target.value }))}
            className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm appearance-none cursor-pointer transition-colors min-w-[140px]"
          >
            <option value="">All Outcomes</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="breakeven">Breakeven</option>
          </select>
          <select
            value={filter.dateRange}
            onChange={(e) => setFilter(prev => ({ ...prev, dateRange: e.target.value }))}
            className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm appearance-none cursor-pointer transition-colors min-w-[140px]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={entries.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--card-border)] bg-black/40 text-sm font-medium hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">download</span>
          Export CSV
        </button>
      </div>

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="p-12 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">edit_note</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No journal entries yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">Start documenting your trades to track your progress</p>
          <Link
            href="/journal/new"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            Create Your First Entry
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/50 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${getOutcomeColor(entry.outcome)}`}>
                      {entry.outcome ? entry.outcome : 'Open'}
                    </span>
                    <span className="font-bold">{entry.instrument}</span>
                    <span className={`flex items-center gap-1 text-xs font-semibold ${
                      entry.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      <span className="material-symbols-outlined text-sm">
                        {entry.direction === 'long' ? 'trending_up' : 'trending_down'}
                      </span>
                      {entry.direction.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      {new Date(entry.trade_date).toLocaleDateString()}
                    </span>
                    <span className="mono-num">Entry: {entry.entry_price}</span>
                    {entry.exit_price && <span className="mono-num">Exit: {entry.exit_price}</span>}
                    {entry.r_multiple !== null && (
                      <span className={`mono-num font-bold ${entry.r_multiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {entry.r_multiple >= 0 ? '+' : ''}{entry.r_multiple}R
                      </span>
                    )}
                    {entry.pnl !== null && (
                      <span className={`mono-num font-bold ${entry.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        ${entry.pnl.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span>{getEmotionEmoji(entry.emotion_before)}</span>
                    {entry.emotion_during && <span>→ {getEmotionEmoji(entry.emotion_during)}</span>}
                    {entry.emotion_after && <span>→ {getEmotionEmoji(entry.emotion_after)}</span>}
                    {Array.isArray(entry.rules_followed) && entry.rules_followed.length > 0 && (
                      <span className="ml-2 text-[var(--success)] text-xs">
                        {entry.rules_followed.length} rules followed
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {entry.screenshot_urls && entry.screenshot_urls.length > 0 && (
                    <span className="text-sm text-[var(--muted)] flex items-center gap-1">
                      <img src={entry.screenshot_urls[0]} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      {entry.screenshot_urls.length > 1 && `+${entry.screenshot_urls.length - 1}`}
                    </span>
                  )}
                  <Link
                    href={`/journal/${entry.id}`}
                    className="w-9 h-9 rounded-lg border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </Link>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="w-9 h-9 rounded-lg border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]/50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
