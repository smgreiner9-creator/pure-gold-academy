'use client'

import dynamic from 'next/dynamic'
import { deserializeChartState } from '@/lib/chartUtils'
import type { CommunityPost, Json } from '@/types/database'

const TradingViewChart = dynamic(
  () => import('@/components/charts/TradingViewChart').then(m => ({ default: m.TradingViewChart })),
  { ssr: false }
)

interface SharedJournalData {
  instrument: string
  direction: string
  entry_price: number
  exit_price: number | null
  outcome: string | null
  r_multiple: number | null
  stop_loss: number | null
  take_profit: number | null
  trade_date: string
  position_size: number
  pnl?: number | null
  emotion_before?: string | null
  emotion_during?: string | null
  emotion_after?: string | null
  chart_data?: Json | null
}

interface TradeReviewPostProps {
  post: CommunityPost
}

function getOutcomeColor(outcome: string | null) {
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

function getEmotionLabel(emotion: string | null | undefined) {
  if (!emotion) return '-'
  return emotion.charAt(0).toUpperCase() + emotion.slice(1)
}

export function TradeReviewPost({ post }: TradeReviewPostProps) {
  const journalData = post.shared_journal_data as unknown as SharedJournalData | null

  if (!journalData) {
    return null
  }

  const chartState = journalData.chart_data
    ? deserializeChartState(
        typeof journalData.chart_data === 'string'
          ? journalData.chart_data
          : JSON.stringify(journalData.chart_data)
      )
    : null

  const hasEmotions = journalData.emotion_before !== undefined
  const hasPnl = journalData.pnl !== undefined

  return (
    <div className="space-y-4">
      {/* Trade Summary Badge Row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${getOutcomeColor(journalData.outcome)}`}>
          {journalData.outcome || 'OPEN'}
        </span>
        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
          journalData.direction === 'long' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {journalData.direction === 'long' ? 'trending_up' : 'trending_down'}
          </span>
          {journalData.direction.toUpperCase()}
        </span>
        {journalData.r_multiple !== null && journalData.r_multiple !== undefined && (
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold mono-num ${
            journalData.r_multiple >= 0 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
          }`}>
            {journalData.r_multiple >= 0 ? '+' : ''}{journalData.r_multiple}R
          </span>
        )}
        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/5 text-[var(--muted)]">
          {new Date(journalData.trade_date).toLocaleDateString()}
        </span>
      </div>

      {/* Trade Details Grid */}
      <div className="p-4 rounded-xl glass-surface">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Instrument</p>
            <p className="font-bold mono-num">{journalData.instrument}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Entry Price</p>
            <p className="font-semibold mono-num">{journalData.entry_price}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Exit Price</p>
            <p className="font-semibold mono-num">{journalData.exit_price ?? '-'}</p>
          </div>
          {hasPnl ? (
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">P&L</p>
              <p className={`font-bold mono-num ${
                journalData.pnl !== null && journalData.pnl !== undefined
                  ? (journalData.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]')
                  : ''
              }`}>
                {journalData.pnl !== null && journalData.pnl !== undefined ? `$${journalData.pnl.toFixed(2)}` : '-'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Size</p>
              <p className="font-semibold mono-num">{journalData.position_size} lots</p>
            </div>
          )}
        </div>
        {(journalData.stop_loss || journalData.take_profit) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-3 border-t border-[var(--glass-surface-border)]">
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Stop Loss</p>
              <p className="font-semibold mono-num text-sm">{journalData.stop_loss ?? '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Take Profit</p>
              <p className="font-semibold mono-num text-sm">{journalData.take_profit ?? '-'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      {chartState && (
        <div className="rounded-xl overflow-hidden">
          <TradingViewChart
            symbol={journalData.instrument}
            chartData={chartState}
            readOnly
            height={350}
          />
        </div>
      )}

      {/* Emotion Journey */}
      {hasEmotions && (
        <div className="p-4 rounded-xl glass-surface">
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Emotional Journey</p>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Before</p>
              <p className="text-lg font-bold">{getEmotionLabel(journalData.emotion_before)}</p>
            </div>
            <div className="text-2xl text-[var(--glass-surface-border)]">&rarr;</div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">During</p>
              <p className="text-lg font-bold">{getEmotionLabel(journalData.emotion_during)}</p>
            </div>
            <div className="text-2xl text-[var(--glass-surface-border)]">&rarr;</div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">After</p>
              <p className="text-lg font-bold">{getEmotionLabel(journalData.emotion_after)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Trader's Analysis */}
      {post.content && (
        <div>
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">Analysis & Notes</p>
          <p className="whitespace-pre-wrap text-sm text-[var(--muted)]">{post.content}</p>
        </div>
      )}

      {/* Privacy Indicator */}
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
        <span className="material-symbols-outlined text-xs">visibility</span>
        Shared selectively by the trader
      </div>
    </div>
  )
}
