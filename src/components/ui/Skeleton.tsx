'use client'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`skeleton-glass ${className}`} />
  )
}

// Pre-built skeleton variants for common use cases
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`glass-surface p-6 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  )
}

export function SkeletonList({ count = 3, className = '' }: SkeletonProps & { count?: number }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-surface p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonStats({ count = 4, className = '' }: SkeletonProps & { count?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-surface p-4">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-7 w-16 mb-1" />
          <Skeleton className="h-2 w-12" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonProps & { lines?: number }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

// Journal entry skeleton
export function SkeletonJournalEntry() {
  return (
    <div className="glass-surface p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// Dashboard widget skeleton
export function SkeletonWidget({ className = '' }: SkeletonProps) {
  return (
    <div className={`glass-surface p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// News item skeleton
export function SkeletonNewsItem() {
  return (
    <div className="glass-surface p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-1.5 min-h-[40px] rounded-full" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}

// Trade item skeleton
export function SkeletonTradeItem() {
  return (
    <div className="glass-surface p-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
          <Skeleton className="h-3 w-12 mt-1" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}
