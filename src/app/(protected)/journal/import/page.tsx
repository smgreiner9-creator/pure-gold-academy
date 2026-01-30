'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { TradeImport } from '@/components/journal/TradeImport'
import { ImportReflectionSwiper } from '@/components/journal/ImportReflectionSwiper'
import { UpgradeRequired } from '@/components/journal/UpgradeRequired'
import { useJournalUsage } from '@/hooks/useJournalUsage'

type ImportPhase = 'upload' | 'reflect' | 'done'

export default function ImportTradesPage() {
  const router = useRouter()
  const { isAtLimit, isLoading } = useJournalUsage()

  const [phase, setPhase] = useState<ImportPhase>('upload')
  const [importedEntryIds, setImportedEntryIds] = useState<string[]>([])

  const handleImportComplete = useCallback((entryIds: string[]) => {
    setImportedEntryIds(entryIds)
    if (entryIds.length > 0) {
      setPhase('reflect')
    } else {
      setPhase('done')
      router.push('/journal')
    }
  }, [router])

  const handleReflectionComplete = useCallback(() => {
    setPhase('done')
    router.push('/journal')
  }, [router])

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

  // Upgrade wall
  if (isAtLimit) {
    return <UpgradeRequired />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={() => router.push('/journal')}
          className="btn-glass p-2 rounded-xl"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>

        <div>
          <h1 className="text-2xl font-bold">Import Trades</h1>
          <p className="text-[var(--muted)] text-sm">
            {phase === 'upload' && 'Upload your MT4/MT5 trade history to journal them quickly'}
            {phase === 'reflect' && 'Add reflections to your imported trades'}
          </p>
        </div>
      </motion.div>

      {/* Content */}
      {phase === 'upload' && (
        <TradeImport onImportComplete={handleImportComplete} />
      )}

      {phase === 'reflect' && (
        <ImportReflectionSwiper
          entryIds={importedEntryIds}
          onComplete={handleReflectionComplete}
        />
      )}
    </div>
  )
}
