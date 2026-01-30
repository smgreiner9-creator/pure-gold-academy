import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { JournalEntry, ProgressReportData, Json } from '@/types/database'

function calculateStreaks(entries: JournalEntry[]): ProgressReportData['streaks'] {
  let currentWin = 0
  let currentLoss = 0
  let bestWin = 0
  let tempWin = 0

  // Sort by trade_date ascending for streak calculation
  const sorted = [...entries].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  )

  for (const entry of sorted) {
    if (entry.outcome === 'win') {
      tempWin++
      bestWin = Math.max(bestWin, tempWin)
    } else {
      tempWin = 0
    }
  }

  // Calculate current streaks from the end
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].outcome === 'win') {
      if (currentLoss === 0) currentWin++
      else break
    } else if (sorted[i].outcome === 'loss') {
      if (currentWin === 0) currentLoss++
      else break
    } else {
      break
    }
  }

  return { currentWin, currentLoss, bestWin }
}

function identifyStrengths(entries: JournalEntry[], winRate: number, avgR: number): string[] {
  const strengths: string[] = []

  if (winRate >= 60) strengths.push('Strong win rate above 60%')
  if (avgR >= 1.5) strengths.push('Excellent average R-multiple')

  // Check emotion consistency
  const calmBefore = entries.filter(e => e.emotion_before === 'calm' || e.emotion_before === 'confident').length
  if (calmBefore / entries.length >= 0.7) {
    strengths.push('Consistent pre-trade emotional control')
  }

  // Check rule adherence
  const rulesFollowedCount = entries.filter(e => {
    const rules = e.rules_followed
    if (Array.isArray(rules)) return rules.length > 0
    return false
  }).length
  if (rulesFollowedCount / entries.length >= 0.8) {
    strengths.push('High rule adherence rate')
  }

  // Check direction consistency
  const wins = entries.filter(e => e.outcome === 'win')
  const longWins = wins.filter(e => e.direction === 'long').length
  const shortWins = wins.filter(e => e.direction === 'short').length
  if (longWins > shortWins * 2) strengths.push('Strong performance on long trades')
  if (shortWins > longWins * 2) strengths.push('Strong performance on short trades')

  if (strengths.length === 0) strengths.push('Consistent journaling habit')

  return strengths
}

function identifyImprovements(entries: JournalEntry[], winRate: number, avgR: number): string[] {
  const areas: string[] = []

  if (winRate < 40) areas.push('Win rate needs improvement - review entry criteria')
  if (avgR < 1) areas.push('Average R-multiple below 1 - consider tighter risk management')

  // Check emotional issues
  const anxiousBefore = entries.filter(e => e.emotion_before === 'anxious' || e.emotion_before === 'fearful').length
  if (anxiousBefore / entries.length >= 0.3) {
    areas.push('Frequent anxiety or fear before trades - work on pre-trade routine')
  }

  const greedyDuring = entries.filter(e => e.emotion_during === 'greedy').length
  if (greedyDuring / entries.length >= 0.2) {
    areas.push('Greed detected during trades - stick to take profit levels')
  }

  const frustratedAfter = entries.filter(e => e.emotion_after === 'frustrated').length
  if (frustratedAfter / entries.length >= 0.3) {
    areas.push('Post-trade frustration is common - review loss management')
  }

  // Check for large losses
  const bigLosses = entries.filter(e => e.r_multiple !== null && e.r_multiple < -2)
  if (bigLosses.length > 0) {
    areas.push(`${bigLosses.length} trade(s) with R-multiple below -2 - review stop loss discipline`)
  }

  if (areas.length === 0) areas.push('Keep refining your edge and stay disciplined')

  return areas
}

