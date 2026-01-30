'use client'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'chart-analysis', label: 'Chart Analysis' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'question', label: 'Question' },
  { value: 'trade-review', label: 'Trade Review' },
  { value: 'general', label: 'General' },
]

const SORT_OPTIONS = [
  { value: 'hot', label: 'Hot', icon: 'local_fire_department' },
  { value: 'new', label: 'New', icon: 'schedule' },
  { value: 'top', label: 'Top', icon: 'trending_up' },
]

interface PostFiltersProps {
  activeCategory: string
  activeSort: string
  searchQuery: string
  onCategoryChange: (category: string) => void
  onSortChange: (sort: string) => void
  onSearchChange: (query: string) => void
}

export default function PostFilters({
  activeCategory,
  activeSort,
  searchQuery,
  onCategoryChange,
  onSortChange,
  onSearchChange,
}: PostFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-lg">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search posts..."
          className="input-field w-full pl-10 text-sm"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Category pills */}
        <div className="flex flex-wrap gap-2 flex-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeCategory === cat.value
                  ? 'glass-elevated text-[var(--gold)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--glass-surface-border)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-1 glass-surface p-1 shrink-0">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeSort === opt.value
                  ? 'glass-elevated text-[var(--gold)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { CATEGORIES }
