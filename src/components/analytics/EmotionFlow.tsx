'use client'

import { useMemo, useState } from 'react'
import type { JournalEntry, EmotionType } from '@/types/database'

interface EmotionFlowProps {
  entries: JournalEntry[]
}

const emotionConfig: Record<EmotionType, { label: string; icon: string; color: string }> = {
  calm: { label: 'Calm', icon: '😌', color: '#22c55e' },
  confident: { label: 'Confident', icon: '💪', color: '#d4a843' },
  neutral: { label: 'Neutral', icon: '😐', color: '#6b7280' },
  anxious: { label: 'Anxious', icon: '😰', color: '#f59e0b' },
  fearful: { label: 'Fearful', icon: '😨', color: '#ef4444' },
  greedy: { label: 'Greedy', icon: '🤑', color: '#f59e0b' },
  frustrated: { label: 'Frustrated', icon: '😤', color: '#ef4444' },
}

type Outcome = 'win' | 'loss' | 'breakeven'

interface TransitionData {
  from: EmotionType
  to: EmotionType
  outcome: Outcome
  count: number
}

interface NodeData {
  emotion: EmotionType
  column: number
  count: number
  y: number
  height: number
}

const COLUMN_X = [50, 360, 670]
const NODE_WIDTH = 80
const SVG_WIDTH = 800
const SVG_HEIGHT = 500
const NODE_AREA_TOP = 50
const NODE_AREA_BOTTOM = 460
const NODE_GAP = 8

function getOutcomeColor(outcome: Outcome, opacity: number): string {
  if (outcome === 'win') return `rgba(34, 197, 94, ${opacity})`
  if (outcome === 'loss') return `rgba(239, 68, 68, ${opacity})`
  return `rgba(107, 114, 128, ${opacity})`
}

function buildBezierPath(
  x1: number, y1Top: number, y1Bottom: number,
  x2: number, y2Top: number, y2Bottom: number
): string {
  const cx = (x1 + x2) / 2
  return [
    `M ${x1} ${y1Top}`,
    `C ${cx} ${y1Top}, ${cx} ${y2Top}, ${x2} ${y2Top}`,
    `L ${x2} ${y2Bottom}`,
    `C ${cx} ${y2Bottom}, ${cx} ${y1Bottom}, ${x1} ${y1Bottom}`,
    'Z',
  ].join(' ')
}

