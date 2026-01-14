'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ScreenshotUpload } from './ScreenshotUpload'
import type { TradeDirection, EmotionType, TradeOutcome } from '@/types/database'

const instruments = [
  { value: 'XAUUSD', label: 'Gold (XAUUSD)' },
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'BTCUSD', label: 'Bitcoin' },
  { value: 'OTHER', label: 'Other' },
]

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

// Default trading rules checklist
const tradingRules = [
  { id: 'plan', label: 'Followed my trading plan' },
  { id: 'risk', label: 'Proper risk management (1-2% max)' },
  { id: 'confirmation', label: 'Waited for confirmation' },
  { id: 'session', label: 'Traded during optimal session' },
  { id: 'news', label: 'Checked economic calendar' },
  { id: 'emotional', label: 'Was in a good emotional state' },
  { id: 'stop', label: 'Set stop loss before entry' },
  { id: 'journal', label: 'Documented trade thesis' },
]

export function JournalEntryForm() {
  const router = useRouter()
  const { profile } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [step, setStep] = useState(1)

  // Form state
  const [instrument, setInstrument] = useState('XAUUSD')
  const [customInstrument, setCustomInstrument] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entryPrice, setEntryPrice] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [positionSize, setPositionSize] = useState('0.01')
  const [outcome, setOutcome] = useState<string>('')
  const [emotionBefore, setEmotionBefore] = useState('neutral')
  const [emotionDuring, setEmotionDuring] = useState('')
  const [emotionAfter, setEmotionAfter] = useState('')
  const [notes, setNotes] = useState('')
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0])
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [rulesFollowed, setRulesFollowed] = useState<string[]>([])

  // Calculate R-multiple and P&L
  const calculations = useMemo(() => {
    const entry = parseFloat(entryPrice)
    const exit = parseFloat(exitPrice)
    const sl = parseFloat(stopLoss)
    const size = parseFloat(positionSize)

    let rMultiple: number | null = null
    let pnl: number | null = null

    if (!isNaN(entry) && !isNaN(exit) && !isNaN(sl) && sl !== entry) {
      // R-multiple = (Exit - Entry) / (Entry - StopLoss) for long
      // R-multiple = (Entry - Exit) / (StopLoss - Entry) for short
      const risk = Math.abs(entry - sl)
      const reward = direction === 'long' ? exit - entry : entry - exit
      rMultiple = parseFloat((reward / risk).toFixed(2))
    }

    if (!isNaN(entry) && !isNaN(exit) && !isNaN(size)) {
      // Simple P&L calculation (price difference * position size * 100 for forex)
      // This is a simplified calculation - actual P&L depends on instrument
      const priceDiff = direction === 'long' ? exit - entry : entry - exit
      pnl = parseFloat((priceDiff * size * 100).toFixed(2))
    }

    return { rMultiple, pnl }
  }, [entryPrice, exitPrice, stopLoss, positionSize, direction])

  // Debug: Check if profile is loaded
  useEffect(() => {
    console.log('Profile loaded:', profile)
  }, [profile])

  const handleSubmit = async () => {
    // Validation
    if (!profile?.id) {
      setError('Please wait for your profile to load, or try refreshing the page.')
      return
    }

    const finalInstrument = instrument === 'OTHER' ? customInstrument : instrument
    if (!finalInstrument) {
      setError('Please select or enter an instrument')
      return
    }

    if (!entryPrice) {
      setError('Please enter your entry price')
      return
    }

    if (!positionSize || parseFloat(positionSize) <= 0) {
      setError('Please enter a valid position size')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const entryData = {
        user_id: profile.id,
        classroom_id: profile.classroom_id || null,
        instrument: finalInstrument,
        direction: direction as TradeDirection,
        entry_price: parseFloat(entryPrice),
        exit_price: exitPrice ? parseFloat(exitPrice) : null,
        stop_loss: stopLoss ? parseFloat(stopLoss) : null,
        take_profit: takeProfit ? parseFloat(takeProfit) : null,
        position_size: parseFloat(positionSize),
        r_multiple: calculations.rMultiple,
        pnl: calculations.pnl,
        outcome: outcome ? (outcome as TradeOutcome) : null,
        emotion_before: emotionBefore as EmotionType,
        emotion_during: emotionDuring ? (emotionDuring as EmotionType) : null,
        emotion_after: emotionAfter ? (emotionAfter as EmotionType) : null,
        notes: notes || null,
        trade_date: tradeDate,
        rules_followed: rulesFollowed,
        screenshot_urls: screenshots,
      }

      console.log('Submitting entry:', entryData)

      const { data, error: insertError } = await supabase
        .from('journal_entries')
        .insert(entryData)
        .select()
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error(insertError.message)
      }

      console.log('Entry saved:', data)
      setSuccess(true)

      // Redirect after brief success message
      setTimeout(() => {
        router.push('/journal')
        router.refresh()
      }, 1500)

    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="p-12 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--success)]/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[var(--success)]">check_circle</span>
        </div>
        <h2 className="text-2xl font-bold mb-2">Trade Logged!</h2>
        <p className="text-[var(--muted)]">Redirecting to your journal...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-lg border border-[var(--card-border)] flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold">Log Trade</h1>
          <p className="text-[var(--muted)] text-sm">Document your trade with full details</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-[var(--gold)]' : 'bg-[var(--card-border)]'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Trade Setup */}
      {step === 1 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-6">What did you trade?</h3>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Instrument
              </label>
              <div className="grid grid-cols-3 gap-2">
                {instruments.map((i) => (
                  <button
                    key={i.value}
                    type="button"
                    onClick={() => setInstrument(i.value)}
                    className={`p-3 rounded-xl text-sm font-semibold transition-all ${
                      instrument === i.value
                        ? 'bg-[var(--gold)] text-black'
                        : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--gold)]/50'
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
              {instrument === 'OTHER' && (
                <input
                  value={customInstrument}
                  onChange={(e) => setCustomInstrument(e.target.value.toUpperCase())}
                  placeholder="Enter symbol (e.g., AAPL)"
                  className="mt-3 w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDirection('long')}
                  className={`p-4 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold ${
                    direction === 'long'
                      ? 'bg-[var(--success)] text-white'
                      : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--success)]/50'
                  }`}
                >
                  <span className="material-symbols-outlined">trending_up</span>
                  Long (Buy)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('short')}
                  className={`p-4 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold ${
                    direction === 'short'
                      ? 'bg-[var(--danger)] text-white'
                      : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--danger)]/50'
                  }`}
                >
                  <span className="material-symbols-outlined">trending_down</span>
                  Short (Sell)
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Trade Date
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full gold-gradient text-black font-bold py-4 rounded-xl mt-6 hover:opacity-90 transition-all text-sm tracking-wide uppercase"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Prices, Risk & Outcome */}
      {step === 2 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-6">Trade Details</h3>

          <div className="space-y-6">
            {/* Entry & Exit Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  placeholder="e.g., 2650.50"
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                  Exit Price <span className="text-[var(--muted)]/50">(optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="Leave blank if open"
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
                />
              </div>
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                  Stop Loss
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder="Your stop loss price"
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                  Take Profit <span className="text-[var(--muted)]/50">(optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder="Your target price"
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
                />
              </div>
            </div>

            {/* Position Size */}
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Position Size (Lots)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={positionSize}
                onChange={(e) => setPositionSize(e.target.value)}
                placeholder="e.g., 0.10"
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm mono-num transition-colors"
              />
            </div>

            {/* Live Calculations Preview */}
            {(calculations.rMultiple !== null || calculations.pnl !== null) && (
              <div className="p-4 rounded-xl bg-black/40 border border-[var(--card-border)]">
                <p className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3">
                  Calculated Metrics
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {calculations.rMultiple !== null && (
                    <div>
                      <p className="text-xs text-[var(--muted)]">R-Multiple</p>
                      <p className={`text-xl font-bold mono-num ${
                        calculations.rMultiple >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }`}>
                        {calculations.rMultiple >= 0 ? '+' : ''}{calculations.rMultiple}R
                      </p>
                    </div>
                  )}
                  {calculations.pnl !== null && (
                    <div>
                      <p className="text-xs text-[var(--muted)]">Est. P&L</p>
                      <p className={`text-xl font-bold mono-num ${
                        calculations.pnl >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                      }`}>
                        {calculations.pnl >= 0 ? '+' : ''}${calculations.pnl}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Outcome */}
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Outcome
              </label>
              <div className="grid grid-cols-3 gap-2">
                {outcomes.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setOutcome(o.value)}
                    className={`p-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      outcome === o.value
                        ? o.value === 'win'
                          ? 'bg-[var(--success)] text-white'
                          : o.value === 'loss'
                          ? 'bg-[var(--danger)] text-white'
                          : 'bg-[var(--gold)] text-black'
                        : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--gold)]/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{o.icon}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-4 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 gold-gradient text-black font-bold py-4 rounded-xl hover:opacity-90 transition-all text-sm tracking-wide uppercase"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Emotions & Notes */}
      {step === 3 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h3 className="font-bold text-lg mb-6">How did you feel?</h3>

          <div className="space-y-6">
            {/* Emotion Before */}
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Before the trade
              </label>
              <div className="grid grid-cols-4 gap-2">
                {emotions.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEmotionBefore(e.value)}
                    className={`p-2 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${
                      emotionBefore === e.value
                        ? 'bg-[var(--gold)] text-black'
                        : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--gold)]/50'
                    }`}
                  >
                    <span className="text-lg">{e.icon}</span>
                    <span className="font-medium">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emotion During */}
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                During the trade <span className="text-[var(--muted)]/50">(optional)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {emotions.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEmotionDuring(emotionDuring === e.value ? '' : e.value)}
                    className={`p-2 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${
                      emotionDuring === e.value
                        ? 'bg-[var(--gold)] text-black'
                        : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--gold)]/50'
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
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                After the trade <span className="text-[var(--muted)]/50">(optional)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {emotions.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setEmotionAfter(emotionAfter === e.value ? '' : e.value)}
                    className={`p-2 rounded-xl text-xs transition-all flex flex-col items-center gap-1 ${
                      emotionAfter === e.value
                        ? 'bg-[var(--gold)] text-black'
                        : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--gold)]/50'
                    }`}
                  >
                    <span className="text-lg">{e.icon}</span>
                    <span className="font-medium">{e.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rules Checklist */}
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Rules Followed
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tradingRules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => {
                      setRulesFollowed(prev =>
                        prev.includes(rule.id)
                          ? prev.filter(r => r !== rule.id)
                          : [...prev, rule.id]
                      )
                    }}
                    className={`p-3 rounded-xl text-left text-sm transition-all flex items-center gap-3 ${
                      rulesFollowed.includes(rule.id)
                        ? 'bg-[var(--success)]/10 border border-[var(--success)]/30 text-[var(--success)]'
                        : 'bg-black/40 border border-[var(--card-border)] hover:border-[var(--gold)]/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {rulesFollowed.includes(rule.id) ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span className={rulesFollowed.includes(rule.id) ? 'font-medium' : ''}>{rule.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] mt-2">
                {rulesFollowed.length}/{tradingRules.length} rules followed
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-3 block">
                Trade Notes <span className="text-[var(--muted)]/50">(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What was your thesis? What did you learn? What would you do differently?"
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors min-h-[100px] resize-none"
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

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[var(--danger)] text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-4 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 gold-gradient text-black font-bold py-4 rounded-xl hover:opacity-90 transition-all text-sm tracking-wide uppercase flex items-center justify-center gap-2 disabled:opacity-50"
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
      )}

      {/* Quick save option */}
      {step < 3 && (
        <p className="text-center text-sm text-[var(--muted)]">
          Want to save quickly?{' '}
          <button
            type="button"
            onClick={() => setStep(3)}
            className="text-[var(--gold)] hover:underline"
          >
            Skip to save
          </button>
        </p>
      )}
    </div>
  )
}
