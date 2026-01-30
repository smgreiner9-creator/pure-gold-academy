import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('classrooms')
    .select(
      'id, name, description, tagline, trading_style, markets, logo_url, is_paid, teacher:profiles!teacher_id(display_name, avatar_url, slug)'
    )
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ courses: data })
}
