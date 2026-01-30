import { CATEGORIES } from '@/components/community/PostFilters'

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label || value
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'chart-analysis': 'bg-blue-500/10 text-blue-400',
    strategy: 'bg-purple-500/10 text-purple-400',
    psychology: 'bg-emerald-500/10 text-emerald-400',
    question: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    'trade-review': 'bg-[var(--gold)]/10 text-[var(--gold)]',
    general: 'bg-white/5 text-[var(--muted)]',
  }
  return colors[category] || colors.general
}
