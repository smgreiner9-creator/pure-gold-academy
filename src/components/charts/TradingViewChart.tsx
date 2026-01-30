'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { ChartAnnotationToolbar, type AnnotationTool } from './ChartAnnotationToolbar'
import type { ChartState, ChartAnnotation } from '@/lib/chartUtils'

interface TradingViewChartProps {
  symbol: string
  chartData?: ChartState | null
  onChartStateChange?: (state: ChartState) => void
  readOnly?: boolean
  height?: number
}

// Generate deterministic sample candlestick data based on symbol
function generateSampleData(symbol: string, numBars: number = 100) {
  // Simple hash from symbol string for deterministic randomness
  let seed = 0
  for (let i = 0; i < symbol.length; i++) {
    seed = ((seed << 5) - seed + symbol.charCodeAt(i)) | 0
  }

  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647
    return (seed & 0x7fffffff) / 0x7fffffff
  }

  // Set base price by instrument
  let basePrice = 100
  if (symbol.includes('XAU') || symbol.includes('GOLD')) basePrice = 2650
  else if (symbol.includes('BTC')) basePrice = 65000
  else if (symbol.includes('EUR')) basePrice = 1.085
  else if (symbol.includes('GBP')) basePrice = 1.27
  else if (symbol.includes('JPY')) basePrice = 155

  const data: { time: string; open: number; high: number; low: number; close: number }[] = []
  let price = basePrice

  // Start from about 100 trading days ago
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - numBars - 20)

  let dayCount = 0
  const currentDate = new Date(startDate)

  while (dayCount < numBars) {
    // Skip weekends
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }

    const volatility = basePrice * 0.005
    const change = (seededRandom() - 0.48) * volatility
    const open = price
    const close = price + change
    const high = Math.max(open, close) + seededRandom() * volatility * 0.5
    const low = Math.min(open, close) - seededRandom() * volatility * 0.5

    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const day = String(currentDate.getDate()).padStart(2, '0')

    data.push({
      time: `${year}-${month}-${day}`,
      open: parseFloat(open.toFixed(basePrice < 10 ? 5 : 2)),
      high: parseFloat(high.toFixed(basePrice < 10 ? 5 : 2)),
      low: parseFloat(low.toFixed(basePrice < 10 ? 5 : 2)),
      close: parseFloat(close.toFixed(basePrice < 10 ? 5 : 2)),
    })

    price = close
    dayCount++
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return data
}

function getAnnotationColor(tool: AnnotationTool): string {
  switch (tool) {
    case 'entry':
      return '#22c55e' // green
    case 'exit':
      return '#f97316' // orange
    case 'stop_loss':
      return '#ef4444' // red
    case 'take_profit':
      return '#3b82f6' // blue
    case 'horizontal_line':
      return '#d4af37' // gold
    case 'trend_line':
      return '#a78bfa' // purple
    case 'text':
      return '#d4af37' // gold
    default:
      return '#d4af37'
  }
}

function getAnnotationLabel(tool: AnnotationTool): string {
  switch (tool) {
    case 'entry':
      return 'Entry'
    case 'exit':
      return 'Exit'
    case 'stop_loss':
      return 'Stop Loss'
    case 'take_profit':
      return 'Take Profit'
    case 'horizontal_line':
      return ''
    case 'trend_line':
      return ''
    case 'text':
      return 'Note'
    default:
      return ''
  }
}

const candlestickOptions = {
  upColor: '#22c55e',
  downColor: '#ef4444',
  borderDownColor: '#ef4444',
  borderUpColor: '#22c55e',
  wickDownColor: '#ef4444',
  wickUpColor: '#22c55e',
}