export function EmotionFlow({ entries }: EmotionFlowProps) {
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null)

  const validEntries = useMemo(
    () =>
      entries.filter(
        (e) =>
          e.emotion_before &&
          e.emotion_during &&
          e.emotion_after &&
          e.outcome !== null
      ),
    [entries]
  )

  const { nodes, flows, insights } = useMemo(() => {
    if (validEntries.length < 5) {
      return { nodes: [] as NodeData[], flows: [] as (TransitionData & { phase: 'before-during' | 'during-after' })[], insights: [] as string[] }
    }

    // Count transitions
    const transitionMap = new Map<string, number>()
    const columnEmotionCounts: [Map<EmotionType, number>, Map<EmotionType, number>, Map<EmotionType, number>] = [
      new Map(),
      new Map(),
      new Map(),
    ]

    for (const entry of validEntries) {
      const before = entry.emotion_before
      const during = entry.emotion_during as EmotionType
      const after = entry.emotion_after as EmotionType
      const outcome = entry.outcome as Outcome

      // Count per column
      columnEmotionCounts[0].set(before, (columnEmotionCounts[0].get(before) || 0) + 1)
      columnEmotionCounts[1].set(during, (columnEmotionCounts[1].get(during) || 0) + 1)
      columnEmotionCounts[2].set(after, (columnEmotionCounts[2].get(after) || 0) + 1)

      // Count transitions with outcome
      const key1 = `bd:${before}:${during}:${outcome}`
      transitionMap.set(key1, (transitionMap.get(key1) || 0) + 1)

      const key2 = `da:${during}:${after}:${outcome}`
      transitionMap.set(key2, (transitionMap.get(key2) || 0) + 1)
    }

    // Build nodes with positions
    const totalCount = validEntries.length
    const availableHeight = NODE_AREA_BOTTOM - NODE_AREA_TOP
    const allNodes: NodeData[] = []

    for (let col = 0; col < 3; col++) {
      const emotionCounts = columnEmotionCounts[col]
      const sorted = [...emotionCounts.entries()].sort((a, b) => b[1] - a[1])
      const numNodes = sorted.length
      const totalGap = Math.max(0, numNodes - 1) * NODE_GAP
      const heightForNodes = availableHeight - totalGap

      let currentY = NODE_AREA_TOP
      for (const [emotion, count] of sorted) {
        const nodeHeight = Math.max(16, (count / totalCount) * heightForNodes)
        allNodes.push({
          emotion,
          column: col,
          count,
          y: currentY,
          height: nodeHeight,
        })
        currentY += nodeHeight + NODE_GAP
      }
    }

    // Build flows
    type FlowEntry = TransitionData & { phase: 'before-during' | 'during-after' }
    const allFlows: FlowEntry[] = []

    for (const [key, count] of transitionMap.entries()) {
      const parts = key.split(':')
      const phase = parts[0] === 'bd' ? 'before-during' : 'during-after'
      const from = parts[1] as EmotionType
      const to = parts[2] as EmotionType
      const outcome = parts[3] as Outcome
      allFlows.push({ from, to, outcome, count, phase })
    }

    // Sort flows so larger ones render first (behind)
    allFlows.sort((a, b) => b.count - a.count)

    // Build insights
    const insightsList: string[] = []

    // Track full paths: before -> during -> after with outcomes
    const pathStats = new Map<string, { wins: number; losses: number; total: number }>()
    for (const entry of validEntries) {
      const path = `${entry.emotion_before}:${entry.emotion_during}:${entry.emotion_after}`
      const stat = pathStats.get(path) || { wins: 0, losses: 0, total: 0 }
      stat.total++
      if (entry.outcome === 'win') stat.wins++
      if (entry.outcome === 'loss') stat.losses++
      pathStats.set(path, stat)
    }

    // Find highest loss rate transition (min 2 trades)
    let worstPath = ''
    let worstLossRate = 0
    let worstTotal = 0
    for (const [path, stat] of pathStats.entries()) {
      if (stat.total >= 2) {
        const lossRate = stat.losses / stat.total
        if (lossRate > worstLossRate) {
          worstLossRate = lossRate
          worstPath = path
          worstTotal = stat.total
        }
      }
    }

    // Find highest win rate transition (min 2 trades)
    let bestPath = ''
    let bestWinRate = 0
    let bestTotal = 0
    for (const [path, stat] of pathStats.entries()) {
      if (stat.total >= 2) {
        const winRate = stat.wins / stat.total
        if (winRate > bestWinRate) {
          bestWinRate = winRate
          bestPath = path
          bestTotal = stat.total
        }
      }
    }

    if (worstPath && worstTotal >= 2) {
      const [b, d] = worstPath.split(':')
      const bLabel = emotionConfig[b as EmotionType]?.label || b
      const dLabel = emotionConfig[d as EmotionType]?.label || d
      insightsList.push(
        `When you start ${bLabel} but shift to ${dLabel}, you lose ${(worstLossRate * 100).toFixed(0)}% of the time (${worstTotal} trades).`
      )
    }

    if (bestPath && bestTotal >= 2) {
      const [b, d, a] = bestPath.split(':')
      const bLabel = emotionConfig[b as EmotionType]?.label || b
      const dLabel = emotionConfig[d as EmotionType]?.label || d
      const aLabel = emotionConfig[a as EmotionType]?.label || a
      if (b === d && d === a) {
        insightsList.push(
          `Your most stable winning pattern: ${bLabel} throughout the trade (${(bestWinRate * 100).toFixed(0)}% win rate, ${bestTotal} trades).`
        )
      } else {
        insightsList.push(
          `Your best pattern: ${bLabel} \u2192 ${dLabel} \u2192 ${aLabel} (${(bestWinRate * 100).toFixed(0)}% win rate, ${bestTotal} trades).`
        )
      }
    }

    return { nodes: allNodes, flows: allFlows, insights: insightsList }
  }, [validEntries])

  if (validEntries.length < 5) {
    return (
      <p className="text-sm text-[var(--muted)] py-4">
        Log at least 5 trades with before, during, and after emotions to see your emotion flow patterns.
      </p>
    )
  }

  // Helper to find node by column and emotion
  const findNode = (col: number, emotion: EmotionType): NodeData | undefined =>
    nodes.find((n) => n.column === col && n.emotion === emotion)

  // Track how much of each node's height has been consumed by flows (for stacking)
  const nodeFlowOffset: Map<string, number> = new Map()
  const getOffset = (col: number, emotion: EmotionType, side: 'left' | 'right'): number => {
    const key = `${col}:${emotion}:${side}`
    return nodeFlowOffset.get(key) || 0
  }
  const addOffset = (col: number, emotion: EmotionType, side: 'left' | 'right', amount: number) => {
    const key = `${col}:${emotion}:${side}`
    nodeFlowOffset.set(key, (nodeFlowOffset.get(key) || 0) + amount)
  }

  // Pre-compute flow paths
  const flowPaths: {
    key: string
    d: string
    outcome: Outcome
    from: EmotionType
    to: EmotionType
    count: number
    phase: string
  }[] = []

  for (const flow of flows) {
    const fromCol = flow.phase === 'before-during' ? 0 : 1
    const toCol = flow.phase === 'before-during' ? 1 : 2
    const fromNode = findNode(fromCol, flow.from)
    const toNode = findNode(toCol, flow.to)
    if (!fromNode || !toNode) continue

    const fromTotal = fromNode.count
    const toTotal = toNode.count
    const flowHeightFrom = (flow.count / fromTotal) * fromNode.height
    const flowHeightTo = (flow.count / toTotal) * toNode.height

    const fromOffsetRight = getOffset(fromCol, flow.from, 'right')
    const toOffsetLeft = getOffset(toCol, flow.to, 'left')

    const x1 = COLUMN_X[fromCol] + NODE_WIDTH
    const x2 = COLUMN_X[toCol]
    const y1Top = fromNode.y + fromOffsetRight
    const y1Bottom = y1Top + flowHeightFrom
    const y2Top = toNode.y + toOffsetLeft
    const y2Bottom = y2Top + flowHeightTo

    addOffset(fromCol, flow.from, 'right', flowHeightFrom)
    addOffset(toCol, flow.to, 'left', flowHeightTo)

    const key = `${flow.phase}:${flow.from}:${flow.to}:${flow.outcome}`
    flowPaths.push({
      key,
      d: buildBezierPath(x1, y1Top, y1Bottom, x2, y2Top, y2Bottom),
      outcome: flow.outcome,
      from: flow.from,
      to: flow.to,
      count: flow.count,
      phase: flow.phase,
    })
  }

  const columnLabels = ['Before', 'During', 'After']

  return (
    <div>
      {/* SVG Diagram */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto"
          style={{ minWidth: 500 }}
        >
          {/* Column headers */}
          {columnLabels.map((label, i) => (
            <text
              key={label}
              x={COLUMN_X[i] + NODE_WIDTH / 2}
              y={28}
              textAnchor="middle"
              className="fill-[var(--muted)]"
              style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              {label}
            </text>
          ))}

          {/* Flow paths */}
          {flowPaths.map((fp) => {
            const isHovered = hoveredFlow === fp.key
            const opacity = isHovered ? 0.6 : hoveredFlow ? 0.15 : 0.3
            return (
              <path
                key={fp.key}
                d={fp.d}
                fill={getOutcomeColor(fp.outcome, opacity)}
                stroke="none"
                onMouseEnter={() => setHoveredFlow(fp.key)}
                onMouseLeave={() => setHoveredFlow(null)}
                style={{ transition: 'fill 0.2s ease', cursor: 'pointer' }}
              >
                <title>
                  {emotionConfig[fp.from]?.label} → {emotionConfig[fp.to]?.label} ({fp.outcome}: {fp.count})
                </title>
              </path>
            )
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const config = emotionConfig[node.emotion]
            if (!config) return null
            const x = COLUMN_X[node.column]
            return (
              <g key={`${node.column}-${node.emotion}`}>
                <rect
                  x={x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={node.height}
                  rx={6}
                  ry={6}
                  fill={config.color}
                  opacity={0.85}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                />
                {node.height >= 24 && (
                  <text
                    x={x + NODE_WIDTH / 2}
                    y={node.y + node.height / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    style={{ fontSize: node.height >= 36 ? 11 : 9, fontWeight: 600 }}
                  >
                    {config.icon} {config.label}
                  </text>
                )}
                {node.height >= 36 && (
                  <text
                    x={x + NODE_WIDTH / 2}
                    y={node.y + node.height / 2 + 14}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.7)"
                    style={{ fontSize: 9 }}
                  >
                    {node.count} trades
                  </text>
                )}
              </g>
            )
          })}

          {/* Legend */}
          <g transform={`translate(${SVG_WIDTH - 200}, ${SVG_HEIGHT - 30})`}>
            <rect x={0} y={0} width={12} height={12} rx={2} fill="rgba(34, 197, 94, 0.5)" />
            <text x={16} y={10} fill="var(--muted)" style={{ fontSize: 10 }}>Win</text>
            <rect x={50} y={0} width={12} height={12} rx={2} fill="rgba(239, 68, 68, 0.5)" />
            <text x={66} y={10} fill="var(--muted)" style={{ fontSize: 10 }}>Loss</text>
            <rect x={105} y={0} width={12} height={12} rx={2} fill="rgba(107, 114, 128, 0.5)" />
            <text x={121} y={10} fill="var(--muted)" style={{ fontSize: 10 }}>Breakeven</text>
          </g>
        </svg>
      </div>

      {/* Insight Cards */}
      {insights.length > 0 && (
        <div className="mt-4 space-y-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20"
            >
              <p className="text-[10px] font-bold text-[var(--gold)] uppercase tracking-widest mb-1">
                {i === 0 ? 'Watch Out' : 'Best Pattern'}
              </p>
              <p className="text-sm">{insight}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
