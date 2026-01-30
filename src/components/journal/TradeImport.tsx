'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { parseTradeCSV, type ParsedTrade, type ImportResult } from '@/lib/tradeImporter'

interface TradeImportProps {
  onImportComplete: (entryIds: string[]) => void
}

export function TradeImport({ onImportComplete }: TradeImportProps) {
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [parseResult, setParseResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importError, setImportError] = useState('')

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportError('Please select a CSV file')
      return
    }

    setImportError('')
    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (!content) {
        setImportError('Could not read file')
        return
      }
      const result = parseTradeCSV(content)
      setParseResult(result)
    }
    reader.onerror = () => {
      setImportError('Error reading file')
    }
    reader.readAsText(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleCancel = useCallback(() => {
    setParseResult(null)
    setFileName('')
    setImportError('')
    setShowErrors(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleImport = useCallback(async () => {
    if (!parseResult || !profile?.id) return

    const trades = parseResult.trades
    if (trades.length === 0) return

    setIsImporting(true)
    setImportProgress({ current: 0, total: trades.length })
    setImportError('')

    const importedIds: string[] = []
    const batchSize = 10

    try {
      for (let i = 0; i < trades.length; i += batchSize) {
        const batch = trades.slice(i, i + batchSize)
        const inserts = batch.map((trade: ParsedTrade) => ({
          user_id: profile.id,
          classroom_id: profile.classroom_id || null,
          instrument: trade.instrument,
          direction: trade.direction,
          entry_price: trade.entryPrice,
          exit_price: trade.exitPrice,
          stop_loss: trade.stopLoss,
          take_profit: trade.takeProfit,
          position_size: trade.positionSize,
          outcome: trade.outcome,
          pnl: trade.pnl,
          trade_date: trade.tradeDate,
          entry_time: trade.entryTime,
          exit_time: trade.exitTime,
          emotion_before: 'neutral' as const,
          rules_followed: [],
          screenshot_urls: [],
          custom_tags: [],
          status: 'published' as const,
          import_source: parseResult.format,
        }))

        const { data, error } = await supabase
          .from('journal_entries')
          .insert(inserts)
          .select('id')

        if (error) {
          console.error('Import batch error:', error)
          setImportError(`Failed to import some trades: ${error.message}`)
          break
        }

        if (data) {
          importedIds.push(...data.map((d: { id: string }) => d.id))
        }

        setImportProgress({ current: Math.min(i + batchSize, trades.length), total: trades.length })
      }

      if (importedIds.length > 0) {
        onImportComplete(importedIds)
      }
    } catch (err) {
      console.error('Import error:', err)
      setImportError('An unexpected error occurred during import')
    } finally {
      setIsImporting(false)
    }
  }, [parseResult, profile, supabase, onImportComplete])

  const formatLabel = parseResult?.format === 'mt4' ? 'MT4' : parseResult?.format === 'mt5' ? 'MT5' : 'Generic'

  const previewTrades = parseResult?.trades.slice(0, 5) || []

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      {!parseResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
            transition-all duration-300
            ${isDragging
              ? 'border-[var(--gold)] bg-[var(--gold)]/5'
              : 'border-[var(--glass-surface-border)] hover:border-[var(--foreground)]/30'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3">
            <motion.span
              className="material-symbols-outlined text-5xl text-[var(--muted)]"
              animate={isDragging ? { scale: 1.1, color: 'var(--gold)' } : { scale: 1 }}
            >
              file_upload
            </motion.span>

            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]">
                Drop your MT4/MT5 export here
              </p>
              <p className="text-sm text-[var(--muted)] mt-1">
                or click to browse. Accepts .csv files.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {importError && !parseResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded-xl px-4 py-3"
        >
          <span className="material-symbols-outlined text-lg">error</span>
          {importError}
        </motion.div>
      )}

      {/* Preview */}
      <AnimatePresence mode="wait">
        {parseResult && !isImporting && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            {/* File Info Bar */}
            <div className="glass-surface rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[var(--gold)]">description</span>
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {parseResult.trades.length} trades ready to import
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`
                  px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider
                  ${parseResult.format === 'mt4'
                    ? 'bg-blue-500/15 text-blue-400'
                    : parseResult.format === 'mt5'
                      ? 'bg-purple-500/15 text-purple-400'
                      : 'bg-[var(--muted)]/15 text-[var(--muted)]'
                  }
                `}>
                  {formatLabel}
                </span>
              </div>
            </div>

            {/* Error Summary */}
            {parseResult.errors.length > 0 && (
              <div className="glass-surface rounded-xl p-4">
                <button
                  onClick={() => setShowErrors(prev => !prev)}
                  className="flex items-center gap-2 text-sm text-[var(--warning)] w-full"
                >
                  <span className="material-symbols-outlined text-lg">warning</span>
                  <span className="font-medium">
                    {parseResult.errors.length} row{parseResult.errors.length !== 1 ? 's' : ''} could not be parsed
                  </span>
                  <span className="material-symbols-outlined text-lg ml-auto transition-transform" style={{
                    transform: showErrors ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>
                    expand_more
                  </span>
                </button>

                <AnimatePresence>
                  {showErrors && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="mt-3 space-y-1 text-xs text-[var(--muted)] max-h-40 overflow-y-auto">
                        {parseResult.errors.map((err, i) => (
                          <li key={i} className="font-mono">{err}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Preview Table */}
            {previewTrades.length > 0 && (
              <div className="glass-surface rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[var(--glass-surface-border)]">
                  <p className="text-sm font-medium text-[var(--muted)]">Preview (first 5 trades)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--glass-surface-border)] text-[var(--muted)]">
                        <th className="text-left px-4 py-2.5 font-medium">Instrument</th>
                        <th className="text-left px-4 py-2.5 font-medium">Direction</th>
                        <th className="text-right px-4 py-2.5 font-medium">Entry</th>
                        <th className="text-right px-4 py-2.5 font-medium">Exit</th>
                        <th className="text-right px-4 py-2.5 font-medium">PnL</th>
                        <th className="text-left px-4 py-2.5 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewTrades.map((trade, i) => (
                        <tr key={i} className="border-b border-[var(--glass-surface-border)] last:border-0">
                          <td className="px-4 py-2.5 font-medium">{trade.instrument}</td>
                          <td className="px-4 py-2.5">
                            <span className={`
                              inline-flex items-center gap-1 text-xs font-bold uppercase
                              ${trade.direction === 'long' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}
                            `}>
                              <span className="material-symbols-outlined text-sm">
                                {trade.direction === 'long' ? 'trending_up' : 'trending_down'}
                              </span>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right mono-num">{trade.entryPrice}</td>
                          <td className="px-4 py-2.5 text-right mono-num">{trade.exitPrice}</td>
                          <td className={`px-4 py-2.5 text-right mono-num font-semibold ${
                            trade.pnl > 0 ? 'text-[var(--success)]' : trade.pnl < 0 ? 'text-[var(--danger)]' : 'text-[var(--muted)]'
                          }`}>
                            {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--muted)] mono-num">{trade.tradeDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Error */}
            {importError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-[var(--danger)] bg-[var(--danger)]/10 rounded-xl px-4 py-3"
              >
                <span className="material-symbols-outlined text-lg">error</span>
                {importError}
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">
                <span className="font-semibold text-[var(--foreground)]">{parseResult.trades.length}</span>{' '}
                trade{parseResult.trades.length !== 1 ? 's' : ''} ready to import
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  className="btn-glass px-5 py-2.5 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={parseResult.trades.length === 0}
                  className="btn-gold px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import All
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Importing Progress */}
        {isImporting && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-surface rounded-2xl p-8 text-center space-y-4"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gold)]/10">
              <motion.span
                className="material-symbols-outlined text-3xl text-[var(--gold)]"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              >
                sync
              </motion.span>
            </div>

            <div>
              <p className="text-lg font-semibold">Importing trades...</p>
              <p className="text-sm text-[var(--muted)] mt-1">
                {importProgress.current} / {importProgress.total} imported
              </p>
            </div>

            <div className="w-full h-2 rounded-full bg-[var(--glass-surface-border)] overflow-hidden">
              <motion.div
                className="h-full rounded-full gold-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
