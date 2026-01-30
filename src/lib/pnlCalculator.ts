import { getInstrumentMeta } from './instruments'

interface PnlInput {
  instrument: string
  direction: 'long' | 'short'
  entryPrice: number
  exitPrice: number
  positionSize: number
  stopLoss?: number | null
}

interface PnlResult {
  pnl: number
  pips: number
  rMultiple: number | null
}

export function calculatePnl({ instrument, direction, entryPrice, exitPrice, positionSize, stopLoss }: PnlInput): PnlResult {
  const meta = getInstrumentMeta(instrument)

  const priceDiff = direction === 'long'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice

  const pips = parseFloat((priceDiff / meta.pipSize).toFixed(2))
  const pnl = parseFloat((pips * meta.pipValuePerLot * positionSize).toFixed(2))

  let rMultiple: number | null = null
  if (stopLoss != null && Math.abs(entryPrice - stopLoss) > 0) {
    const risk = Math.abs(entryPrice - stopLoss)
    rMultiple = parseFloat((priceDiff / risk).toFixed(2))
  }

  return { pnl, pips, rMultiple }
}
