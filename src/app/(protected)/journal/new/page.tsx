'use client'

import { JournalEntryForm } from '@/components/journal/JournalEntryForm'
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Journal Entry</h1>
        <p className="text-[var(--muted)] text-sm">Document your trade with detailed analysis</p>
      </div>

      <JournalEntryForm />
    </div>
  )
}
