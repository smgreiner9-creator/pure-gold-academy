'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft'
import { CollapsibleSection } from './CollapsibleSection'
import { ScreenshotUpload } from './ScreenshotUpload'
import { MindsetCapture } from './MindsetCapture'
import dynamic from 'next/dynamic'
import type { ChartState } from '@/lib/chartUtils'
import type { TradeDirection, EmotionType, TradeOutcome, Json, OnboardingState } from '@/types/database'
import { INSTRUMENT_OPTIONS } from '@/lib/instruments'
import { calculatePnl } from '@/lib/pnlCalculator'
import { useActiveClassroomStore } from '@/store/activeClassroom'

// Lazy load chart component
const TradingViewChart = dynamic(
  () => import('@/components/charts/TradingViewChart').then(mod => ({ default: mod.TradingViewChart })),
  { loading: () => <div className="h-[400px] rounded-xl bg-black/20 animate-pulse" /> }
)

const instruments = INSTRUMENT_OPTIONS

const emotions = [
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'confident', label: 'Confident', icon: '💪' },
  { value: 'neutral', label: 'Neutral', icon: '😐' },
  { value: 'anxious', label: 'Anxious', icon: '😰' },
  { value: 'fearful', label: 'Fearful', icon: '😨' },
  { value: 'greedy', label: 'Greedy', icon: '🤑' },
  { value: 'frustrated', label: 'Frustrated', icon: '😤' },
]

const outcomes = [
  { value: 'win', label: 'Win', icon: 'check_circle' },
  { value: 'loss', label: 'Loss', icon: 'cancel' },
  { value: 'breakeven', label: 'Breakeven', icon: 'remove_circle' },
]

const defaultTradingRules = [
  { id: 'plan', label: 'Followed my trading plan' },
  { id: 'risk', label: 'Proper risk management (1-2% max)' },
  { id: 'confirmation', label: 'Waited for confirmation' },
  { id: 'session', label: 'Traded during optimal session' },
  { id: 'news', label: 'Checked economic calendar' },
  { id: 'emotional', label: 'Was in a good emotional state' },
  { id: 'stop', label: 'Set stop loss before entry' },
  { id: 'journal', label: 'Documented trade thesis' },
]

interface FormState {
  instrument: string
  customInstrument: string
  direction: 'long' | 'short'
  tradeDate: string
  entryPrice: string
  exitPrice: string
  stopLoss: string
  takeProfit: string
  positionSize: string
  outcome: string
  emotionBefore: string
  emotionDuring: string
  emotionAfter: string
  notes: string
  rulesFollowed: string[]
  readiness: number | null
  mindsetTags: string[]
}

const defaultFormState: FormState = {
  instrument: 'XAUUSD',
  customInstrument: '',
  direction: 'long',
  tradeDate: new Date().toISOString().split('T')[0],
  entryPrice: '',
  exitPrice: '',
  stopLoss: '',
  takeProfit: '',
  positionSize: '0.01',
  outcome: '',
  emotionBefore: 'neutral',
  emotionDuring: '',
  emotionAfter: '',
  notes: '',
  rulesFollowed: [],
  readiness: null,
  mindsetTags: [],
}

