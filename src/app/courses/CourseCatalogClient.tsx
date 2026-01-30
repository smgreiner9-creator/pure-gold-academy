'use client'

import { useState, useMemo } from 'react'
import CourseCard, { type CourseCardProps } from '@/components/marketplace/CourseCard'
import CourseFilters from '@/components/marketplace/CourseFilters'

export interface CourseData {
  course: CourseCardProps['course']
  teacher: CourseCardProps['teacher']
  lessonCount: number
  studentCount: number
  avgRating: number
  reviewCount: number
  price: number | null
}

interface CourseCatalogClientProps {
  courses: CourseData[]
}

export default function CourseCatalogClient({ courses }: CourseCatalogClientProps) {
  const [search, setSearch] = useState('')
  const [activeMarket, setActiveMarket] = useState<string | null>(null)
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null)
  const [activePriceType, setActivePriceType] = useState<'all' | 'free' | 'paid'>('all')
  const [activeSort, setActiveSort] = useState<'popular' | 'newest' | 'rating' | 'price_low' | 'price_high'>('popular')

  const filteredAndSorted = useMemo(() => {
    let result = [...courses]

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.course.name.toLowerCase().includes(q) ||
          c.course.description?.toLowerCase().includes(q) ||
          c.course.tagline?.toLowerCase().includes(q) ||
          c.teacher.display_name?.toLowerCase().includes(q)
      )
    }

    // Market filter
    if (activeMarket) {
      const marketLower = activeMarket.toLowerCase()
      result = result.filter(
        (c) =>
          c.course.markets &&
          c.course.markets.some((m) => m.toLowerCase() === marketLower)
      )
    }

    // Price filter
    if (activePriceType === 'free') {
      result = result.filter((c) => !c.course.is_paid)
    } else if (activePriceType === 'paid') {
      result = result.filter((c) => c.course.is_paid)
    }

    // Sort
    switch (activeSort) {
      case 'popular':
        result.sort((a, b) => b.studentCount - a.studentCount)
        break
      case 'newest':
        // Already sorted by created_at desc from server
        break
      case 'rating':
        result.sort((a, b) => b.avgRating - a.avgRating)
        break
      case 'price_low':
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
        break
      case 'price_high':
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        break
    }

    return result
  }, [courses, search, activeMarket, activePriceType, activeSort])

  return (
    <div>
      {/* Filters */}
      <div className="mb-8">
        <CourseFilters
          onSearch={setSearch}
          onMarketFilter={setActiveMarket}
          onDifficultyFilter={setActiveDifficulty}
          onPriceFilter={setActivePriceType}
          onSortChange={setActiveSort}
          activeMarket={activeMarket}
          activeDifficulty={activeDifficulty}
          activePriceType={activePriceType}
          activeSort={activeSort}
        />
      </div>

      {/* Results */}
      {filteredAndSorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map((courseData) => (
            <CourseCard
              key={courseData.course.id}
              course={courseData.course}
              teacher={courseData.teacher}
              lessonCount={courseData.lessonCount}
              studentCount={courseData.studentCount}
              avgRating={courseData.avgRating}
              reviewCount={courseData.reviewCount}
              price={courseData.price}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-[var(--muted)] mb-4 block">
            search_off
          </span>
          <h2 className="text-xl font-semibold mb-2">No courses match your filters</h2>
          <p className="text-[var(--muted)] text-sm max-w-md mx-auto">
            Try adjusting your search or filter criteria to find what you&apos;re looking for.
          </p>
        </div>
      )}
    </div>
  )
}
