'use client'

import Link from 'next/link'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryLabel?: string
  secondaryHref?: string
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
}: EmptyStateProps) {
  return (
    <div className="p-10 rounded-2xl glass-surface text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-2xl text-[var(--gold)]">{icon}</span>
      </div>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-[var(--muted)] mb-5 max-w-sm mx-auto">{description}</p>

      <div className="flex items-center justify-center gap-3">
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            {actionLabel}
          </Link>
        )}
        {actionLabel && onAction && !actionHref && (
          <button
            onClick={onAction}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            {actionLabel}
          </button>
        )}
        {secondaryLabel && secondaryHref && (
          <Link
            href={secondaryHref}
            className="h-10 px-4 rounded-lg btn-glass text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors inline-flex items-center"
          >
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  )
}
