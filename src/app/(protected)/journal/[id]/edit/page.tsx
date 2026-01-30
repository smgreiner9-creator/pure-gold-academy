'use client'

import { useParams } from 'next/navigation'
import { SteppedEntryForm } from '@/components/journal/SteppedEntryForm'
import { UpgradeRequired } from '@/components/journal/UpgradeRequired'
import { useJournalUsage } from '@/hooks/useJournalUsage'

export default function EditJournalEntryPage() {
  const params = useParams()
  const { isAtLimit, isLoading } = useJournalUsage()
  const entryId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-black/5 rounded w-1/3" />
          <div className="h-4 bg-black/5 rounded w-1/2" />
          <div className="h-64 bg-black/5 rounded" />
        </div>
      </div>
    )
  }

  if (isAtLimit) {
    return <UpgradeRequired />
  }

  return <SteppedEntryForm entryId={entryId} />
}
