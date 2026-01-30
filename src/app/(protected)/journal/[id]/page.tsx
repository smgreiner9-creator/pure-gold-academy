'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import dynamic from 'next/dynamic'

const TradingViewChart = dynamic(
  () => import('@/components/charts/TradingViewChart').then(mod => ({ default: mod.TradingViewChart })),
  { ssr: false, loading: () => <div className="h-[400px] bg-black/20 rounded-xl animate-pulse" /> }
)
import { deserializeChartState } from '@/lib/chartUtils'
import type { JournalEntry, JournalFeedback, Profile } from '@/types/database'

function ShareToCommunityModal({
  entry,
  onClose,
  onSuccess,
}: {
  entry: JournalEntry
  onClose: () => void
  onSuccess: (postId: string) => void
}) {
  const [showPnl, setShowPnl] = useState(true)
  const [showEmotions, setShowEmotions] = useState(true)
  const [showChart, setShowChart] = useState(!!entry.chart_data)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleShare = async () => {
    if (!content.trim()) {
      setError('Please add your analysis or notes about this trade.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/community/trade-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journal_entry_id: entry.id,
          title: title.trim() || undefined,
          content: content.trim(),
          privacy: { showPnl, showEmotions, showChart },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to share trade review')
        return
      }

      onSuccess(data.post.id)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl glass-floating p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--gold)]">share</span>
            Share to Community
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Trade Preview */}
        <div className="p-3 rounded-xl glass-surface flex items-center gap-3">
          <span className="material-symbols-outlined text-[var(--gold)]">candlestick_chart</span>
          <div>
            <p className="font-bold text-sm">{entry.instrument} {entry.direction.toUpperCase()}</p>
            <p className="text-xs text-[var(--muted)]">
              {entry.outcome ? entry.outcome.charAt(0).toUpperCase() + entry.outcome.slice(1) : 'Open'} &middot; {new Date(entry.trade_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${entry.instrument} ${entry.direction.toUpperCase()} — ${entry.outcome ? entry.outcome.charAt(0).toUpperCase() + entry.outcome.slice(1) : 'Open'}`}
            className="w-full px-4 py-2.5 rounded-xl input-field text-sm placeholder:text-[var(--muted)]/50 focus:border-[var(--gold)]/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Analysis / Notes */}
        <div>
          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">
            Your Analysis / Notes *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your reasoning, what you learned, or ask the community for feedback on this trade..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl input-field text-sm placeholder:text-[var(--muted)]/50 focus:border-[var(--gold)]/50 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Privacy Controls */}
        <div>
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3">
            Privacy — choose what to share
          </p>
          <div className="space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  showPnl ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--glass-surface-border)] group-hover:border-[var(--gold)]/50'
                }`}
                onClick={() => setShowPnl(!showPnl)}
              >
                {showPnl && <span className="material-symbols-outlined text-black text-sm">check</span>}
              </div>
              <div>
                <p className="text-sm font-medium">Show P&L</p>
                <p className="text-[11px] text-[var(--muted)]">Display dollar profit/loss amount</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  showEmotions ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--glass-surface-border)] group-hover:border-[var(--gold)]/50'
                }`}
                onClick={() => setShowEmotions(!showEmotions)}
              >
                {showEmotions && <span className="material-symbols-outlined text-black text-sm">check</span>}
              </div>
              <div>
                <p className="text-sm font-medium">Show Emotions</p>
                <p className="text-[11px] text-[var(--muted)]">Display your emotional journey (before, during, after)</p>
              </div>
            </label>
            {entry.chart_data && (
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    showChart ? 'bg-[var(--gold)] border-[var(--gold)]' : 'border-[var(--glass-surface-border)] group-hover:border-[var(--gold)]/50'
                  }`}
                  onClick={() => setShowChart(!showChart)}
                >
                  {showChart && <span className="material-symbols-outlined text-black text-sm">check</span>}
                </div>
                <div>
                  <p className="text-sm font-medium">Show Chart</p>
                  <p className="text-[11px] text-[var(--muted)]">Include your annotated trade chart</p>
                </div>
              </label>
            )}
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20">
          <span className="material-symbols-outlined text-[var(--gold)] text-sm mt-0.5">info</span>
          <p className="text-[11px] text-[var(--muted)]">
            Trade details (instrument, direction, entry/exit prices, R-multiple, outcome) are always shared. Use the controls above to choose additional data.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl btn-glass text-sm font-medium hover:bg-black/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isSubmitting || !content.trim()}
            className="flex-1 h-11 rounded-xl bg-[var(--gold)] text-black text-sm font-bold hover:bg-[var(--gold)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                Sharing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">share</span>
                Share Trade Review
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JournalEntryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [feedback, setFeedback] = useState<(JournalFeedback & { teacher?: Partial<Profile> })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [alreadyShared, setAlreadyShared] = useState(false)
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

      // Check if already shared
      const { data: existingPost } = await supabase
        .from('community_posts')
        .select('id')
        .eq('journal_entry_id', entryId)
        .limit(1)

      setAlreadyShared(!!(existingPost && existingPost.length > 0))
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
        return 'text-[var(--muted)] bg-black/5'
    }
  }

  const getEmotionLabel = (emotion: string | null) => {
    if (!emotion) return '-'
    return emotion.charAt(0).toUpperCase() + emotion.slice(1)
  }

  const canShare = profile?.classroom_id && entry && !alreadyShared

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl glass-surface animate-pulse">
          <div className="h-8 bg-black/5 rounded w-1/3 mb-4" />
          <div className="h-6 bg-black/5 rounded w-1/2 mb-2" />
          <div className="h-6 bg-black/5 rounded w-1/4" />
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
            className="w-10 h-10 rounded-lg border border-[var(--glass-surface-border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
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
        <div className="flex items-center gap-2">
          {canShare && (
            <button
              onClick={() => setShowShareModal(true)}
              className="h-10 px-4 rounded-lg border border-[var(--gold)]/30 text-[var(--gold)] flex items-center gap-2 text-sm font-medium hover:bg-[var(--gold)]/10 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              Share
            </button>
          )}
          {alreadyShared && (
            <span className="h-10 px-4 rounded-lg border border-[var(--success)]/30 text-[var(--success)] flex items-center gap-2 text-sm font-medium">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              Shared
            </span>
          )}
          <Link
            href={`/journal/${entry.id}/edit`}
            className="h-10 px-4 rounded-lg btn-glass flex items-center gap-2 text-sm font-medium hover:bg-black/5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Edit
          </Link>
        </div>
      </div>

      {/* Trade Summary */}
      <div className="p-6 rounded-2xl glass-surface">
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
          {entry.trade_call_id && (
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--gold)]/10 text-[var(--gold)]">
              <span className="material-symbols-outlined text-sm">link</span>
              Based on trade call
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

      {/* Trade Chart */}
      {entry.chart_data && (
        <div className="p-6 rounded-2xl glass-surface">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-[var(--gold)]">candlestick_chart</span>
            Trade Chart
          </h3>
          <TradingViewChart
            symbol={entry.instrument}
            chartData={deserializeChartState(
              typeof entry.chart_data === 'string'
                ? entry.chart_data
                : JSON.stringify(entry.chart_data)
            )}
            readOnly
            height={400}
          />
        </div>
      )}

      {/* Pre-Trade Mindset */}
      {entry.pre_trade_mindset && (
        <div className="p-6 rounded-2xl glass-surface">
          <h3 className="font-bold text-lg mb-4">Pre-Trade Mindset</h3>
          {(() => {
            const mindset = entry.pre_trade_mindset as { readiness: number | null; tags: string[] } | null
            if (!mindset) return null
            return (
              <div className="space-y-4">
                {mindset.readiness !== null && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Readiness Level</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            level <= mindset.readiness!
                              ? 'bg-[var(--gold)] text-black'
                              : 'border border-[var(--glass-surface-border)] bg-black/[0.03] text-[var(--muted)]'
                          }`}
                        >
                          {level}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {mindset.tags && mindset.tags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Mental State Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {mindset.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] text-sm font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Emotions */}
      <div className="p-6 rounded-2xl glass-surface">
        <h3 className="font-bold text-lg mb-6">Emotional Journey</h3>
        <div className="flex items-center justify-around">
          <div className="text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Before</p>
            <p className="text-2xl font-bold">{getEmotionLabel(entry.emotion_before)}</p>
          </div>
          <div className="text-3xl text-[var(--glass-surface-border)]">&rarr;</div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">During</p>
            <p className="text-2xl font-bold">{getEmotionLabel(entry.emotion_during)}</p>
          </div>
          <div className="text-3xl text-[var(--glass-surface-border)]">&rarr;</div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">After</p>
            <p className="text-2xl font-bold">{getEmotionLabel(entry.emotion_after)}</p>
          </div>
        </div>
      </div>

      {/* Rules Followed */}
      {Array.isArray(entry.rules_followed) && entry.rules_followed.length > 0 && (
        <div className="p-6 rounded-2xl glass-surface">
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
        <div className="p-6 rounded-2xl glass-surface">
          <h3 className="font-bold text-lg mb-4">Screenshots</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entry.screenshot_urls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl overflow-hidden border border-[var(--glass-surface-border)] hover:border-[var(--gold)]/50 transition-colors"
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
        <div className="p-6 rounded-2xl glass-surface">
          <h3 className="font-bold text-lg mb-4">Notes & Reflection</h3>
          <p className="whitespace-pre-wrap text-[var(--muted)]">{entry.notes}</p>
        </div>
      )}

      {/* Teacher Feedback */}
      {feedback.length > 0 && (
        <div className="p-6 rounded-2xl glass-surface">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-[var(--gold)]">chat</span>
            Teacher Feedback
          </h3>
          <div className="space-y-4">
            {feedback.map((fb) => (
              <div key={fb.id} className="p-4 rounded-xl glass-surface">
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

      {/* Share Modal */}
      {showShareModal && entry && (
        <ShareToCommunityModal
          entry={entry}
          onClose={() => setShowShareModal(false)}
          onSuccess={(postId) => {
            setShowShareModal(false)
            setAlreadyShared(true)
            router.push(`/community/${postId}`)
          }}
        />
      )}
    </div>
  )
}
