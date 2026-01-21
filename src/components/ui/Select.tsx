'use client'

import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options?: { value: string; label: string }[]
  children?: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, id, options, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={`input-field cursor-pointer ${error ? 'border-[var(--danger)]' : ''} ${className}`}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
