'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Deprecated: Content management replaced by simplified lesson creation
export default function ContentRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/teacher/lessons/new') }, [router])
  return null
}
