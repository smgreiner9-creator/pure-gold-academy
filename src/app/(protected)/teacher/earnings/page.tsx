'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useTeacherStripe } from '@/hooks/useTeacherStripe'
import type { Classroom } from '@/types/database'

interface EarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  totalSubscribers: number
  activeSubscribers: number
  totalPurchases: number
  recentTransactions: Transaction[]
  earningsByClassroom: ClassroomEarnings[]
}

interface Transaction {
  id: string
  type: 'subscription' | 'purchase'
  amount: number
  platformFee: number
  netEarnings: number
  studentEmail: string
  classroomName: string
  contentTitle?: string
  date: string
}

interface ClassroomEarnings {
  classroom: Classroom
  totalEarnings: number
  subscriberCount: number
}

export default function EarningsPage() {
  const { profile } = useAuth()
  const { isConnected, canAcceptPayments, isLoading: stripeLoading } = useTeacherStripe()
  const [data, setData] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const loadEarningsData = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Get teacher's classrooms
      const { data: classrooms } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)

      const classroomIds = classrooms?.map(c => c.id) || []

      if (classroomIds.length === 0) {
        setData({
          totalEarnings: 0,
          thisMonthEarnings: 0,
          totalSubscribers: 0,
          activeSubscribers: 0,
          totalPurchases: 0,
          recentTransactions: [],
          earningsByClassroom: [],
        })
        setIsLoading(false)
        return
      }

      // Get subscriptions and purchases in parallel
      const [subscriptionsRes, purchasesRes, studentsRes, pricingRes, contentRes] = await Promise.all([
        supabase
          .from('classroom_subscriptions')
          .select('*')
          .in('classroom_id', classroomIds),
        supabase
          .from('content_purchases')
          .select('*')
          .eq('status', 'completed'),
        supabase
          .from('profiles')
          .select('id, email, display_name, classroom_id')
          .eq('role', 'student'),
        supabase
          .from('classroom_pricing')
          .select('*')
          .in('classroom_id', classroomIds),
        supabase
          .from('learn_content')
          .select('id, title, classroom_id')
          .in('classroom_id', classroomIds)
      ])

      const rawSubscriptions = subscriptionsRes.data || []
      const allContent = contentRes.data || []
      const allProfiles = studentsRes.data || []
      const contentMap = new Map(allContent.map(c => [c.id, c]))
      const profileMap = new Map(allProfiles.map(p => [p.id, p]))

      // Add profile info to subscriptions
      const subscriptions = rawSubscriptions.map(sub => ({
        ...sub,
        profile: profileMap.get(sub.student_id)
      }))

      // Filter purchases to only include content from teacher's classrooms
      const purchases = (purchasesRes.data || []).filter(p => {
        const content = contentMap.get(p.content_id)
        return content && classroomIds.includes(content.classroom_id)
      }).map(p => ({
        ...p,
        learn_content: contentMap.get(p.content_id),
        profile: profileMap.get(p.student_id)
      }))
      const pricing = pricingRes.data || []

      // Calculate earnings from subscriptions
      // For simplicity, assume monthly price from pricing table
      const pricingMap = new Map(pricing.map(p => [p.classroom_id, p.monthly_price || 0]))
      const platformFeePercent = 0.15

      // Calculate subscription earnings (estimate based on active subscriptions)
      let subscriptionEarnings = 0
      subscriptions.forEach(sub => {
        if (sub.status === 'active') {
          const price = pricingMap.get(sub.classroom_id) || 0
          subscriptionEarnings += price * (1 - platformFeePercent)
        }
      })

      // Calculate purchase earnings
      const purchaseEarnings = purchases.reduce((sum, p) =>
        sum + (p.teacher_payout || 0), 0)

      // This month's earnings (simplified - just show current active subscriptions)
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const thisMonthSubscriptions = subscriptions.filter(s =>
        s.status === 'active' &&
        new Date(s.current_period_start || s.created_at) <= now
      )
      const thisMonthPurchases = purchases.filter(p =>
        new Date(p.purchased_at) >= startOfMonth
      )

      const thisMonthSubEarnings = thisMonthSubscriptions.reduce((sum, s) => {
        const price = pricingMap.get(s.classroom_id) || 0
        return sum + price * (1 - platformFeePercent)
      }, 0)
      const thisMonthPurchaseEarnings = thisMonthPurchases.reduce((sum, p) =>
        sum + (p.teacher_payout || 0), 0)

      // Build transactions list
      const transactions: Transaction[] = []

      // Add subscription transactions (using current period as date)
      subscriptions.forEach(sub => {
        const classroom = classrooms?.find(c => c.id === sub.classroom_id)
        const price = pricingMap.get(sub.classroom_id) || 0
        const platformFee = price * platformFeePercent
        transactions.push({
          id: sub.id,
          type: 'subscription',
          amount: price,
          platformFee,
          netEarnings: price - platformFee,
          studentEmail: sub.profile?.email || 'Unknown',
          classroomName: classroom?.name || 'Unknown',
          date: sub.current_period_start || sub.created_at,
        })
      })

      // Add purchase transactions
      purchases.forEach(p => {
        const classroom = classrooms?.find(c => c.id === p.learn_content?.classroom_id)
        transactions.push({
          id: p.id,
          type: 'purchase',
          amount: p.amount,
          platformFee: p.platform_fee,
          netEarnings: p.teacher_payout,
          studentEmail: p.profile?.email || 'Unknown',
          classroomName: classroom?.name || 'Unknown',
          contentTitle: p.learn_content?.title,
          date: p.purchased_at,
        })
      })

      // Sort by date descending
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Calculate earnings by classroom
      const earningsByClassroom: ClassroomEarnings[] = (classrooms || []).map(classroom => {
        const classroomSubs = subscriptions.filter(s => s.classroom_id === classroom.id && s.status === 'active')
        const classroomPurchases = purchases.filter(p =>
          p.learn_content?.classroom_id === classroom.id
        )
        const price = pricingMap.get(classroom.id) || 0

        const subEarnings = classroomSubs.length * price * (1 - platformFeePercent)
        const purchaseEarnings = classroomPurchases.reduce((sum, p) =>
          sum + (p.teacher_payout || 0), 0)

        return {
          classroom,
          totalEarnings: subEarnings + purchaseEarnings,
          subscriberCount: classroomSubs.length,
        }
      })

      setData({
        totalEarnings: subscriptionEarnings + purchaseEarnings,
        thisMonthEarnings: thisMonthSubEarnings + thisMonthPurchaseEarnings,
        totalSubscribers: subscriptions.length,
        activeSubscribers: subscriptions.filter(s => s.status === 'active').length,
        totalPurchases: purchases.length,
        recentTransactions: transactions.slice(0, 10),
        earningsByClassroom,
      })
    } catch (error) {
      console.error('Error loading earnings data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadEarningsData()
    }
  }, [profile?.id, loadEarningsData])

  if (isLoading || stripeLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (!isConnected || !canAcceptPayments) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--warning)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--warning)]">link_off</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Connect Stripe to View Earnings</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Complete your Stripe Connect setup to start receiving payments and view your earnings.
          </p>
          <Link
            href="/teacher/settings"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">link</span>
            Connect Stripe
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/teacher"
        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-white transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-[var(--muted)] text-sm">Track your revenue from subscriptions and content sales</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-[var(--gold)]">${data?.totalEarnings.toFixed(2) || '0.00'}</p>
        </div>
        <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-bold text-[var(--success)]">${data?.thisMonthEarnings.toFixed(2) || '0.00'}</p>
        </div>
        <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Active Subscribers</p>
          <p className="text-2xl font-bold">{data?.activeSubscribers || 0}</p>
        </div>
        <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Content Purchases</p>
          <p className="text-2xl font-bold">{data?.totalPurchases || 0}</p>
        </div>
      </div>

      {/* Earnings by Classroom */}
      {data?.earningsByClassroom && data.earningsByClassroom.length > 0 && (
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
          <h2 className="font-bold text-lg mb-4">Revenue by Classroom</h2>
          <div className="space-y-3">
            {data.earningsByClassroom.map(({ classroom, totalEarnings, subscriberCount }) => (
              <div
                key={classroom.id}
                className="flex items-center justify-between p-4 rounded-xl bg-black/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl text-[var(--gold)]">school</span>
                  </div>
                  <div>
                    <p className="font-semibold">{classroom.name}</p>
                    <p className="text-sm text-[var(--muted)]">{subscriberCount} active subscribers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--gold)]">${totalEarnings.toFixed(2)}</p>
                  <p className="text-xs text-[var(--muted)]">net earnings</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h2 className="font-bold text-lg mb-4">Recent Transactions</h2>
        {data?.recentTransactions && data.recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {data.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl bg-black/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === 'subscription' ? 'bg-[var(--gold)]/10' : 'bg-[var(--success)]/10'
                  }`}>
                    <span className={`material-symbols-outlined text-xl ${
                      tx.type === 'subscription' ? 'text-[var(--gold)]' : 'text-[var(--success)]'
                    }`}>
                      {tx.type === 'subscription' ? 'autorenew' : 'shopping_cart'}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {tx.type === 'subscription' ? 'Subscription' : 'Content Purchase'}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {tx.studentEmail} - {tx.classroomName}
                      {tx.contentTitle && ` - ${tx.contentTitle}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--success)]">+${tx.netEarnings.toFixed(2)}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-3">receipt_long</span>
            <p className="text-[var(--muted)]">No transactions yet</p>
            <p className="text-sm text-[var(--muted)] mt-1">
              Transactions will appear here when students subscribe or purchase content
            </p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--gold)]">info</span>
          Fee Breakdown
        </h3>
        <ul className="space-y-2 text-sm text-[var(--muted)]">
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">-</span>
            Platform fee: 15% of each transaction
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">-</span>
            Stripe processing fees: Included in platform fee
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[var(--gold)]">-</span>
            Payouts are processed directly to your connected Stripe account
          </li>
        </ul>
      </div>
    </div>
  )
}
