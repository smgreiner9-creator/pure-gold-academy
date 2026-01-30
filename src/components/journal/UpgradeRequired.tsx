'use client'

import Link from 'next/link'
import { FREE_TIER_JOURNAL_LIMIT, PRICING } from '@/lib/constants'

export function UpgradeRequired() {
  return (
    <div className="max-w-md mx-auto p-6 rounded-2xl glass-surface text-center">
      {/* Icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-[var(--gold)]">lock</span>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold mb-2">Monthly Limit Reached</h2>
      <p className="text-[var(--muted)] mb-6">
        You&apos;ve used all {FREE_TIER_JOURNAL_LIMIT} free journal entries this month.
        Upgrade to Premium for unlimited access.
      </p>

      {/* Premium benefits */}
      <div className="text-left p-4 rounded-xl glass-surface mb-6">
        <p className="text-xs font-bold text-[var(--gold)] uppercase tracking-widest mb-3">
          Premium includes
        </p>
        <ul className="space-y-2">
          {[
            'Unlimited journal entries',
            'Advanced analytics & insights',
            'Emotion & performance correlations',
            'Export your trade data',
            'Priority teacher feedback',
            'Priority access to new features',
          ].map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-[var(--success)] text-sm">check</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* Price */}
      <div className="mb-6">
        <span className="text-3xl font-bold text-[var(--gold)]">${PRICING.premium}</span>
        <span className="text-[var(--muted)]">/month</span>
      </div>

      {/* CTA */}
      <Link
        href="/settings/subscription"
        className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-xl gold-gradient text-black font-bold hover:opacity-90 transition-opacity"
      >
        <span className="material-symbols-outlined">bolt</span>
        Upgrade to Premium
      </Link>

      {/* Back link */}
      <Link
        href="/journal"
        className="inline-block mt-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        Back to Journal
      </Link>
    </div>
  )
}
