import type { TradeDirection, TradeOutcome } from '@/types/database'

export interface ParsedTrade {
  instrument: string
  direction: TradeDirection
  entryPrice: number
  exitPrice: number
  stopLoss: number | null
  takeProfit: number | null
  positionSize: number
  outcome: TradeOutcome
  pnl: number
  tradeDate: string // ISO date string
  entryTime: string | null
  exitTime: string | null
}

export interface ImportResult {
  trades: ParsedTrade[]
  errors: string[]
  format: 'mt4' | 'mt5' | 'generic'
}

// ── CSV Utilities ──────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++ // skip next quote
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',' || char === ';' || char === '\t') {
        fields.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }

  fields.push(current.trim())
  return fields
}

function parseNumeric(value: string): number {
  // Handle commas used as thousand separators or decimal separators
  // Remove spaces
  let cleaned = value.replace(/\s/g, '')

  // If there's both comma and dot, comma is thousands separator
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '')
  } else if (cleaned.includes(',')) {
    // Could be decimal comma (European format) — check if only one comma
    const commaCount = (cleaned.match(/,/g) || []).length
    if (commaCount === 1) {
      // Decimal comma
      cleaned = cleaned.replace(',', '.')
    } else {
      // Thousands separators
      cleaned = cleaned.replace(/,/g, '')
    }
  }

  return parseFloat(cleaned)
}

function normalizeDate(raw: string): string {
  // Try common date formats and return ISO date string
  const trimmed = raw.trim()

  // ISO format: 2024-01-15 or 2024-01-15T10:30:00
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // MT4/MT5 format: 2024.01.15 10:30:00
  if (/^\d{4}\.\d{2}\.\d{2}/.test(trimmed)) {
    const d = new Date(trimmed.replace(/\./g, '-'))
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // US format: 01/15/2024 or 1/15/2024
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const d = new Date(trimmed)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // EU format: 15/01/2024 or 15.01.2024
  if (/^\d{2}[./]\d{2}[./]\d{4}/.test(trimmed)) {
    const parts = trimmed.split(/[./]/)
    const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  }

  // Fallback: try native Date parsing
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]

  return new Date().toISOString().split('T')[0]
}

function normalizeTime(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  const trimmed = raw.trim()

  // Extract time portion from datetime strings
  const timeMatch = trimmed.match(/(\d{1,2}:\d{2}(:\d{2})?)/)
  if (timeMatch) return timeMatch[1]

  return null
}

function directionFromType(typeStr: string): TradeDirection | null {
  const lower = typeStr.toLowerCase().trim()
  if (lower === 'buy' || lower === 'long' || lower === 'buy limit' || lower === 'buy stop') return 'long'
  if (lower === 'sell' || lower === 'short' || lower === 'sell limit' || lower === 'sell stop') return 'short'
  return null
}

function outcomeFromPnl(pnl: number): TradeOutcome {
  if (pnl > 0) return 'win'
  if (pnl < 0) return 'loss'
  return 'breakeven'
}

function findColumnIndex(headers: string[], ...candidates: string[]): number {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}

// ── Format Detection ───────────────────────────────────────────

function detectFormat(headers: string[]): 'mt4' | 'mt5' | 'generic' {
  const lower = headers.map(h => h.toLowerCase().trim())

  const mt4Required = ['ticket', 'open time', 'close time', 'type', 'size', 'item', 'open price', 'close price', 'profit']
  const isMt4 = mt4Required.every(h => lower.some(lh => lh.includes(h) || h.includes(lh)))
  if (isMt4) return 'mt4'

  const mt5Indicators = ['position', 'symbol', 'volume', 'price', 's/l', 't/p', 'profit', 'time']
  const mt5Matches = mt5Indicators.filter(h => lower.some(lh => lh.includes(h)))
  if (mt5Matches.length >= 5) return 'mt5'

  return 'generic'
}

// ── MT4 Parser ─────────────────────────────────────────────────