function generateReportData(
  entries: JournalEntry[],
  previousEntries: JournalEntry[]
): ProgressReportData {
  const totalTrades = entries.length

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      avgRMultiple: 0,
      bestTrade: null,
      worstTrade: null,
      emotionBreakdown: { before: {}, during: {}, after: {} },
      rulesFollowed: [],
      improvementAreas: ['No trades logged this period - stay active!'],
      strengths: [],
      streaks: { currentWin: 0, currentLoss: 0, bestWin: 0 },
      comparedToPrevious: null,
    }
  }

  const wins = entries.filter(e => e.outcome === 'win').length
  const winRate = Math.round((wins / totalTrades) * 100)

  const rMultiples = entries.filter(e => e.r_multiple !== null).map(e => e.r_multiple as number)
  const avgRMultiple = rMultiples.length > 0
    ? Math.round((rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length) * 100) / 100
    : 0

  // Best and worst trade
  const withR = entries.filter(e => e.r_multiple !== null)
  const sorted = [...withR].sort((a, b) => (b.r_multiple ?? 0) - (a.r_multiple ?? 0))
  const bestTrade = sorted.length > 0
    ? { instrument: sorted[0].instrument, rMultiple: sorted[0].r_multiple ?? 0, pnl: sorted[0].pnl ?? 0 }
    : null
  const worstTrade = sorted.length > 0
    ? {
        instrument: sorted[sorted.length - 1].instrument,
        rMultiple: sorted[sorted.length - 1].r_multiple ?? 0,
        pnl: sorted[sorted.length - 1].pnl ?? 0,
      }
    : null

  // Emotion breakdown
  const emotionBreakdown: ProgressReportData['emotionBreakdown'] = { before: {}, during: {}, after: {} }
  for (const entry of entries) {
    if (entry.emotion_before) {
      emotionBreakdown.before[entry.emotion_before] = (emotionBreakdown.before[entry.emotion_before] || 0) + 1
    }
    if (entry.emotion_during) {
      emotionBreakdown.during[entry.emotion_during] = (emotionBreakdown.during[entry.emotion_during] || 0) + 1
    }
    if (entry.emotion_after) {
      emotionBreakdown.after[entry.emotion_after] = (emotionBreakdown.after[entry.emotion_after] || 0) + 1
    }
  }

  // Rules followed
  const ruleMap = new Map<string, { count: number; total: number }>()
  for (const entry of entries) {
    const rules = entry.rules_followed
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        if (typeof rule === 'string') {
          const existing = ruleMap.get(rule) || { count: 0, total: 0 }
          existing.count++
          existing.total = totalTrades
          ruleMap.set(rule, existing)
        }
      }
    }
  }
  const rulesFollowed = Array.from(ruleMap.entries()).map(([rule, data]) => ({
    rule,
    count: data.count,
    total: data.total,
  }))

  // Streaks
  const streaks = calculateStreaks(entries)

  // Compare to previous period
  let comparedToPrevious: ProgressReportData['comparedToPrevious'] = null
  if (previousEntries.length > 0) {
    const prevWins = previousEntries.filter(e => e.outcome === 'win').length
    const prevWinRate = Math.round((prevWins / previousEntries.length) * 100)
    const prevRMultiples = previousEntries
      .filter(e => e.r_multiple !== null)
      .map(e => e.r_multiple as number)
    const prevAvgR = prevRMultiples.length > 0
      ? Math.round((prevRMultiples.reduce((a, b) => a + b, 0) / prevRMultiples.length) * 100) / 100
      : 0
    comparedToPrevious = {
      winRateChange: winRate - prevWinRate,
      avgRChange: Math.round((avgRMultiple - prevAvgR) * 100) / 100,
    }
  }

  // Strengths and improvement areas
  const strengths = identifyStrengths(entries, winRate, avgRMultiple)
  const improvementAreas = identifyImprovements(entries, winRate, avgRMultiple)

  return {
    totalTrades,
    winRate,
    avgRMultiple,
    bestTrade,
    worstTrade,
    emotionBreakdown,
    rulesFollowed,
    improvementAreas,
    strengths,
    streaks,
    comparedToPrevious,
  }
}

