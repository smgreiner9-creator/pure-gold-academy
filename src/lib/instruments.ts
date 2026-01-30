export interface InstrumentMeta {
  symbol: string
  label: string
  pipSize: number
  contractSize: number
  pipValuePerLot: number
  category: 'forex' | 'metals' | 'crypto' | 'indices'
}

export const INSTRUMENTS: Record<string, InstrumentMeta> = {
  EURUSD: { symbol: 'EURUSD', label: 'EUR/USD', pipSize: 0.0001, contractSize: 100000, pipValuePerLot: 10, category: 'forex' },
  GBPUSD: { symbol: 'GBPUSD', label: 'GBP/USD', pipSize: 0.0001, contractSize: 100000, pipValuePerLot: 10, category: 'forex' },
  USDJPY: { symbol: 'USDJPY', label: 'USD/JPY', pipSize: 0.01, contractSize: 100000, pipValuePerLot: 6.5, category: 'forex' },
  USDCHF: { symbol: 'USDCHF', label: 'USD/CHF', pipSize: 0.0001, contractSize: 100000, pipValuePerLot: 10, category: 'forex' },
  AUDUSD: { symbol: 'AUDUSD', label: 'AUD/USD', pipSize: 0.0001, contractSize: 100000, pipValuePerLot: 10, category: 'forex' },
  USDCAD: { symbol: 'USDCAD', label: 'USD/CAD', pipSize: 0.0001, contractSize: 100000, pipValuePerLot: 7.5, category: 'forex' },
  NZDUSD: { symbol: 'NZDUSD', label: 'NZD/USD', pipSize: 0.0001, contractSize: 100000, pipValuePerLot: 10, category: 'forex' },
  XAUUSD: { symbol: 'XAUUSD', label: 'Gold (XAUUSD)', pipSize: 0.01, contractSize: 100, pipValuePerLot: 1, category: 'metals' },
  XAGUSD: { symbol: 'XAGUSD', label: 'Silver (XAGUSD)', pipSize: 0.001, contractSize: 5000, pipValuePerLot: 5, category: 'metals' },
  BTCUSD: { symbol: 'BTCUSD', label: 'Bitcoin (BTC/USD)', pipSize: 1, contractSize: 1, pipValuePerLot: 1, category: 'crypto' },
  ETHUSD: { symbol: 'ETHUSD', label: 'Ethereum (ETH/USD)', pipSize: 0.01, contractSize: 1, pipValuePerLot: 0.01, category: 'crypto' },
  US30: { symbol: 'US30', label: 'US30 (Dow Jones)', pipSize: 1, contractSize: 1, pipValuePerLot: 1, category: 'indices' },
  US100: { symbol: 'US100', label: 'US100 (Nasdaq)', pipSize: 1, contractSize: 1, pipValuePerLot: 1, category: 'indices' },
  SPX500: { symbol: 'SPX500', label: 'SPX500 (S&P 500)', pipSize: 0.1, contractSize: 1, pipValuePerLot: 0.1, category: 'indices' },
}

export const DEFAULT_INSTRUMENT_META: InstrumentMeta = {
  symbol: 'OTHER',
  label: 'Other',
  pipSize: 0.01,
  contractSize: 1,
  pipValuePerLot: 0.01,
  category: 'forex',
}

export function getInstrumentMeta(symbol: string): InstrumentMeta {
  const upper = symbol.toUpperCase()
  return INSTRUMENTS[upper] || DEFAULT_INSTRUMENT_META
}

// For form dropdowns — replaces hardcoded arrays
export const INSTRUMENT_OPTIONS = [
  ...Object.values(INSTRUMENTS).map(i => ({ value: i.symbol, label: i.label })),
  { value: 'OTHER', label: 'Other' },
]
