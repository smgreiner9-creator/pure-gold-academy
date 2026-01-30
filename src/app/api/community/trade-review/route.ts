import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

interface TradeReviewBody {
  journal_entry_id: string
  title?: string
  content: string
  privacy: {
    showPnl: boolean
    showEmotions: boolean
    showChart: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.classroom_id) {
      return NextResponse.json({ error: 'You must be in a classroom to share trade reviews' }, { status: 403 })
    }

    const body: TradeReviewBody = await request.json()
    const { journal_entry_id, title, content, privacy } = body

    if (!journal_entry_id || !content) {
      return NextResponse.json({ error: 'journal_entry_id and content are required' }, { status: 400 })
    }

    // Fetch the journal entry and verify ownership
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', journal_entry_id)
      .eq('user_id', profile.id)
      .single()

    if (entryError || !entry) {
      return NextResponse.json({ error: 'Journal entry not found or you do not own it' }, { status: 404 })
    }

    // Check if this entry has already been shared
    const { data: existingPost } = await supabase
      .from('community_posts')
      .select('id')
      .eq('journal_entry_id', journal_entry_id)
      .eq('user_id', profile.id)
      .limit(1)

    if (existingPost && existingPost.length > 0) {
      return NextResponse.json({ error: 'This journal entry has already been shared' }, { status: 409 })
    }

    // Build shared journal data based on privacy settings
    const sharedData: { [key: string]: Json | undefined } = {
      instrument: entry.instrument,
      direction: entry.direction,
      entry_price: entry.entry_price,
      exit_price: entry.exit_price,
      outcome: entry.outcome,
      r_multiple: entry.r_multiple,
      stop_loss: entry.stop_loss,
      take_profit: entry.take_profit,
      trade_date: entry.trade_date,
      position_size: entry.position_size,
    }

    if (privacy.showPnl) {
      sharedData.pnl = entry.pnl
    }

    if (privacy.showEmotions) {
      sharedData.emotion_before = entry.emotion_before
      sharedData.emotion_during = entry.emotion_during
      sharedData.emotion_after = entry.emotion_after
    }

    if (privacy.showChart && entry.chart_data) {
      sharedData.chart_data = entry.chart_data as Json
    }

    // Generate title if not provided
    const postTitle = title || `${entry.instrument} ${entry.direction.toUpperCase()} — ${entry.outcome ? entry.outcome.charAt(0).toUpperCase() + entry.outcome.slice(1) : 'Open'}`

    // Create the community post
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .insert({
        classroom_id: profile.classroom_id,
        user_id: profile.id,
        title: postTitle,
        content,
        category: 'trade-review',
        tags: [entry.instrument, entry.direction, entry.outcome || 'open'],
        post_type: 'trade_review',
        shared_journal_data: sharedData as Json,
        journal_entry_id,
      })
      .select('*')
      .single()

    if (postError) {
      console.error('Error creating trade review post:', postError)
      return NextResponse.json({ error: 'Failed to create trade review post' }, { status: 500 })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Trade review API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
