// Serialize/deserialize chart annotation state as JSON
// Types for chart data stored in journal entries

export interface ChartAnnotation {
  type: 'horizontal_line' | 'trend_line' | 'rectangle' | 'text'
  points: { price: number; time: number }[]
  color: string
  label?: string
}

export interface ChartState {
  symbol: string
  timeframe: string
  annotations: ChartAnnotation[]
  visibleRange?: { from: number; to: number }
}

export function serializeChartState(state: ChartState): string {
  return JSON.stringify(state)
}

export function deserializeChartState(json: string | null): ChartState | null {
  if (!json) return null
  try {
    return JSON.parse(json) as ChartState
  } catch {
    return null
  }
}
