'use client'

import { motion } from 'framer-motion'
import { useConsistencyScore } from '@/hooks/useConsistencyScore'
import type { ConsistencyScoreBreakdown } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(value: number): string {
  if (value >= 70) return 'var(--success)'
  if (value >= 40) return 'var(--gold)'
  return 'var(--danger)'
}

function scoreLabel(value: number): string {
  if (value >= 80) return 'Excellent'
  if (value >= 60) return 'Good'
  if (value >= 40) return 'Fair'
  return 'Needs Work'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const GAUGE_RADIUS = 50
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS
const GAUGE_VIEWBOX = 120
const GAUGE_CENTER = GAUGE_VIEWBOX / 2
const GAUGE_STROKE = 8

function CircularGauge({ value }: { value: number }) {
  const color = scoreColor(value)
  const dashOffset = GAUGE_CIRCUMFERENCE - (value / 100) * GAUGE_CIRCUMFERENCE

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={GAUGE_VIEWBOX}
        height={GAUGE_VIEWBOX}
        viewBox={`0 0 ${GAUGE_VIEWBOX} ${GAUGE_VIEWBOX}`}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={GAUGE_CENTER}
          cy={GAUGE_CENTER}
          r={GAUGE_RADIUS}
          fill="none"
          stroke="var(--glass-surface-border)"
          strokeWidth={GAUGE_STROKE}
        />
        {/* Foreground ring */}
        <motion.circle
          cx={GAUGE_CENTER}
          cy={GAUGE_CENTER}
          r={GAUGE_RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          initial={{ strokeDashoffset: GAUGE_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="mono-num text-3xl font-bold leading-none"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {value}
        </motion.span>
        <span
          className="mt-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--muted)' }}
        >
          {scoreLabel(value)}
        </span>
      </div>
    </div>
  )
}

interface BreakdownBarProps {
  label: string
  value: number
  delay: number
}

function BreakdownBar({ label, value, delay }: BreakdownBarProps) {
  const color = scoreColor(value)

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--foreground)' }}
        >
          {label}
        </span>
        <span
          className="mono-num text-xs font-semibold"
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--glass-surface-border)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Placeholder / loading state
// ---------------------------------------------------------------------------

function PlaceholderState({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="glass-surface flex flex-col items-center justify-center gap-3 rounded-2xl p-6">
      <span
        className="material-symbols-outlined text-4xl"
        style={{ color: 'var(--muted)' }}
      >
        shield_locked
      </span>
      <p
        className="text-center text-sm"
        style={{ color: 'var(--muted)' }}
      >
        {isLoading
          ? 'Calculating your consistency score...'
          : 'Log trades to unlock your consistency score'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

const BREAKDOWN_ITEMS: {
  key: keyof Omit<ConsistencyScoreBreakdown, 'overall'>
  label: string
}[] = [
  { key: 'ruleAdherence', label: 'Rules' },
  { key: 'riskManagement', label: 'Risk' },
  { key: 'emotionalDiscipline', label: 'Emotions' },
  { key: 'journalingConsistency', label: 'Frequency' },
]

export default function ConsistencyScoreWidget() {
  const { score, isLoading } = useConsistencyScore()

  if (!score) {
    return <PlaceholderState isLoading={isLoading} />
  }

  return (
    <motion.div
      className="glass-surface rounded-2xl p-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className="material-symbols-outlined text-xl"
          style={{ color: 'var(--gold)' }}
        >
          shield
        </span>
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--foreground)' }}
        >
          Consistency Score
        </h3>
      </div>

      {/* Body: gauge + breakdown */}
      <div className="flex items-center gap-6">
        {/* Left: circular gauge */}
        <div className="flex-shrink-0">
          <CircularGauge value={score.overall} />
        </div>

        {/* Right: breakdown bars */}
        <div className="flex flex-1 flex-col gap-3">
          {BREAKDOWN_ITEMS.map((item, i) => (
            <BreakdownBar
              key={item.key}
              label={item.label}
              value={score[item.key]}
              delay={0.15 * (i + 1)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <p
        className="mt-4 text-center text-[11px]"
        style={{ color: 'var(--muted)' }}
      >
        Based on last 20 trades
      </p>
    </motion.div>
  )
}
