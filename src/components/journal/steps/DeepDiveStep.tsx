'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { ScreenshotUpload } from '@/components/journal/ScreenshotUpload'
import type { ChartState } from '@/lib/chartUtils'
import type { FormState } from './TradeStep'
import { SetupTypePicker } from '@/components/journal/SetupTypePicker'

// Lazy load chart component
const TradingViewChart = dynamic(
  () => import('@/components/charts/TradingViewChart').then(mod => ({ default: mod.TradingViewChart })),
  { loading: () => <div className="h-[400px] rounded-xl bg-black/20 animate-pulse" /> }
)

const emotions = [
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'confident', label: 'Confident', icon: '💪' },
  { value: 'neutral', label: 'Neutral', icon: '😐' },
  { value: 'anxious', label: 'Anxious', icon: '😰' },
  { value: 'fearful', label: 'Fearful', icon: '😨' },
  { value: 'greedy', label: 'Greedy', icon: '🤑' },
  { value: 'frustrated', label: 'Frustrated', icon: '😤' },
]

interface DeepDiveStepProps {
  form: FormState
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  screenshots: string[]
  onScreenshotsChange: (urls: string[]) => void
  chartData: ChartState | null
  onChartDataChange: (data: ChartState | null) => void
  userId: string
}

export function DeepDiveStep({
  form,
  updateField,
  screenshots,
  onScreenshotsChange,
  chartData,
  onChartDataChange,
  userId,
}: DeepDiveStepProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const chartSymbol = form.instrument === 'OTHER' ? (form.customInstrument || 'CUSTOM') : form.instrument

  return (
    <div className="rounded-2xl glass-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-[var(--muted)]">psychology</span>
          <span className="text-sm font-bold">Go Deeper</span>
          <span className="text-[10px] text-[var(--muted)] font-medium">(optional)</span>
        </div>
        <span className={`material-symbols-outlined text-lg text-[var(--muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-4">
              {/* Chart Annotation Area */}
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">Chart Your Trade</label>
                <TradingViewChart
                  symbol={chartSymbol}
                  chartData={chartData}
                  onChartStateChange={onChartDataChange}
                  height={400}
                />
              </div>

              {/* Screenshots */}
              <ScreenshotUpload
                userId={userId}
                screenshots={screenshots}
                onScreenshotsChange={onScreenshotsChange}
                maxFiles={4}
              />

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Trade Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="What was your thesis? What did you learn?"
                  className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors min-h-[80px] resize-none"
                />
              </div>

              {/* Reflection Notes */}
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Reflection Notes</label>
                <textarea
                  value={form.reflectionNotes}
                  onChange={(e) => updateField('reflectionNotes', e.target.value)}
                  placeholder="What would you do differently? Key takeaways..."
                  className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors min-h-[80px] resize-none"
                />
              </div>

              {/* Emotion During */}
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">During the trade</label>
                <div className="grid grid-cols-4 gap-2">
                  {emotions.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => updateField('emotionDuring', form.emotionDuring === e.value ? '' : e.value)}
                      className={`p-2 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${
                        form.emotionDuring === e.value
                          ? 'glass-elevated text-[var(--gold)]'
                          : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
                      }`}
                    >
                      <span className="text-lg">{e.icon}</span>
                      <span className="font-medium">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emotion After */}
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">After the trade</label>
                <div className="grid grid-cols-4 gap-2">
                  {emotions.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => updateField('emotionAfter', form.emotionAfter === e.value ? '' : e.value)}
                      className={`p-2 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${
                        form.emotionAfter === e.value
                          ? 'glass-elevated text-[var(--gold)]'
                          : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
                      }`}
                    >
                      <span className="text-lg">{e.icon}</span>
                      <span className="font-medium">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Setup Type */}
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">Setup Type</label>
                <SetupTypePicker
                  value={form.setupType}
                  customValue={form.setupTypeCustom}
                  onChange={(v) => updateField('setupType', v)}
                  onCustomChange={(v) => updateField('setupTypeCustom', v)}
                />
              </div>

              {/* Take Profit (if not already filled in step 1) */}
              {!form.takeProfit && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Take Profit</label>
                  <input
                    type="number" step="any"
                    value={form.takeProfit}
                    onChange={(e) => updateField('takeProfit', e.target.value)}
                    placeholder="TP price"
                    className="w-full input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
