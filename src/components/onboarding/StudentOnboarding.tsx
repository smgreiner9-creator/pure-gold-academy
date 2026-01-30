'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'
import { motion, AnimatePresence } from 'framer-motion'

const INSTRUMENTS = [
  { value: 'XAUUSD', label: 'Gold' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'BTCUSD', label: 'Bitcoin' },
  { value: 'NAS100', label: 'Nasdaq' },
  { value: 'US30', label: 'Dow Jones' },
  { value: 'SPX500', label: 'S&P 500' },
]

const RULES = [
  'Always set a stop loss',
  'Risk max 1-2% per trade',
  'Wait for confirmation before entry',
  'Only trade during my best sessions',
  'Check the economic calendar first',
  'Document my thesis before entering',
]

export function StudentOnboarding() {
  const router = useRouter()
  const { profile } = useAuth()
  const setProfile = useAuthStore((s) => s.setProfile)
  const supabase = useMemo(() => createClient(), [])
  const [step, setStep] = useState(0)
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [customRule, setCustomRule] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleInstrument = (value: string) => {
    setSelectedInstruments(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const toggleRule = (value: string) => {
    setSelectedRules(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const completeOnboarding = useCallback(async () => {
    if (!profile?.id) return
    setIsSubmitting(true)

    const completedState = {
      trades_logged: 0,
      first_trade_at: null,
      insights_unlocked: false,
      community_unlocked: false,
      completed_at: new Date().toISOString(),
      instruments: selectedInstruments,
      trading_rules: selectedRules,
    }

    try {
      await supabase
        .from('profiles')
        .update({ onboarding_state: completedState })
        .eq('id', profile.id)

      // Update the Zustand store immediately so the layout doesn't redirect back
      setProfile({ ...profile, onboarding_state: completedState })

      router.push('/journal')
    } catch {
      // Still update store to prevent redirect loop
      setProfile({ ...profile, onboarding_state: completedState })
      router.push('/journal')
    } finally {
      setIsSubmitting(false)
    }
  }, [profile, supabase, router, setProfile])

  const steps = [
    // Step 0: Set up journal
    <motion.div
      key="step-0"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 gold-gradient rounded-2xl flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-black">auto_stories</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Set Up Your Journal</h2>
        <p className="text-[var(--muted)] text-sm">Pick the instruments you trade most. You can always change these later.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.value}
            onClick={() => toggleInstrument(inst.value)}
            className={`p-3 rounded-xl text-sm font-semibold transition-all ${
              selectedInstruments.includes(inst.value)
                ? 'bg-[var(--gold)] text-black'
                : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
            }`}
          >
            {inst.label}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-3">Your Trading Rules</p>
        <div className="space-y-2">
          {[...RULES, ...selectedRules.filter(r => !RULES.includes(r))].map((rule) => (
            <button
              key={rule}
              onClick={() => toggleRule(rule)}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all flex items-center gap-2.5 ${
                selectedRules.includes(rule)
                  ? 'bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)]'
                  : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
              }`}
            >
              <span className="material-symbols-outlined text-lg shrink-0">
                {selectedRules.includes(rule) ? 'check_box' : 'check_box_outline_blank'}
              </span>
              {rule}
            </button>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const trimmed = customRule.trim()
              if (trimmed && !selectedRules.includes(trimmed)) {
                setSelectedRules(prev => [...prev, trimmed])
                setCustomRule('')
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={customRule}
              onChange={(e) => setCustomRule(e.target.value)}
              placeholder="Add your own rule..."
              className="flex-1 input-field rounded-xl px-3 py-2.5 text-sm placeholder:text-[var(--muted)]/50 focus:border-[var(--gold)]/50 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!customRule.trim()}
              className="px-4 py-2.5 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] text-sm font-semibold border border-[var(--gold)]/20 hover:bg-[var(--gold)]/20 transition-all disabled:opacity-30 disabled:cursor-default"
            >
              Add
            </button>
          </form>
        </div>
      </div>

      <button
        onClick={() => setStep(1)}
        className="w-full gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm uppercase tracking-wide"
      >
        Continue
      </button>
    </motion.div>,

    // Step 1: Log first trade prompt
    <motion.div
      key="step-1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--success)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--success)]">edit_note</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Log Your First Trade</h2>
        <p className="text-[var(--muted)] text-sm">
          Your journal is where growth happens. Log a recent trade — even from today or yesterday.
        </p>
      </div>

      <div className="p-4 rounded-2xl glass-surface space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--gold)]">lightbulb</span>
          </div>
          <div>
            <p className="text-sm font-bold">Quick tip</p>
            <p className="text-xs text-[var(--muted)]">Start with just the instrument, direction, and entry price. You can add more detail later.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={async () => {
            if (!profile?.id) return
            setIsSubmitting(true)
            const completedState = {
              trades_logged: 0,
              first_trade_at: null,
              insights_unlocked: false,
              community_unlocked: false,
              completed_at: new Date().toISOString(),
              instruments: selectedInstruments,
              trading_rules: selectedRules,
            }
            try {
              await supabase
                .from('profiles')
                .update({ onboarding_state: completedState })
                .eq('id', profile.id)
            } catch { /* non-critical */ }
            setProfile({ ...profile, onboarding_state: completedState })
            setIsSubmitting(false)
            router.push('/journal/new')
          }}
          disabled={isSubmitting}
          className="w-full gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm uppercase tracking-wide disabled:opacity-50"
        >
          Log a Trade Now
        </button>
        <button
          onClick={() => setStep(2)}
          className="w-full text-[var(--muted)] text-sm hover:text-[var(--foreground)] transition-colors py-2"
        >
          I&apos;ll do this later
        </button>
      </div>
    </motion.div>,

    // Step 2: You're ready
    <motion.div
      key="step-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--gold)]">rocket_launch</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">You&apos;re Ready!</h2>
        <p className="text-[var(--muted)] text-sm">
          Your journal is set up. Here&apos;s what to do next:
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl glass-surface">
          <span className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-sm font-bold text-[var(--gold)]">1</span>
          <p className="text-sm"><strong>Log trades</strong> — builds your data set</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl glass-surface">
          <span className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-sm font-bold text-[var(--gold)]">2</span>
          <p className="text-sm"><strong>5 trades</strong> unlocks analytics & community</p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl glass-surface">
          <span className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-sm font-bold text-[var(--gold)]">3</span>
          <p className="text-sm"><strong>Review insights</strong> — find your patterns</p>
        </div>
      </div>

      <button
        onClick={completeOnboarding}
        disabled={isSubmitting}
        className="w-full gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm uppercase tracking-wide disabled:opacity-50"
      >
        {isSubmitting ? 'Setting up...' : 'Go to My Journal'}
      </button>
    </motion.div>,
  ]

  return (
    <div className="max-w-md mx-auto">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? 'w-8 bg-[var(--gold)]' : i < step ? 'w-4 bg-[var(--gold)]/50' : 'w-4 bg-black/[0.06]'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {steps[step]}
      </AnimatePresence>
    </div>
  )
}
