'use client'

import { SteppedEntryForm } from '@/components/journal/SteppedEntryForm'
import { UpgradeRequired } from '@/components/journal/UpgradeRequired'
import { useJournalUsage } from '@/hooks/useJournalUsage'

export default function NewJournalEntryPage() {
  const { isAtLimit, isLoading } = useJournalUsage()

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/5 rounded w-1/3" />
          <div className="h-4 bg-black/5 rounded w-1/2" />
          <div className="h-64 bg-black/5 rounded" />
        </div>
      </div>
    )
  }

  // Show upgrade screen if at limit
  if (isAtLimit) {
    return <UpgradeRequired />
  }

  return <SteppedEntryForm />
}
