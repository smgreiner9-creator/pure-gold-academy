'use client'

import { JournalEntryForm } from '@/components/journal/JournalEntryForm'

export default function NewJournalEntryPage() {
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
