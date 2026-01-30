interface TrackRecordBadgeProps {
  totalCalls: number
  winRate: number
  avgReturn: number
}

export default function TrackRecordBadge({
  totalCalls,
  winRate,
  avgReturn,
}: TrackRecordBadgeProps) {
  // Only show if minimum 10 calls
  if (totalCalls < 10) return null

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30">
      <span className="material-symbols-outlined text-[var(--gold)] text-lg">
        verified
      </span>
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
            Verified Track Record
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <span className="font-bold">{totalCalls}</span>
            <span className="text-[var(--muted)]">calls</span>
          </span>
          <span className="text-[var(--glass-surface-border)]">|</span>
          <span className="flex items-center gap-1">
            <span
              className="font-bold"
              style={{
                color: winRate >= 50 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {winRate.toFixed(0)}%
            </span>
            <span className="text-[var(--muted)]">win</span>
          </span>
          <span className="text-[var(--glass-surface-border)]">|</span>
          <span className="flex items-center gap-1">
            <span
              className="font-bold"
              style={{
                color: avgReturn >= 0 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(1)}%
            </span>
            <span className="text-[var(--muted)]">avg</span>
          </span>
        </div>
      </div>
    </div>
  )
}
