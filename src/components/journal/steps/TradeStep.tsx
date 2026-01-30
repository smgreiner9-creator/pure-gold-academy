'use client'

import { INSTRUMENT_OPTIONS } from '@/lib/instruments'

export interface FormState {
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
  setupType: string
  setupTypeCustom: string
  executionRating: number | null
  reflectionNotes: string
}

const instruments = INSTRUMENT_OPTIONS

const outcomes = [
  { value: 'win', label: 'Win', icon: 'check_circle' },
  { value: 'loss', label: 'Loss', icon: 'cancel' },
  { value: 'breakeven', label: 'Breakeven', icon: 'remove_circle' },
]

interface TradeStepProps {
  form: FormState
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  calculations: { rMultiple: number | null; pnl: number | null }
}

export function TradeStep({ form, updateField, calculations }: TradeStepProps) {
  return (
    <div className="space-y-4">
      {/* SECTION 1: Trade Setup */}
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

      {/* SECTION 2: Prices & Risk */}
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
    </div>
  )
}