// POST /api/reports/generate - Generate a progress report
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can generate reports' }, { status: 403 })
    }

    const body = await request.json()
    const { classroom_id, student_id, period } = body as {
      classroom_id: string
      student_id: string
      period: 'weekly' | 'monthly'
    }

    if (!classroom_id || !student_id || !period) {
      return NextResponse.json(
        { error: 'Missing required fields: classroom_id, student_id, period' },
        { status: 400 }
      )
    }

    // Verify teacher owns the classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, teacher_id')
      .eq('id', classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found or unauthorized' }, { status: 404 })
    }

    // Calculate period dates
    const now = new Date()
    let periodStart: Date
    let periodEnd: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (period === 'weekly') {
      periodStart = new Date(periodEnd)
      periodStart.setDate(periodStart.getDate() - 7)
    } else {
      periodStart = new Date(periodEnd)
      periodStart.setMonth(periodStart.getMonth() - 1)
    }

    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    // Fetch student's journal entries for this period
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', student_id)
      .eq('classroom_id', classroom_id)
      .gte('trade_date', periodStartStr)
      .lte('trade_date', periodEndStr)
      .order('trade_date', { ascending: true })

    if (entriesError) {
      console.error('Error fetching entries:', entriesError)
      return NextResponse.json({ error: entriesError.message }, { status: 500 })
    }

    // Fetch previous period entries for comparison
    let prevStart: Date
    if (period === 'weekly') {
      prevStart = new Date(periodStart)
      prevStart.setDate(prevStart.getDate() - 7)
    } else {
      prevStart = new Date(periodStart)
      prevStart.setMonth(prevStart.getMonth() - 1)
    }

    const { data: previousEntries } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', student_id)
      .eq('classroom_id', classroom_id)
      .gte('trade_date', prevStart.toISOString().split('T')[0])
      .lt('trade_date', periodStartStr)
      .order('trade_date', { ascending: true })

    // Generate report data
    const reportData = generateReportData(entries || [], previousEntries || [])

    // Look up recommended learning content based on improvement areas
    const improvementTags = reportData.improvementAreas.map(area => {
      if (area.includes('win rate') || area.includes('entry criteria')) return 'entry-criteria'
      if (area.includes('R-multiple') || area.includes('risk')) return 'risk-management'
      if (area.includes('anxiety') || area.includes('fear') || area.includes('emotional')) return 'psychology'
      if (area.includes('greed') || area.includes('take profit')) return 'discipline'
      if (area.includes('frustration') || area.includes('loss management')) return 'psychology'
      if (area.includes('stop loss')) return 'risk-management'
      return null
    }).filter(Boolean) as string[]

    if (improvementTags.length > 0) {
      const { data: recommendedContent } = await supabase
        .from('learn_content')
        .select('id, title, content_type')
        .eq('classroom_id', classroom_id)
        .overlaps('insight_tags', improvementTags)
        .limit(3)

      if (recommendedContent && recommendedContent.length > 0) {
        reportData.recommendedContent = recommendedContent
      }
    }

    // Upsert the report
    const { data: report, error: upsertError } = await supabase
      .from('progress_reports')
      .upsert(
        {
          user_id: student_id,
          classroom_id,
          period_start: periodStartStr,
          period_end: periodEndStr,
          report_data: JSON.parse(JSON.stringify(reportData)) as Json,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,classroom_id,period_start,period_end' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Error upserting report:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/reports/generate - Fetch reports
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, classroom_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const classroomId = searchParams.get('classroom_id')
    const studentId = searchParams.get('student_id')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('progress_reports')
      .select('*')
      .order('period_end', { ascending: false })
      .limit(limit)

    if (profile.role === 'teacher') {
      // Teachers can filter by classroom and student
      if (classroomId) {
        // Verify teacher owns this classroom
        const { data: classroom } = await supabase
          .from('classrooms')
          .select('id')
          .eq('id', classroomId)
          .eq('teacher_id', profile.id)
          .single()

        if (!classroom) {
          return NextResponse.json({ error: 'Not authorized for this classroom' }, { status: 403 })
        }
        query = query.eq('classroom_id', classroomId)
      } else {
        // No classroom specified - restrict to teacher's classrooms only
        const { data: teacherClassrooms } = await supabase
          .from('classrooms')
          .select('id')
          .eq('teacher_id', profile.id)

        const classroomIds = (teacherClassrooms || []).map(c => c.id)
        if (classroomIds.length === 0) {
          return NextResponse.json({ reports: [] })
        }
        query = query.in('classroom_id', classroomIds)
      }
      if (studentId) {
        query = query.eq('user_id', studentId)
      }
    } else {
      // Students can only see their own reports
      query = query.eq('user_id', profile.id)
      if (classroomId) {
        query = query.eq('classroom_id', classroomId)
      }
    }

    const { data: reports, error } = await query

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reports: reports || [] })
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/reports/generate - Update teacher notes
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can update reports' }, { status: 403 })
    }

    const body = await request.json()
    const { report_id, teacher_notes } = body as { report_id: string; teacher_notes: string }

    if (!report_id) {
      return NextResponse.json({ error: 'report_id is required' }, { status: 400 })
    }

    // Verify teacher owns the classroom for this report
    const { data: report } = await supabase
      .from('progress_reports')
      .select('id, classroom_id')
      .eq('id', report_id)
      .single()

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', report.classroom_id)
      .eq('teacher_id', profile.id)
      .single()

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: updatedReport, error: updateError } = await supabase
      .from('progress_reports')
      .update({
        teacher_notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating report:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ report: updatedReport })
  } catch (error) {
    console.error('Reports PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
