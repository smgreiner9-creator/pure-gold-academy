'use client'

import { motion } from 'framer-motion'
import type { FormState } from './TradeStep'

const emotions = [
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'confident', label: 'Confident', icon: '💪' },
  { value: 'neutral', label: 'Neutral', icon: '😐' },
  { value: 'anxious', label: 'Anxious', icon: '😰' },
  { value: 'fearful', label: 'Fearful', icon: '😨' },
  { value: 'greedy', label: 'Greedy', icon: '🤑' },
  { value: 'frustrated', label: 'Frustrated', icon: '😤' },
]

interface ReflectionStepProps {
  form: FormState
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  tradingRules: { id: string; label: string }[]
}

export function ReflectionStep({ form, updateField, tradingRules }: ReflectionStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="p-4 rounded-2xl glass-surface space-y-4"
    >
      <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-widest">The Reflection</h3>

      {/* Emotion Before */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
          How did you feel before this trade? <span className="text-[var(--danger)]">*</span>
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {emotions.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => updateField('emotionBefore', form.emotionBefore === e.value ? '' : e.value)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 ${
                form.emotionBefore === e.value
                  ? 'glass-elevated text-[var(--gold)]'
                  : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
              }`}
            >
              <span className="text-base">{e.icon}</span>
              <span className="font-medium">{e.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Rule Toggles */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">Rules Followed</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tradingRules.map((rule) => (
            <button
              key={rule.id}
              type="button"
              onClick={() => {
                updateField('rulesFollowed',
                  form.rulesFollowed.includes(rule.id)
                    ? form.rulesFollowed.filter(r => r !== rule.id)
                    : [...form.rulesFollowed, rule.id]
                )
              }}
              className={`p-2.5 rounded-xl text-left text-sm transition-all flex items-center gap-2 ${
                form.rulesFollowed.includes(rule.id)
                  ? 'bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)]'
                  : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
              }`}
            >
              <span className="material-symbols-outlined text-lg shrink-0">
                {form.rulesFollowed.includes(rule.id) ? 'check_box' : 'check_box_outline_blank'}
              </span>
              <span className={form.rulesFollowed.includes(rule.id) ? 'font-medium' : ''}>{rule.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Execution Rating */}
      <div>
        <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">Execution Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => updateField('executionRating', form.executionRating === star ? null : star)}
              className="p-1 transition-all hover:scale-110"
            >
              <span className={`material-symbols-outlined text-2xl ${
                form.executionRating !== null && star <= form.executionRating
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--muted)]/40'
              }`}>
                {form.executionRating !== null && star <= form.executionRating ? 'star' : 'star_border'}
              </span>
            </button>
          ))}
          {form.executionRating !== null && (
            <span className="ml-2 text-sm text-[var(--muted)] self-center">{form.executionRating}/5</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
