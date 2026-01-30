'use client'

interface VoteButtonProps {
  score: number
  userVote: 1 | -1 | null
  onVote: (voteType: 1 | -1) => void
  size?: 'sm' | 'md'
}

export default function VoteButton({ score, userVote, onVote, size = 'md' }: VoteButtonProps) {
  const iconSize = size === 'sm' ? 'text-base' : 'text-xl'
  const scoreSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onVote(1)
        }}
        className={`p-1 rounded-lg transition-all ${
          userVote === 1
            ? 'text-[var(--gold)] bg-[var(--gold)]/10'
            : 'text-[var(--muted)] hover:text-[var(--gold)] hover:bg-[var(--gold)]/5'
        }`}
        aria-label="Upvote"
      >
        <span className={`material-symbols-outlined ${iconSize}`}>arrow_upward</span>
      </button>
      <span className={`font-bold ${scoreSize} ${
        score > 0 ? 'text-[var(--gold)]' : score < 0 ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
      }`}>
        {score}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onVote(-1)
        }}
        className={`p-1 rounded-lg transition-all ${
          userVote === -1
            ? 'text-[var(--danger)] bg-[var(--danger)]/10'
            : 'text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/5'
        }`}
        aria-label="Downvote"
      >
        <span className={`material-symbols-outlined ${iconSize}`}>arrow_downward</span>
      </button>
    </div>
  )
}
