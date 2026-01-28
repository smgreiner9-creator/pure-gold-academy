'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Deprecated: Strategy wizard replaced by simplified lesson creation
export default function StrategyNewRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/teacher/lessons/new') }, [router])
  return null
}
