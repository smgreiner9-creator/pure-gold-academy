'use client'

import Link from 'next/link'
import type { LearnContent, LearnProgress } from '@/types/database'

interface ContentCardProps {
  content: LearnContent
  progress?: LearnProgress
  isPremiumUser: boolean
}

export function ContentCard({ content, progress, isPremiumUser }: ContentCardProps) {
  const isLocked = content.is_premium && !isPremiumUser
  const isCompleted = progress?.completed

  const getIcon = () => {
    switch (content.content_type) {
      case 'video':
        return 'play_circle'
      case 'pdf':
        return 'description'
      case 'image':
        return 'image'
      case 'text':
        return 'article'
      default:
        return 'description'
    }
  }

  const getTypeLabel = () => {
    switch (content.content_type) {
      case 'video':
        return 'Video'
      case 'pdf':
        return 'PDF'
      case 'image':
        return 'Image'
      case 'text':
        return 'Article'
      default:
        return 'Content'
    }
  }

  return (
    <Link href={isLocked ? '/settings/subscription' : `/learn/${content.id}`}>
      <div
        className={`p-5 rounded-2xl border bg-[var(--card-bg)] h-full hover:border-[var(--gold)]/50 transition-all ${
          isLocked ? 'opacity-75 border-[var(--card-border)]' : ''
        } ${isCompleted ? 'border-[var(--success)]/50' : 'border-[var(--card-border)]'}`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isCompleted
              ? 'bg-[var(--success)]/10 text-[var(--success)]'
              : 'bg-[var(--gold)]/10 text-[var(--gold)]'
          }`}>
            <span className="material-symbols-outlined text-2xl">
              {isLocked ? 'lock' : isCompleted ? 'check_circle' : getIcon()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-white/5 text-[var(--muted)]">
                {getTypeLabel()}
              </span>
              {content.is_premium && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                  Premium
                </span>
              )}
            </div>

            <h3 className="font-bold mb-1 truncate">{content.title}</h3>
            {content.description && (
              <p className="text-sm text-[var(--muted)] line-clamp-2">{content.description}</p>
            )}

            {progress && !isCompleted && progress.progress_percent > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-[var(--muted)] mb-1 uppercase tracking-widest">
                  <span>Progress</span>
                  <span className="font-bold">{progress.progress_percent}%</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--gold)] rounded-full transition-all"
                    style={{ width: `${progress.progress_percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {content.content_type === 'video' && !isLocked && (
            <span className="material-symbols-outlined text-3xl text-[var(--gold)] shrink-0">play_circle</span>
          )}
        </div>
      </div>
    </Link>
  )
}
