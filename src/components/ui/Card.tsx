'use client'

import { HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  tier?: 'surface' | 'elevated' | 'floating'
  interactive?: boolean
  shimmer?: boolean
}

const tierClasses = {
  surface: 'glass-surface',
  elevated: 'glass-elevated',
  floating: 'glass-floating',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', padding = 'md', tier = 'surface', interactive = false, shimmer = false, children, ...props }, ref) => {
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-7',
    }

    const classes = [
      tierClasses[tier],
      paddings[padding],
      interactive ? 'glass-interactive' : '',
      shimmer ? 'glass-shimmer' : '',
      className,
    ].filter(Boolean).join(' ')

    return (
      <div
        ref={ref}
        className={classes}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
