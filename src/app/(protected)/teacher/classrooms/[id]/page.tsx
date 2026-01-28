'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Deprecated: Redirects to /teacher/topics/[id]
export default function ClassroomDetailRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => { router.replace(`/teacher/topics/${id}`) }, [id, router])
  return null
}
