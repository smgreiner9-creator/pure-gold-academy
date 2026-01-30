'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Select } from '@/components/ui'
import { TradeCallForm, TradeCallFormData } from '@/components/trade-calls'
import type { Classroom } from '@/types/database'

export default function NewTradeCallPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const loadClassrooms = useCallback(async () => {
    if (!profile?.id) return

    try {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('name')

      setClassrooms(data || [])
      if (data && data.length === 1) {
        setSelectedClassroom(data[0].id)
      }
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadClassrooms()
    }
  }, [profile?.id, loadClassrooms])

  const handleSubmit = async (formData: TradeCallFormData) => {
    if (!selectedClassroom) {
      setError('Please select a strategy')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/trade-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: selectedClassroom,
          ...formData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create trade call')
      }

      router.push('/teacher/trade-calls')
    } catch (error) {
      console.error('Error creating trade call:', error)
      setError(error instanceof Error ? error.message : 'Failed to create trade call')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="h-8 w-48 bg-[var(--glass-surface-border)] rounded animate-pulse mb-6" />
        <Card className="h-96 animate-pulse" />
      </div>
    )
  }

  if (classrooms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="text-center py-12">
          <span className="material-symbols-outlined text-5xl mx-auto mb-4 text-[var(--muted)]">target</span>
          <h2 className="text-xl font-semibold mb-2">Create a Strategy First</h2>
          <p className="text-[var(--muted)] mb-4">
            You need to create a trading strategy before you can post trade calls.
          </p>
          <Link href="/teacher/strategy/new">
            <Button>Create Strategy</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/teacher/trade-calls">
          <Button variant="ghost" size="sm">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Trade Call</h1>
          <p className="text-[var(--muted)]">Share a trade idea with your students</p>
        </div>
      </div>

      {/* Strategy Selection */}
      {classrooms.length > 1 && (
        <Card>
          <label className="block text-sm font-medium mb-2">Select Strategy</label>
          <Select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
          >
            <option value="">Choose a strategy...</option>
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <p className="text-xs text-[var(--muted)] mt-2">
            Students enrolled in this strategy will see this trade call.
          </p>
        </Card>
      )}

      {/* Error message */}
      {error && (
        <Card className="bg-[var(--danger)]/10 border-[var(--danger)]">
          <p className="text-[var(--danger)]">{error}</p>
        </Card>
      )}

      {/* Trade Call Form */}
      <TradeCallForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/teacher/trade-calls')}
        isLoading={isSubmitting}
        mode="create"
      />

      {/* Tips */}
      <Card>
        <h3 className="font-semibold mb-2">Tips for Good Trade Calls</h3>
        <ul className="text-sm text-[var(--muted)] space-y-1 list-disc list-inside">
          <li>Include clear entry and exit levels</li>
          <li>Add analysis to help students understand your reasoning</li>
          <li>Use proper risk management (recommended 1:2+ R:R)</li>
          <li>Link TradingView charts for visual reference</li>
          <li>Update students when you close the trade</li>
        </ul>
      </Card>
    </div>
  )
}
