'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Select } from '@/components/ui'
import { TradeCallCard, TradeCallForm, type TradeCallFormData } from '@/components/trade-calls'
import {
  Plus,
  Filter,
  TrendingUp,
  Target,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react'
import type { TradeCall, Classroom } from '@/types/database'

interface PerformanceStats {
  totalCalls: number
  activeCalls: number
  winningCalls: number
  losingCalls: number
  winRate: number
  avgPips: number
}

export default function TeacherTradeCallsPage() {
  const { profile } = useAuth()
  const [tradeCalls, setTradeCalls] = useState<(TradeCall & { teacher?: { display_name: string | null } })[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [stats, setStats] = useState<PerformanceStats>({
    totalCalls: 0,
    activeCalls: 0,
    winningCalls: 0,
    losingCalls: 0,
    winRate: 0,
    avgPips: 0,
  })
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [closingCallId, setClosingCallId] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Load classrooms first
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)

      setClassrooms(classroomData || [])

      // Build trade calls query
      let query = supabase
        .from('trade_calls')
        .select('*')
        .eq('teacher_id', profile.id)
        .order('published_at', { ascending: false })

      if (selectedClassroom) {
        query = query.eq('classroom_id', selectedClassroom)
      }

      if (statusFilter === 'active') {
        query = query.eq('status', 'active')
      } else if (statusFilter === 'closed') {
        query = query.neq('status', 'active')
      }

      const { data: calls } = await query

      setTradeCalls(calls || [])

      // Calculate stats from all calls (not filtered)
      const { data: allCalls } = await supabase
        .from('trade_calls')
        .select('status, result_pips')
        .eq('teacher_id', profile.id)

      if (allCalls) {
        const active = allCalls.filter(c => c.status === 'active').length
        const winning = allCalls.filter(c => ['hit_tp1', 'hit_tp2', 'hit_tp3'].includes(c.status)).length
        const losing = allCalls.filter(c => c.status === 'hit_sl').length
        const closedWithResult = winning + losing
        const totalPips = allCalls.reduce((sum, c) => sum + (c.result_pips || 0), 0)
        const callsWithPips = allCalls.filter(c => c.result_pips !== null).length

        setStats({
          totalCalls: allCalls.length,
          activeCalls: active,
          winningCalls: winning,
          losingCalls: losing,
          winRate: closedWithResult > 0 ? (winning / closedWithResult) * 100 : 0,
          avgPips: callsWithPips > 0 ? totalPips / callsWithPips : 0,
        })
      }
    } catch (error) {
      console.error('Error loading trade calls:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, selectedClassroom, statusFilter, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id, loadData])

  const handleCloseCall = async (formData: TradeCallFormData) => {
    if (!closingCallId) return

    setIsClosing(true)
    try {
      const res = await fetch('/api/trade-calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: closingCallId,
          ...formData,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to close trade call')
      }

      setClosingCallId(null)
      loadData()
    } catch (error) {
      console.error('Error closing trade call:', error)
    } finally {
      setIsClosing(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeleteCall = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trade call?')) return

    try {
      const res = await fetch(`/api/trade-calls?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete trade call')
      }

      loadData()
    } catch (error) {
      console.error('Error deleting trade call:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-[var(--card-border)] rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-20 bg-[var(--card-border)] rounded mb-2" />
              <div className="h-8 w-16 bg-[var(--card-border)] rounded" />
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Check if teacher has classrooms
  if (classrooms.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="text-center py-12">
          <Target size={48} className="mx-auto mb-4 text-[var(--muted)]" />
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Trade Calls</h1>
          <p className="text-[var(--muted)]">Post and manage your trade ideas</p>
        </div>
        <Link href="/teacher/trade-calls/new">
          <Button>
            <Plus size={18} />
            New Trade Call
          </Button>
        </Link>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <p className="text-xs text-[var(--muted)] mb-1">Total Calls</p>
          <p className="text-2xl font-bold">{stats.totalCalls}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-[var(--gold)]" />
            <p className="text-xs text-[var(--muted)]">Active</p>
          </div>
          <p className="text-2xl font-bold text-[var(--gold)]">{stats.activeCalls}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={14} className="text-[var(--success)]" />
            <p className="text-xs text-[var(--muted)]">Winning</p>
          </div>
          <p className="text-2xl font-bold text-[var(--success)]">{stats.winningCalls}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={14} className="text-[var(--danger)]" />
            <p className="text-xs text-[var(--muted)]">Losing</p>
          </div>
          <p className="text-2xl font-bold text-[var(--danger)]">{stats.losingCalls}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={14} className="text-[var(--foreground)]" />
            <p className="text-xs text-[var(--muted)]">Win Rate</p>
          </div>
          <p className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {stats.winRate.toFixed(1)}%
          </p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)] mb-1">Avg Pips</p>
          <p className={`text-2xl font-bold ${stats.avgPips >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {stats.avgPips >= 0 ? '+' : ''}{stats.avgPips.toFixed(1)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--muted)]" />
          <span className="text-sm text-[var(--muted)]">Filter:</span>
        </div>
        <Select
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          className="w-48"
        >
          <option value="">All Strategies</option>
          {classrooms.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </Select>
      </div>

      {/* Close Trade Modal */}
      {closingCallId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <TradeCallForm
              initialData={tradeCalls.find(c => c.id === closingCallId)}
              mode="close"
              onSubmit={handleCloseCall}
              onCancel={() => setClosingCallId(null)}
              isLoading={isClosing}
            />
          </div>
        </div>
      )}

      {/* Trade Calls List */}
      {tradeCalls.length === 0 ? (
        <Card className="text-center py-12">
          <TrendingUp size={48} className="mx-auto mb-4 text-[var(--muted)]" />
          <h2 className="text-xl font-semibold mb-2">No Trade Calls Yet</h2>
          <p className="text-[var(--muted)] mb-4">
            Post your first trade call to share with your students.
          </p>
          <Link href="/teacher/trade-calls/new">
            <Button>Post Trade Call</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {tradeCalls.map(call => (
            <TradeCallCard
              key={call.id}
              tradeCall={call}
              isTeacher={true}
              onClose={() => setClosingCallId(call.id)}
              showActions={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
