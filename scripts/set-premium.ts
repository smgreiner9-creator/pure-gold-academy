/**
 * Quick script to set a user to premium for testing
 *
 * Usage: npx tsx scripts/set-premium.ts your-email@example.com
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const email = process.argv[2]

if (!email) {
  console.error('Usage: npx tsx scripts/set-premium.ts <email>')
  process.exit(1)
}

async function setPremium() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('profiles')
    .update({ subscription_tier: 'premium' })
    .eq('email', email)
    .select()
    .single()

  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }

  console.log(`✅ User ${email} is now premium!`)
  console.log('Profile:', data)
}

setPremium()
