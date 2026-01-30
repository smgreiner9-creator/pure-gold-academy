'use client'

import Link from 'next/link'
import type { OnboardingState } from '@/types/database'

interface ProgressiveGateProps {
  onboardingState: OnboardingState | null
  requiredTrades: number
  featureLabel: string
  children: React.ReactNode
}

const DEFAULT_STATE: OnboardingState = {
  trades_logged: 0,
  first_trade_at: null,
  insights_unlocked: false,
  community_unlocked: false,
  completed_at: null,
}

export function ProgressiveGate({
  onboardingState,
  requiredTrades,
  featureLabel,
  children,
}: ProgressiveGateProps) {
  const state = onboardingState ?? DEFAULT_STATE
  const tradesLogged = state.trades_logged

  if (tradesLogged >= requiredTrades) {
    return <>{children}</>
  }

  const remaining = requiredTrades - tradesLogged

  return (
    <div className="relative">
      {/* Blurred preview of children */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center p-6 rounded-2xl glass-floating max-w-sm mx-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-[var(--gold)]">lock</span>
          </div>
          <h3 className="text-sm font-bold mb-1">{featureLabel}</h3>
          <p className="text-xs text-[var(--muted)] mb-4">
            Log {remaining} more trade{remaining !== 1 ? 's' : ''} to unlock this feature
          </p>
          <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden mb-4">
            <div
              className="h-full gold-gradient rounded-full transition-all"
              style={{ width: `${Math.min((tradesLogged / requiredTrades) * 100, 100)}%` }}
            />
          </div>
          <Link
            href="/journal/new"
            className="gold-gradient text-black font-bold text-xs h-8 px-4 rounded-lg inline-flex items-center gap-1.5 hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Log a Trade
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Inline gate — hides content entirely instead of showing a blurred preview.
 * Use for nav items or small UI elements.
 */
export function ProgressiveGateInline({
  onboardingState,
  requiredTrades,
  children,
}: Omit<ProgressiveGateProps, 'featureLabel'>) {
  const state = onboardingState ?? DEFAULT_STATE
  if (state.trades_logged >= requiredTrades) {
    return <>{children}</>
  }
  return null
}
