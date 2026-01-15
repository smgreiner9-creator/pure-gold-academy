'use client'

import Link from 'next/link'
import { useJournalUsage } from '@/hooks/useJournalUsage'
import { FREE_TIER_JOURNAL_LIMIT } from '@/lib/constants'

export function JournalUsageCard() {
  const { used, remaining, isAtLimit, isPremium, isLoading, percentUsed } = useJournalUsage()

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse">
        <div className="h-4 bg-white/5 rounded w-1/2 mb-2" />
        <div className="h-2 bg-white/5 rounded w-full" />
      </div>
    )
  }

  // Premium users see a simple badge
  if (isPremium) {
    return (
      <div className="p-4 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
            <span className="material-symbols-outlined">all_inclusive</span>
          </div>
          <div>
            <p className="text-sm font-semibold">Unlimited Journals</p>
            <p className="text-xs text-[var(--muted)]">Premium member</p>
          </div>
        </div>
      </div>
    )
  }

  // Free users at limit - urgent upgrade prompt
  if (isAtLimit) {
    return (
      <div className="p-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">block</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--danger)]">Monthly Limit Reached</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              You&apos;ve used all {FREE_TIER_JOURNAL_LIMIT} free entries this month.
              Upgrade to Premium for unlimited journaling.
            </p>
            <Link
              href="/settings/subscription"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg gold-gradient text-black text-xs font-bold hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-sm">bolt</span>
              Upgrade to Premium
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Free users with usage - show progress
  const isNearLimit = remaining <= 3
  const borderColor = isNearLimit ? 'border-[var(--warning)]/30' : 'border-[var(--card-border)]'
  const bgColor = isNearLimit ? 'bg-[var(--warning)]/5' : 'bg-[var(--card-bg)]'

  return (
    <div className={`p-4 rounded-xl border ${borderColor} ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--muted)] text-lg">edit_note</span>
          <span className="text-sm font-medium">Journal Entries</span>
        </div>
        <span className="text-sm font-bold mono-num">
          {used} / {FREE_TIER_JOURNAL_LIMIT}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-black/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isNearLimit ? 'bg-[var(--warning)]' : 'bg-[var(--gold)]'
          }`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-[var(--muted)]">
          {remaining} {remaining === 1 ? 'entry' : 'entries'} remaining this month
        </p>
        {isNearLimit && (
          <Link
            href="/settings/subscription"
            className="text-xs text-[var(--gold)] font-semibold hover:underline"
          >
            Upgrade
          </Link>
        )}
      </div>
    </div>
  )
}
