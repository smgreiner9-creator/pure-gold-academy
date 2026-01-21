'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { JournalEntry, JournalFeedback, Profile } from '@/types/database'

export default function JournalEntryDetailPage() {
  const params = useParams()
  const router = useRouter()
  useAuth()
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [feedback, setFeedback] = useState<(JournalFeedback & { teacher?: Partial<Profile> })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const entryId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined

  const loadEntry = useCallback(async () => {
    if (!entryId) return

    try {
      const { data: entryData, error: entryError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single()

      if (entryError) throw entryError
      setEntry(entryData)

      // Load feedback
      const { data: feedbackData } = await supabase
        .from('journal_feedback')
        .select('*')
        .eq('journal_entry_id', entryId)
        .order('created_at', { ascending: false })

      setFeedback((feedbackData || []) as (JournalFeedback & { teacher?: Partial<Profile> })[])
    } catch (error) {
      console.error('Error loading entry:', error)
      router.push('/journal')
    } finally {
      setIsLoading(false)
    }
  }, [entryId, router, supabase])

  useEffect(() => {
    if (entryId) {
      loadEntry()
    }
  }, [entryId, loadEntry])

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

  const getEmotionLabel = (emotion: string | null) => {
    if (!emotion) return '-'
    return emotion.charAt(0).toUpperCase() + emotion.slice(1)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse">
          <div className="h-8 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-6 bg-white/5 rounded w-1/2 mb-2" />
          <div className="h-6 bg-white/5 rounded w-1/4" />
        </div>
      </div>
    )
  }

  if (!entry) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/journal"
            className="w-10 h-10 rounded-lg border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{entry.instrument}</h1>
            <div className="flex items-center gap-2 text-[var(--muted)] text-sm">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {new Date(entry.trade_date).toLocaleDateString()}
            </div>
          </div>
        </div>
        <Link
          href={`/journal/${entry.id}/edit`}
          className="h-10 px-4 rounded-lg border border-[var(--card-border)] flex items-center gap-2 text-sm font-medium hover:bg-white/5 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">edit</span>
          Edit
        </Link>
      </div>

      {/* Trade Summary */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase ${getOutcomeColor(entry.outcome)}`}>
            {entry.outcome ? entry.outcome : 'OPEN'}
          </span>
          <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
            entry.direction === 'long' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {entry.direction === 'long' ? 'trending_up' : 'trending_down'}
            </span>
            {entry.direction.toUpperCase()}
          </span>
          {entry.r_multiple !== null && (
            <span className={`px-4 py-2 rounded-xl text-sm font-bold mono-num ${
              entry.r_multiple >= 0 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
            }`}>
              {entry.r_multiple >= 0 ? '+' : ''}{entry.r_multiple}R
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Entry Price</p>
            <p className="font-bold text-lg mono-num">{entry.entry_price}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Exit Price</p>
            <p className="font-bold text-lg mono-num">{entry.exit_price || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Position Size</p>
            <p className="font-bold text-lg mono-num">{entry.position_size} lots</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">P&L</p>
            <p className={`font-bold text-lg mono-num ${
              entry.pnl !== null ? (entry.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]') : ''
            }`}>
              {entry.pnl !== null ? `$${entry.pnl.toFixed(2)}` : '-'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Stop Loss</p>
            <p className="font-semibold mono-num">{entry.stop_loss || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Take Profit</p>
            <p className="font-semibold mono-num">{entry.take_profit || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Entry Time</p>
            <p className="font-semibold">{entry.entry_time || '-'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Exit Time</p>
            <p className="font-semibold">{entry.exit_time || '-'}</p>
          </div>
        </div>
      </div>

      {/* Emotions */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-bold text-lg mb-6">Emotional Journey</h3>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Before</p>
            <p className="text-2xl font-bold">{getEmotionLabel(entry.emotion_before)}</p>
          </div>
          <div className="text-3xl text-[var(--card-border)]">→</div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">During</p>
            <p className="text-2xl font-bold">{getEmotionLabel(entry.emotion_during)}</p>
          </div>
          <div className="text-3xl text-[var(--card-border)]">→</div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">After</p>
            <p className="text-2xl font-bold">{getEmotionLabel(entry.emotion_after)}</p>
          </div>
        </div>
      </div>

      {/* Rules Followed */}
      {Array.isArray(entry.rules_followed) && entry.rules_followed.length > 0 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-4">Rules Followed</h3>
          <div className="flex flex-wrap gap-2">
            {entry.rules_followed.map((rule, index) => (
              <span
                key={index}
                className="px-4 py-2 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-sm font-medium"
              >
                <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>
                {String(rule)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Screenshots */}
      {entry.screenshot_urls && entry.screenshot_urls.length > 0 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-4">Screenshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entry.screenshot_urls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-[var(--card-border)] hover:border-[var(--gold)]/50 transition-colors"
              >
                <Image
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  width={1200}
                  height={800}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="w-full h-auto hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {entry.notes && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-4">Notes & Reflection</h3>
          <p className="whitespace-pre-wrap text-[var(--muted)]">{entry.notes}</p>
        </div>
      )}

      {/* Teacher Feedback */}
      {feedback.length > 0 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-[var(--gold)]">chat</span>
            Teacher Feedback
          </h3>
          <div className="space-y-4">
            {feedback.map((fb) => (
              <div key={fb.id} className="p-4 rounded-xl bg-black/20 border border-[var(--card-border)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--gold)] flex items-center justify-center text-black font-bold">
                    T
                  </div>
                  <div>
                    <p className="font-semibold">Teacher</p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(fb.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-[var(--muted)]">{fb.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