function parseMT4(headers: string[], rows: string[][]): { trades: ParsedTrade[]; errors: string[] } {
  const trades: ParsedTrade[] = []
  const errors: string[] = []

  const colOpenTime = findColumnIndex(headers, 'open time')
  const colCloseTime = findColumnIndex(headers, 'close time')
  const colType = findColumnIndex(headers, 'type')
  const colSize = findColumnIndex(headers, 'size')
  const colItem = findColumnIndex(headers, 'item')
  const colOpenPrice = findColumnIndex(headers, 'open price')
  const colClosePrice = findColumnIndex(headers, 'close price')
  const colSL = findColumnIndex(headers, 's/l', 'sl', 'stop loss')
  const colTP = findColumnIndex(headers, 't/p', 'tp', 'take profit')
  const colProfit = findColumnIndex(headers, 'profit')

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because header is row 1, data starts at 2

    try {
      // Skip summary/balance rows
      const typeStr = row[colType] || ''
      if (!typeStr || typeStr.toLowerCase() === 'balance' || typeStr.toLowerCase() === 'credit') continue

      const direction = directionFromType(typeStr)
      if (!direction) {
        // Skip non-trade rows like deposit/withdrawal
        continue
      }

      const instrument = (row[colItem] || '').trim()
      if (!instrument) {
        errors.push(`Row ${rowNum}: Missing instrument/item`)
        continue
      }

      const entryPrice = parseNumeric(row[colOpenPrice] || '')
      const exitPrice = parseNumeric(row[colClosePrice] || '')
      const positionSize = parseNumeric(row[colSize] || '')
      const pnl = parseNumeric(row[colProfit] || '')

      if (isNaN(entryPrice) || isNaN(exitPrice)) {
        errors.push(`Row ${rowNum}: Invalid entry/exit price`)
        continue
      }

      if (isNaN(positionSize) || positionSize <= 0) {
        errors.push(`Row ${rowNum}: Invalid position size`)
        continue
      }

      if (isNaN(pnl)) {
        errors.push(`Row ${rowNum}: Invalid profit value`)
        continue
      }

      const stopLoss = colSL !== -1 ? parseNumeric(row[colSL] || '') : NaN
      const takeProfit = colTP !== -1 ? parseNumeric(row[colTP] || '') : NaN

      const openTimeRaw = row[colOpenTime] || ''
      const closeTimeRaw = row[colCloseTime] || ''

      trades.push({
        instrument,
        direction,
        entryPrice,
        exitPrice,
        stopLoss: !isNaN(stopLoss) && stopLoss > 0 ? stopLoss : null,
        takeProfit: !isNaN(takeProfit) && takeProfit > 0 ? takeProfit : null,
        positionSize,
        outcome: outcomeFromPnl(pnl),
        pnl,
        tradeDate: normalizeDate(openTimeRaw || closeTimeRaw),
        entryTime: normalizeTime(openTimeRaw),
        exitTime: normalizeTime(closeTimeRaw),
      })
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : 'Unknown parsing error'}`)
    }
  }

  return { trades, errors }
}

// ── MT5 Parser ─────────────────────────────────────────────────

function parseMT5(headers: string[], rows: string[][]): { trades: ParsedTrade[]; errors: string[] } {
  const trades: ParsedTrade[] = []
  const errors: string[] = []

  const colSymbol = findColumnIndex(headers, 'symbol')
  const colType = findColumnIndex(headers, 'type')
  const colVolume = findColumnIndex(headers, 'volume')
  const colPrice = findColumnIndex(headers, 'price')
  const colSL = findColumnIndex(headers, 's/l', 'sl', 'stop loss')
  const colTP = findColumnIndex(headers, 't/p', 'tp', 'take profit')
  const colProfit = findColumnIndex(headers, 'profit')
  const colTime = findColumnIndex(headers, 'time')
  // MT5 may have separate open/close price columns
  const colOpenPrice = findColumnIndex(headers, 'open price', 'price open')
  const colClosePrice = findColumnIndex(headers, 'close price', 'price close')

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    try {
      const typeStr = row[colType] || ''
      if (!typeStr || typeStr.toLowerCase() === 'balance' || typeStr.toLowerCase() === 'credit') continue

      const direction = directionFromType(typeStr)
      if (!direction) continue

      const instrument = (row[colSymbol] || '').trim()
      if (!instrument) {
        errors.push(`Row ${rowNum}: Missing symbol`)
        continue
      }

      // Determine entry/exit prices
      let entryPrice: number
      let exitPrice: number

      if (colOpenPrice !== -1 && colClosePrice !== -1) {
        entryPrice = parseNumeric(row[colOpenPrice] || '')
        exitPrice = parseNumeric(row[colClosePrice] || '')
      } else {
        // Single price column — common in MT5 deal history
        // Use price column for both (limited data)
        const price = parseNumeric(row[colPrice] || '')
        entryPrice = price
        exitPrice = price
      }

      const positionSize = parseNumeric(row[colVolume] || '')
      const pnl = parseNumeric(row[colProfit] || '')

      if (isNaN(entryPrice) || isNaN(exitPrice)) {
        errors.push(`Row ${rowNum}: Invalid price`)
        continue
      }

      if (isNaN(positionSize) || positionSize <= 0) {
        errors.push(`Row ${rowNum}: Invalid volume`)
        continue
      }

      if (isNaN(pnl)) {
        errors.push(`Row ${rowNum}: Invalid profit value`)
        continue
      }

      const stopLoss = colSL !== -1 ? parseNumeric(row[colSL] || '') : NaN
      const takeProfit = colTP !== -1 ? parseNumeric(row[colTP] || '') : NaN

      const timeRaw = row[colTime] || ''

      trades.push({
        instrument,
        direction,
        entryPrice,
        exitPrice,
        stopLoss: !isNaN(stopLoss) && stopLoss > 0 ? stopLoss : null,
        takeProfit: !isNaN(takeProfit) && takeProfit > 0 ? takeProfit : null,
        positionSize,
        outcome: outcomeFromPnl(pnl),
        pnl,
        tradeDate: normalizeDate(timeRaw),
        entryTime: normalizeTime(timeRaw),
        exitTime: null,
      })
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : 'Unknown parsing error'}`)
    }
  }

  return { trades, errors }
}