export function JournalEntryForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { profile } = useAuth()
  const { activeClassroomId } = useActiveClassroomStore()
  const supabase = useMemo(() => createClient(), [])

  const tradeCallId = searchParams.get('trade_call_id') || null

  // Build rules list: defaults + user's custom rules from onboarding
  const tradingRules = useMemo(() => {
    const rules = [...defaultTradingRules]
    const onboarding = profile?.onboarding_state as OnboardingState | null
    const userRules = onboarding?.trading_rules ?? []
    // Add user's custom rules that aren't already in defaults
    const defaultLabels = new Set(defaultTradingRules.map(r => r.label))
    for (const rule of userRules) {
      if (!defaultLabels.has(rule)) {
        rules.push({ id: `custom_${rule}`, label: rule })
      }
    }
    return rules
  }, [profile?.onboarding_state])

  const [form, setForm] = useState<FormState>(() => {
    // Pre-fill from URL params (e.g., from trade call copy)
    return {
      ...defaultFormState,
      instrument: searchParams.get('instrument') || defaultFormState.instrument,
      direction: (searchParams.get('direction') as 'long' | 'short') || defaultFormState.direction,
      entryPrice: searchParams.get('entry_price') || '',
      stopLoss: searchParams.get('sl') || '',
      takeProfit: searchParams.get('tp') || '',
      tradeDate: searchParams.get('date') || defaultFormState.tradeDate,
    }
  })

  const [screenshots, setScreenshots] = useState<string[]>([])
  const [chartData, setChartData] = useState<ChartState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Auto-save draft
  const { hasDraft, restoredDraft, clearDraft, dismissDraft } = useAutoSaveDraft(profile?.id, form)

  // Restore draft prompt
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  useEffect(() => {
    if (hasDraft && restoredDraft) {
      setShowDraftPrompt(true)
    }
  }, [hasDraft, restoredDraft])

  const restoreDraft = useCallback(() => {
    if (restoredDraft) {
      setForm(restoredDraft as FormState)
      setShowDraftPrompt(false)
    }
  }, [restoredDraft])

  // Field updater
  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  // Calculations
  const calculations = useMemo(() => {
    const entry = parseFloat(form.entryPrice)
    const exit = parseFloat(form.exitPrice)
    const sl = parseFloat(form.stopLoss)
    const size = parseFloat(form.positionSize)

    if (isNaN(entry) || isNaN(exit) || isNaN(size)) {
      return { rMultiple: null, pnl: null }
    }

    const finalInstrument = form.instrument === 'OTHER' ? (form.customInstrument || 'OTHER') : form.instrument
    const result = calculatePnl({
      instrument: finalInstrument,
      direction: form.direction,
      entryPrice: entry,
      exitPrice: exit,
      positionSize: size,
      stopLoss: !isNaN(sl) ? sl : null,
    })

    return { rMultiple: result.rMultiple, pnl: result.pnl }
  }, [form.entryPrice, form.exitPrice, form.stopLoss, form.positionSize, form.direction, form.instrument, form.customInstrument])

  const handleSubmit = async () => {
    if (!profile?.id) {
      setError('Please wait for your profile to load.')
      return
    }

    const finalInstrument = form.instrument === 'OTHER' ? form.customInstrument : form.instrument
    if (!finalInstrument) { setError('Please select or enter an instrument'); return }
    if (!form.entryPrice) { setError('Please enter your entry price'); return }

    setError('')
    setIsLoading(true)

    try {
      const entryData = {
        user_id: profile.id,
        classroom_id: activeClassroomId || profile.classroom_id || null,
        instrument: finalInstrument,
        direction: form.direction as TradeDirection,
        entry_price: parseFloat(form.entryPrice),
        exit_price: form.exitPrice ? parseFloat(form.exitPrice) : null,
        stop_loss: form.stopLoss ? parseFloat(form.stopLoss) : null,
        take_profit: form.takeProfit ? parseFloat(form.takeProfit) : null,
        position_size: parseFloat(form.positionSize),
        r_multiple: calculations.rMultiple,
        pnl: calculations.pnl,
        outcome: form.outcome ? (form.outcome as TradeOutcome) : null,
        emotion_before: form.emotionBefore as EmotionType,
        emotion_during: form.emotionDuring ? (form.emotionDuring as EmotionType) : null,
        emotion_after: form.emotionAfter ? (form.emotionAfter as EmotionType) : null,
        notes: form.notes || null,
        trade_date: form.tradeDate,
        rules_followed: form.rulesFollowed,
        screenshot_urls: screenshots,
        chart_data: chartData ? (chartData as unknown as Json) : null,
        pre_trade_mindset: (form.readiness !== null || form.mindsetTags.length > 0) ? {
          readiness: form.readiness,
          tags: form.mindsetTags,
          captured_at: new Date().toISOString()
        } as unknown as Json : null,
        trade_call_id: tradeCallId,
      }

      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert(entryData)
        .select()
        .single()

      if (insertError) {
        console.error('Journal save error:', insertError)
        throw new Error(insertError.message)
      }

      clearDraft()
      setSuccess(true)
      setTimeout(() => { router.push('/journal'); router.refresh() }, 1200)
    } catch (err) {
      console.error('Journal save failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-12 rounded-2xl glass-surface text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Trade Logged!</h2>
        <p className="text-[var(--muted)]">Redirecting to your journal...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-lg btn-glass flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold">Log Trade</h1>
          <p className="text-[var(--muted)] text-sm">Fill in what you know — expand sections for more detail</p>
          {tradeCallId && (
            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--gold)]/10 text-[var(--gold)]">
              <span className="material-symbols-outlined text-xs">link</span>
              Based on trade call
            </span>
          )}
        </div>
      </div>

      {/* Draft Restore Prompt */}
      {showDraftPrompt && (
        <div className="p-4 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--gold)]">history</span>
            <p className="text-sm">You have an unsaved draft. Resume where you left off?</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { dismissDraft(); setShowDraftPrompt(false) }}
              className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] px-3 py-1.5 rounded-lg btn-glass transition-colors"
            >
              Discard
            </button>
            <button
              onClick={restoreDraft}
              className="text-xs text-black font-bold px-3 py-1.5 rounded-lg gold-gradient hover:opacity-90 transition-all"
            >
              Restore
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: Trade Setup — ALWAYS OPEN */}
      <div className="p-4 rounded-2xl glass-surface space-y-4">
        <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-widest">Trade Setup</h3>

        {/* Instrument Grid */}
        <div className="grid grid-cols-3 gap-2">
          {instruments.map((i) => (
            <button
              key={i.value}
              type="button"
              onClick={() => updateField('instrument', i.value)}
              className={`p-2.5 rounded-xl text-sm font-semibold transition-all ${
                form.instrument === i.value
                  ? 'glass-elevated text-[var(--gold)]'
                  : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
        {form.instrument === 'OTHER' && (
          <input
            value={form.customInstrument}
            onChange={(e) => updateField('customInstrument', e.target.value.toUpperCase())}
            placeholder="Enter symbol (e.g., AAPL)"
            className="w-full input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          />
        )}

        {/* Direction + Date row */}
        <div className="flex gap-3">
          <div className="flex rounded-xl overflow-hidden border border-[var(--glass-surface-border)] shrink-0">
            <button
              type="button"
              onClick={() => updateField('direction', 'long')}
              className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-1.5 ${
                form.direction === 'long'
                  ? 'bg-[var(--success)] text-white'
                  : 'bg-black/40 text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">trending_up</span>
              Long
            </button>
            <button
              type="button"
              onClick={() => updateField('direction', 'short')}
              className={`px-4 py-2.5 text-sm font-semibold transition-all flex items-center gap-1.5 ${
                form.direction === 'short'
                  ? 'bg-[var(--danger)] text-white'
                  : 'bg-black/40 text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className="material-symbols-outlined text-lg">trending_down</span>
              Short
            </button>
          </div>
          <input
            type="date"
            value={form.tradeDate}
            onChange={(e) => updateField('tradeDate', e.target.value)}
            className="flex-1 input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          />
        </div>
      </div>

      {/* SECTION 2: Prices & Risk — ALWAYS OPEN */}
      <div className="p-4 rounded-2xl glass-surface space-y-4">
        <h3 className="text-sm font-bold text-[var(--muted)] uppercase tracking-widest">Prices & Risk</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Entry Price</label>
            <input
              type="number" step="any"
              value={form.entryPrice}
              onChange={(e) => updateField('entryPrice', e.target.value)}
              placeholder="e.g., 2650.50"
              className="w-full input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Exit Price</label>
            <input
              type="number" step="any"
              value={form.exitPrice}
              onChange={(e) => updateField('exitPrice', e.target.value)}
              placeholder="Leave blank if open"
              className="w-full input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Stop Loss</label>
            <input
              type="number" step="any"
              value={form.stopLoss}
              onChange={(e) => updateField('stopLoss', e.target.value)}
              placeholder="SL price"
              className="w-full input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
            />
          </div>
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
          <div>
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Size (Lots)</label>
            <input
              type="number" step="0.01" min="0.01"
              value={form.positionSize}
              onChange={(e) => updateField('positionSize', e.target.value)}
              placeholder="0.01"
              className="w-full input-field rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
            />
          </div>
        </div>

        {/* Live Calculations */}
        {(calculations.rMultiple !== null || calculations.pnl !== null) && (
          <div className="flex items-center gap-6 p-3 rounded-xl glass-surface">
            {calculations.rMultiple !== null && (
              <div>
                <p className="text-[10px] text-[var(--muted)] uppercase">R-Multiple</p>
                <p className={`text-lg font-bold mono-num ${calculations.rMultiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {calculations.rMultiple >= 0 ? '+' : ''}{calculations.rMultiple}R
                </p>
              </div>
            )}
            {calculations.pnl !== null && (
              <div>
                <p className="text-[10px] text-[var(--muted)] uppercase">Est. P&L</p>
                <p className={`text-lg font-bold mono-num ${calculations.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {calculations.pnl >= 0 ? '+' : ''}${calculations.pnl}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Outcome */}
        <div>
          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1.5 block">Outcome</label>
          <div className="grid grid-cols-3 gap-2">
            {outcomes.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => updateField('outcome', form.outcome === o.value ? '' : o.value)}
                className={`p-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  form.outcome === o.value
                    ? o.value === 'win'
                      ? 'bg-[var(--success)] text-white'
                      : o.value === 'loss'
                      ? 'bg-[var(--danger)] text-white'
                      : 'bg-[var(--gold)] text-black'
                    : 'border border-[var(--glass-surface-border)] bg-black/[0.03] hover:border-[var(--gold)]/50'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{o.icon}</span>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: Chart — COLLAPSED */}
      <CollapsibleSection title="Chart Your Trade" icon="show_chart">
        <TradingViewChart
          symbol={form.instrument === 'OTHER' ? (form.customInstrument || 'CUSTOM') : form.instrument}
          chartData={chartData}
          onChartStateChange={setChartData}
          height={400}
        />
      </CollapsibleSection>

      {/* SECTION 4: Mindset & Emotions — COLLAPSED */}
      <CollapsibleSection title="Mindset & Emotions" icon="psychology">
        <div className="space-y-4">
          <MindsetCapture
            readiness={form.readiness}
            tags={form.mindsetTags}
            onReadinessChange={(val) => updateField('readiness', val)}
            onTagsChange={(tags) => updateField('mindsetTags', tags)}
          />

          <div className="border-t border-[var(--glass-surface-border)] pt-4">
            {/* Emotion Before */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">Before the trade</label>
              <div className="grid grid-cols-4 gap-2">
                {emotions.map((e) => (
                  <button
                    key={e.value} type="button"
                    onClick={() => updateField('emotionBefore', e.value)}
                    className={`p-2 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${
                      form.emotionBefore === e.value
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

            {/* Emotion During */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">During the trade</label>
              <div className="grid grid-cols-4 gap-2">
                {emotions.map((e) => (
                  <button
                    key={e.value} type="button"
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
                    key={e.value} type="button"
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
          </div>
        </div>
      </CollapsibleSection>

      {/* SECTION 5: Rules & Notes — COLLAPSED */}
      <CollapsibleSection
        title="Rules & Notes"
        icon="checklist"
        badge={form.rulesFollowed.length > 0 ? `${form.rulesFollowed.length}/${tradingRules.length}` : undefined}
      >
        <div className="space-y-4">
          {/* Rules Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tradingRules.map((rule) => (
              <button
                key={rule.id} type="button"
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

          {/* Screenshots */}
          {profile?.id && (
            <ScreenshotUpload
              userId={profile.id}
              screenshots={screenshots}
              onScreenshotsChange={setScreenshots}
              maxFiles={4}
            />
          )}
        </div>
      </CollapsibleSection>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">error</span>
          {error}
        </div>
      )}

      {/* Fixed Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-20 lg:left-64 z-40 border-t border-[var(--glass-surface-border)] bg-[var(--background)]/95 backdrop-blur-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl btn-glass font-semibold hover:bg-black/5 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-[2] gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm tracking-wide uppercase flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Save Trade
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
