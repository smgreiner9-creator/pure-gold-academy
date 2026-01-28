'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Deprecated: Curriculum tracks replaced by topics model
export default function CurriculumTrackRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/teacher/topics') }, [router])
  return null
}
