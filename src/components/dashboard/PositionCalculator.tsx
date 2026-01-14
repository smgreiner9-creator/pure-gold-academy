'use client'

import { useState } from 'react'

export function PositionCalculator() {
  const [accountBalance, setAccountBalance] = useState<string>('10,000.00')
  const [riskPercent, setRiskPercent] = useState<number>(2)
  const [entryPrice, setEntryPrice] = useState<string>('2650.00')
  const [stopLoss, setStopLoss] = useState<string>('2645.00')
  const [instrument, setInstrument] = useState<string>('XAUUSD')

  // Contract specifications (pip value calculations)
  const contractSpecs: Record<string, { pipValue: number; pipSize: number; label: string }> = {
    XAUUSD: { pipValue: 1, pipSize: 0.01, label: 'Gold Spot' },
    EURUSD: { pipValue: 10, pipSize: 0.0001, label: 'Euro / Dollar' },
    BTCUSD: { pipValue: 1, pipSize: 1, label: 'Bitcoin / Dollar' },
  }

  const calculatePosition = () => {
    const balance = parseFloat(accountBalance.replace(/,/g, '')) || 0
    const risk = riskPercent || 0
    const entry = parseFloat(entryPrice) || 0
    const sl = parseFloat(stopLoss) || 0

    if (!balance || !risk || !entry || !sl) {
      return { lotSize: '0.00' }
    }

    const spec = contractSpecs[instrument] || contractSpecs.XAUUSD
    const riskAmount = balance * (risk / 100)
    const slDistance = Math.abs(entry - sl)
    const pips = slDistance / spec.pipSize

    if (pips <= 0) return { lotSize: '0.00' }

    const lotSize = riskAmount / (pips * spec.pipValue)

    return {
      lotSize: lotSize.toFixed(2),
    }
  }

  const result = calculatePosition()

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '')
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const formatted = value ? parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
      setAccountBalance(formatted || value)
    }
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">calculate</span>
          </div>
          <h2 className="text-lg font-bold">Position Size Calculator</h2>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Account Balance */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex justify-between">
                Account Balance
                <span className="text-[var(--gold)]">USD</span>
              </label>
              <input
                type="text"
                value={accountBalance}
                onChange={handleBalanceChange}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-5 py-4 focus:outline-none focus:border-[var(--gold)] mono-num text-lg transition-colors"
              />
            </div>

            {/* Instrument */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex justify-between">
                Instrument
                <span className="material-symbols-outlined text-xs cursor-help">info</span>
              </label>
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-5 py-4 focus:outline-none focus:border-[var(--gold)] text-sm font-semibold appearance-none cursor-pointer transition-colors"
              >
                <option value="XAUUSD">XAUUSD (Gold Spot)</option>
                <option value="EURUSD">EURUSD (Euro / Dollar)</option>
                <option value="BTCUSD">BTCUSD (Bitcoin / Dollar)</option>
              </select>
            </div>

            {/* Risk Percentage */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex justify-between">
                Risk Percentage
                <span className="text-[var(--success)]">{riskPercent.toFixed(2)}%</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                  className="flex-1 accent-[var(--gold)] h-2 bg-[var(--card-border)] rounded-full appearance-none cursor-pointer"
                />
                <span className="mono-num w-12 text-right text-sm">{riskPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Entry Price */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                Entry Price
              </label>
              <input
                type="text"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-5 py-4 focus:outline-none focus:border-[var(--gold)] mono-num text-lg transition-colors"
                placeholder="0.00"
              />
            </div>

            {/* Stop Loss */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
                Stop Loss
              </label>
              <input
                type="text"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-5 py-4 focus:outline-none focus:border-[var(--gold)] mono-num text-lg transition-colors"
                placeholder="0.00"
              />
            </div>

            {/* Result */}
            <div className="pt-4">
              <div className="p-8 rounded-2xl bg-white/5 border border-white/5 space-y-6">
                <p className="text-[10px] font-bold text-[var(--muted)] uppercase">Calculated Position</p>
                <div className="flex justify-between items-end gap-6">
                  <span className="mono-num text-3xl font-bold text-[var(--gold)]">{result.lotSize}</span>
                  <span className="text-xs font-bold text-[var(--muted)] mb-1 uppercase tracking-widest">Standard Lots</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Execute Button */}
        <button className="w-full gold-gradient text-black font-extrabold py-5 rounded-xl mt-4 hover:shadow-xl hover:shadow-[var(--gold)]/10 transition-all text-sm tracking-[0.15em] uppercase">
          Execute Calculation
        </button>
      </div>
    </div>
  )
}
