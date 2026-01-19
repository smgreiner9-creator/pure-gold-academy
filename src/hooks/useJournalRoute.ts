'use client'

import { usePathname } from 'next/navigation'

const JOURNAL_ROUTES = ['/dashboard', '/journal']

export function useJournalRoute() {
  const pathname = usePathname()
  return JOURNAL_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))
}
