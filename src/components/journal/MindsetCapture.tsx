'use client'

const MINDSET_TAGS = ['Revenge', 'FOMO', 'Confident', 'Uncertain', 'Tired']

interface MindsetCaptureProps {
  readiness: number | null
  tags: string[]
  onReadinessChange: (value: number | null) => void
  onTagsChange: (tags: string[]) => void
}

export function MindsetCapture({ readiness, tags, onReadinessChange, onTagsChange }: MindsetCaptureProps) {
  const handleReadinessClick = (level: number) => {
    // Clicking the same level again deselects
    if (readiness === level) {
      onReadinessChange(null)
    } else {
      onReadinessChange(level)
    }
  }

  const handleTagToggle = (tag: string) => {
    if (tags.includes(tag)) {
      onTagsChange(tags.filter((t) => t !== tag))
    } else {
      onTagsChange([...tags, tag])
    }
  }

  return (
    <div className="space-y-3">
      {/* Readiness Slider */}
      <div>
        <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
          How ready do you feel?
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleReadinessClick(level)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                readiness !== null && level <= readiness
                  ? 'glass-elevated text-[var(--gold)]'
                  : 'border border-[var(--glass-surface-border)] bg-black/[0.03] text-[var(--muted)] hover:border-[var(--gold)]/50'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Quick-Tag Badges */}
      <div>
        <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2">
          Mental State
        </p>
        <div className="flex flex-wrap gap-2">
          {MINDSET_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagToggle(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                tags.includes(tag)
                  ? 'bg-[var(--gold)]/20 border border-[var(--gold)] text-[var(--gold)]'
                  : 'border border-[var(--glass-surface-border)] bg-black/[0.03] text-[var(--muted)] hover:border-[var(--gold)]/50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