// ── Generic Parser ─────────────────────────────────────────────

function parseGeneric(headers: string[], rows: string[][]): { trades: ParsedTrade[]; errors: string[] } {
  const trades: ParsedTrade[] = []
  const errors: string[] = []

  const colInstrument = findColumnIndex(headers, 'instrument', 'symbol', 'pair', 'ticker', 'asset')
  const colDirection = findColumnIndex(headers, 'direction', 'type', 'side', 'action')
  const colEntry = findColumnIndex(headers, 'entry', 'entry price', 'open', 'open price', 'entry_price', 'open_price')
  const colExit = findColumnIndex(headers, 'exit', 'exit price', 'close', 'close price', 'exit_price', 'close_price')
  const colSize = findColumnIndex(headers, 'size', 'volume', 'lots', 'quantity', 'qty', 'position_size', 'position size')
  const colPnl = findColumnIndex(headers, 'pnl', 'profit', 'p&l', 'pl', 'profit/loss', 'result')
  const colSL = findColumnIndex(headers, 'sl', 's/l', 'stop loss', 'stop_loss', 'stoploss')
  const colTP = findColumnIndex(headers, 'tp', 't/p', 'take profit', 'take_profit', 'takeprofit')
  const colDate = findColumnIndex(headers, 'date', 'trade date', 'trade_date', 'time', 'datetime', 'open time', 'open_time')
  const colEntryTime = findColumnIndex(headers, 'entry time', 'entry_time', 'open time', 'open_time')
  const colExitTime = findColumnIndex(headers, 'exit time', 'exit_time', 'close time', 'close_time')

  if (colInstrument === -1) {
    errors.push('Missing required column: instrument/symbol')
    return { trades, errors }
  }

  if (colEntry === -1) {
    errors.push('Missing required column: entry/open price')
    return { trades, errors }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    try {
      const instrument = (row[colInstrument] || '').trim()
      if (!instrument) {
        errors.push(`Row ${rowNum}: Missing instrument`)
        continue
      }

      // Direction
      let direction: TradeDirection = 'long'
      if (colDirection !== -1) {
        const parsed = directionFromType(row[colDirection] || '')
        if (parsed) direction = parsed
      }

      const entryPrice = parseNumeric(row[colEntry] || '')
      if (isNaN(entryPrice)) {
        errors.push(`Row ${rowNum}: Invalid entry price`)
        continue
      }

      const exitPrice = colExit !== -1 ? parseNumeric(row[colExit] || '') : entryPrice
      if (isNaN(exitPrice)) {
        errors.push(`Row ${rowNum}: Invalid exit price`)
        continue
      }

      const positionSize = colSize !== -1 ? parseNumeric(row[colSize] || '') : 0.01
      if (isNaN(positionSize) || positionSize <= 0) {
        errors.push(`Row ${rowNum}: Invalid position size`)
        continue
      }

      // PnL: use column if available, otherwise compute from price difference
      let pnl: number
      if (colPnl !== -1 && row[colPnl]) {
        pnl = parseNumeric(row[colPnl])
        if (isNaN(pnl)) pnl = 0
      } else {
        const diff = exitPrice - entryPrice
        pnl = direction === 'long' ? diff * positionSize : -diff * positionSize
      }

      const stopLoss = colSL !== -1 ? parseNumeric(row[colSL] || '') : NaN
      const takeProfit = colTP !== -1 ? parseNumeric(row[colTP] || '') : NaN

      const dateRaw = colDate !== -1 ? (row[colDate] || '') : ''
      const entryTimeRaw = colEntryTime !== -1 ? (row[colEntryTime] || '') : ''
      const exitTimeRaw = colExitTime !== -1 ? (row[colExitTime] || '') : ''

      trades.push({
        instrument,
        direction,
        entryPrice,
        exitPrice,
        stopLoss: !isNaN(stopLoss) && stopLoss > 0 ? stopLoss : null,
        takeProfit: !isNaN(takeProfit) && takeProfit > 0 ? takeProfit : null,
        positionSize,
        outcome: outcomeFromPnl(pnl),
        pnl,
        tradeDate: dateRaw ? normalizeDate(dateRaw) : new Date().toISOString().split('T')[0],
        entryTime: normalizeTime(entryTimeRaw || dateRaw),
        exitTime: normalizeTime(exitTimeRaw),
      })
    } catch (err) {
      errors.push(`Row ${rowNum}: ${err instanceof Error ? err.message : 'Unknown parsing error'}`)
    }
  }

  return { trades, errors }
}

// ── Main Export ─────────────────────────────────────────────────

export function parseTradeCSV(csvContent: string): ImportResult {
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim().length > 0)

  if (lines.length < 2) {
    return { trades: [], errors: ['File is empty or has no data rows'], format: 'generic' }
  }

  const headers = parseCSVLine(lines[0])
  const dataRows = lines.slice(1).map(line => parseCSVLine(line))

  const format = detectFormat(headers)

  let result: { trades: ParsedTrade[]; errors: string[] }

  switch (format) {
    case 'mt4':
      result = parseMT4(headers, dataRows)
      break
    case 'mt5':
      result = parseMT5(headers, dataRows)
      break
    default:
      result = parseGeneric(headers, dataRows)
      break
  }

  return {
    trades: result.trades,
    errors: result.errors,
    format,
  }
}
