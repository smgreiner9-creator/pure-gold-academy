'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TeacherFAB() {
  const pathname = usePathname();

  if (!pathname.startsWith('/teacher') || pathname === '/teacher/lessons/new') {
    return null;
  }

  return (
    <Link
      href="/teacher/lessons/new"
      className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 h-12 px-5 gold-gradient rounded-full flex items-center justify-center gap-2 shadow-lg gold-glow hover:scale-105 active:scale-95 transition-transform"
    >
      <span className="material-symbols-outlined text-black text-xl">add</span>
      <span className="text-black font-bold text-sm">Add Lesson</span>
    </Link>
  );
}
