'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Deprecated: Redirects to /teacher/topics
export default function ClassroomsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/teacher/topics') }, [router])
  return null
}
