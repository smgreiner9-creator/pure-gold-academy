'use client'

interface IconProps {
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  filled?: boolean
  className?: string
}

const sizes = {
  sm: 'text-sm',     // 14px
  md: 'text-xl',     // 20px
  lg: 'text-2xl',    // 24px
  xl: 'text-3xl',    // 30px
}

export function Icon({ name, size = 'md', filled = false, className = '' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${sizes[size]} leading-none ${className}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {name}
    </span>
  )
}