// Inner chart component that uses lightweight-charts directly
function ChartInner({
  symbol,
  chartData,
  onChartStateChange,
  readOnly = false,
  height = 400,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLinesRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lcModuleRef = useRef<any>(null)
  const [activeTool, setActiveTool] = useState<AnnotationTool>(null)
  const [annotations, setAnnotations] = useState<ChartAnnotation[]>(
    chartData?.annotations || []
  )
  const [timeframe] = useState(chartData?.timeframe || '1D')
  const [isChartReady, setIsChartReady] = useState(false)

  // Build current chart state
  const buildChartState = useCallback(
    (currentAnnotations: ChartAnnotation[]): ChartState => ({
      symbol,
      timeframe,
      annotations: currentAnnotations,
    }),
    [symbol, timeframe]
  )

  // Helper to create a candlestick series using the stored module ref
  const createCandlestickSeries = useCallback((chart: unknown) => {
    const lc = lcModuleRef.current
    if (!lc || !chart) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const series = (chart as any).addSeries(lc.CandlestickSeries, candlestickOptions)
    const data = generateSampleData(symbol)
    series.setData(data)
    return series
  }, [symbol])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    let disposed = false

    const initChart = async () => {
      const lc = await import('lightweight-charts')
      lcModuleRef.current = lc

      if (disposed || !chartContainerRef.current) return

      const chart = lc.createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height,
        layout: {
          background: { type: lc.ColorType.Solid, color: '#0a0a0a' },
          textColor: '#666',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: { color: 'rgba(212, 175, 55, 0.3)', labelBackgroundColor: '#d4af37' },
          horzLine: { color: 'rgba(212, 175, 55, 0.3)', labelBackgroundColor: '#d4af37' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.1)',
          timeVisible: false,
        },
      })

      const series = chart.addSeries(lc.CandlestickSeries, candlestickOptions)
      const data = generateSampleData(symbol)
      series.setData(data)

      chart.timeScale().fitContent()

      chartRef.current = chart
      seriesRef.current = series
      setIsChartReady(true)

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          })
        }
      }

      const resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(chartContainerRef.current)

      // Handle click for annotations (only in edit mode)
      if (!readOnly) {
        chart.subscribeClick((param: { point?: { x: number; y: number }; time?: unknown }) => {
          if (!param.point || !param.time) return

          // Read active tool from DOM data attribute at click time
          const toolEl = chartContainerRef.current?.closest('[data-active-tool]')
          const currentTool = (toolEl?.getAttribute('data-active-tool') || null) as AnnotationTool

          if (!currentTool) return

          const price = series.coordinateToPrice(param.point.y)
          if (price === null) return

          const timeValue = typeof param.time === 'object'
            ? new Date((param.time as { year: number; month: number; day: number }).year, (param.time as { year: number; month: number; day: number }).month - 1, (param.time as { year: number; month: number; day: number }).day).getTime() / 1000
            : typeof param.time === 'string'
            ? new Date(param.time).getTime() / 1000
            : param.time

          const annotationType =
            currentTool === 'entry' ||
            currentTool === 'exit' ||
            currentTool === 'stop_loss' ||
            currentTool === 'take_profit'
              ? 'horizontal_line'
              : currentTool === 'text'
              ? 'text'
              : currentTool

          const newAnnotation: ChartAnnotation = {
            type: annotationType as ChartAnnotation['type'],
            points: [{ price: price as number, time: timeValue as number }],
            color: getAnnotationColor(currentTool),
            label: getAnnotationLabel(currentTool),
          }

          setAnnotations((prev) => [...prev, newAnnotation])
        })
      }

      return () => {
        resizeObserver.disconnect()
      }
    }

    initChart()

    return () => {
      disposed = true
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
        setIsChartReady(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, height, readOnly])

  // Render annotations as price lines whenever annotations change
  useEffect(() => {
    if (!isChartReady || !seriesRef.current) return

    const series = seriesRef.current

    // Remove all previously created price lines to prevent duplication
    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line)
      } catch {
        // Price line may already have been removed (e.g. after series rebuild)
      }
    })
    priceLinesRef.current = []

    // Apply all annotations as price lines
    annotations.forEach((annotation) => {
      if (
        annotation.type === 'horizontal_line' &&
        annotation.points.length > 0
      ) {
        const priceLine = series.createPriceLine({
          price: annotation.points[0].price,
          color: annotation.color,
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: annotation.label || '',
        })
        priceLinesRef.current.push(priceLine)
      }
    })

    // Notify parent of state changes
    if (onChartStateChange && !readOnly) {
      onChartStateChange(buildChartState(annotations))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, isChartReady])

  // Load saved annotations from chartData on mount
  useEffect(() => {
    if (chartData?.annotations && chartData.annotations.length > 0) {
      setAnnotations(chartData.annotations)
    }
  }, [chartData])

  const rebuildSeries = useCallback((chart: unknown, newAnnotations: ChartAnnotation[]) => {
    if (!chart || !seriesRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chart as any).removeSeries(seriesRef.current)
    const newSeries = createCandlestickSeries(chart)
    if (!newSeries) return
    seriesRef.current = newSeries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(chart as any).timeScale().fitContent()
    // Re-apply annotations
    newAnnotations.forEach((ann) => {
      if (ann.type === 'horizontal_line' && ann.points.length > 0) {
        newSeries.createPriceLine({
          price: ann.points[0].price,
          color: ann.color,
          lineWidth: 2,
          lineStyle: 0,
          axisLabelVisible: true,
          title: ann.label || '',
        })
      }
    })
  }, [createCandlestickSeries])

  const handleClear = () => {
    setAnnotations([])
    rebuildSeries(chartRef.current, [])
    if (onChartStateChange) {
      onChartStateChange(buildChartState([]))
    }
  }

  return (
    <div data-active-tool={activeTool || ''}>
      {!readOnly && (
        <div className="mb-3">
          <ChartAnnotationToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onClear={handleClear}
          />
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-[var(--glass-surface-border)]">
        <div ref={chartContainerRef} style={{ height }} />
      </div>

      {!readOnly && annotations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {annotations.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border border-[var(--glass-surface-border)] bg-black/40"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: a.color }}
              />
              {a.label || a.type.replace('_', ' ')}
              <span className="text-[var(--muted)] mono-num">
                {a.points[0]?.price.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => {
                  const updated = annotations.filter((_, idx) => idx !== i)
                  setAnnotations(updated)
                  rebuildSeries(chartRef.current, updated)
                  if (onChartStateChange) {
                    onChartStateChange(buildChartState(updated))
                  }
                }}
                className="ml-1 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {!readOnly && (
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          Select a tool above, then click on the chart to place annotations. This step is optional.
        </p>
      )}
    </div>
  )
}

const DynamicChartInner = dynamic(
  () => Promise.resolve(ChartInner),
  { ssr: false, loading: () => (
    <div className="rounded-xl glass-surface flex items-center justify-center" style={{ height: 400 }}>
      <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
        <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
        <span className="text-sm">Loading chart...</span>
      </div>
    </div>
  )}
)

export function TradingViewChart(props: TradingViewChartProps) {
  return <DynamicChartInner {...props} />
}
