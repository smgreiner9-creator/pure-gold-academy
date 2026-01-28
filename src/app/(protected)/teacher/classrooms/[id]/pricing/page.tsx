'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Deprecated: Pricing is now inline in topic detail. Redirects to /teacher/topics/[id]
export default function PricingRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => { router.replace(`/teacher/topics/${id}`) }, [id, router])
  return null
}
