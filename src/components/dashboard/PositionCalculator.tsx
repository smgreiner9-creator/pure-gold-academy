'use client'

import { useState, useMemo } from 'react'

interface CurrencyPair {
  symbol: string
  label: string
  pipValue: number // Value per pip for 1 standard lot
  pipSize: number  // Price movement per pip
}

const currencyPairs: CurrencyPair[] = [
  { symbol: 'XAUUSD', label: 'Gold (XAU/USD)', pipValue: 10, pipSize: 0.1 },
  { symbol: 'EURUSD', label: 'EUR/USD', pipValue: 10, pipSize: 0.0001 },
  { symbol: 'GBPUSD', label: 'GBP/USD', pipValue: 10, pipSize: 0.0001 },
  { symbol: 'USDJPY', label: 'USD/JPY', pipValue: 9.09, pipSize: 0.01 },
  { symbol: 'AUDUSD', label: 'AUD/USD', pipValue: 10, pipSize: 0.0001 },
  { symbol: 'USDCAD', label: 'USD/CAD', pipValue: 7.35, pipSize: 0.0001 },
  { symbol: 'USDCHF', label: 'USD/CHF', pipValue: 11.36, pipSize: 0.0001 },
  { symbol: 'NZDUSD', label: 'NZD/USD', pipValue: 10, pipSize: 0.0001 },
  { symbol: 'BTCUSD', label: 'Bitcoin (BTC/USD)', pipValue: 1, pipSize: 1 },
  { symbol: 'US30', label: 'Dow Jones (US30)', pipValue: 1, pipSize: 1 },
  { symbol: 'NAS100', label: 'Nasdaq (NAS100)', pipValue: 1, pipSize: 1 },
]

export function PositionCalculator() {
  const [accountBalance, setAccountBalance] = useState<string>('10000')
  const [riskPercent, setRiskPercent] = useState<number>(1)
  const [stopLossPips, setStopLossPips] = useState<string>('50')
  const [selectedPair, setSelectedPair] = useState<string>('XAUUSD')

  const pair = useMemo(() =>
    currencyPairs.find(p => p.symbol === selectedPair) || currencyPairs[0],
    [selectedPair]
  )

  const calculation = useMemo(() => {
    const balance = parseFloat(accountBalance.replace(/,/g, '')) || 0
    const slPips = parseFloat(stopLossPips) || 0

    if (!balance || !riskPercent || !slPips) {
      return { riskAmount: 0, lotSize: 0 }
    }

    const riskAmount = balance * (riskPercent / 100)
    const lotSize = riskAmount / (slPips * pair.pipValue)

    return {
      riskAmount,
      lotSize: Math.max(0.01, lotSize), // Minimum 0.01 lots
    }
  }, [accountBalance, riskPercent, stopLossPips, pair])

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '')
    setAccountBalance(value)
  }

  const formatBalance = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return value
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="glass-surface rounded-2xl overflow-hidden">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">calculate</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">Risk Calculator</h2>
            <p className="text-xs text-[var(--muted)]">Calculate your position size</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Account Balance */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex justify-between">
              Account Balance
              <span className="text-[var(--gold)]">USD</span>
            </label>
            <input
              type="text"
              value={accountBalance}
              onChange={handleBalanceChange}
              onBlur={(e) => setAccountBalance(formatBalance(e.target.value))}
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] mono-num text-lg transition-colors"
              placeholder="10,000.00"
            />
          </div>

          {/* Currency Pair */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">
              Currency Pair
            </label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm font-semibold appearance-none cursor-pointer transition-colors"
            >
              {currencyPairs.map((p) => (
                <option key={p.symbol} value={p.symbol}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Percentage */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex justify-between">
              Risk Percentage
              <span className="text-[var(--gold)] mono-num">{riskPercent.toFixed(1)}%</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.25"
                max="5"
                step="0.25"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                className="flex-1 accent-[var(--gold)] h-2 bg-[var(--glass-surface-border)] rounded-full appearance-none cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[9px] text-[var(--muted)] px-1">
              <span>0.25%</span>
              <span>1%</span>
              <span>2%</span>
              <span>3%</span>
              <span>5%</span>
            </div>
          </div>

          {/* Stop Loss in Pips */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest flex justify-between">
              Stop Loss
              <span className="text-[var(--muted)]">PIPS</span>
            </label>
            <input
              type="number"
              value={stopLossPips}
              onChange={(e) => setStopLossPips(e.target.value)}
              className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] mono-num text-lg transition-colors"
              placeholder="50"
              min="1"
            />
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl glass-surface">
            <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Risk Amount</p>
            <p className="mono-num text-xl font-bold text-[var(--danger)]">
              ${calculation.riskAmount.toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20">
            <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest mb-1">Position Size</p>
            <p className="mono-num text-xl font-bold text-[var(--gold)]">
              {calculation.lotSize.toFixed(2)} <span className="text-xs font-normal">lots</span>
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-black/5 text-xs text-[var(--muted)]">
          <span className="material-symbols-outlined text-sm mt-0.5">info</span>
          <p>
            With a {riskPercent}% risk on ${parseFloat(accountBalance.replace(/,/g, '') || '0').toLocaleString()},
            risking ${calculation.riskAmount.toFixed(2)} with a {stopLossPips} pip stop loss on {pair.label}.
          </p>
        </div>
      </div>
    </div>
  )
}
