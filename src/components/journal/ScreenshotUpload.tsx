'use client'

import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface ScreenshotUploadProps {
  userId: string
  screenshots: string[]
  onScreenshotsChange: (urls: string[]) => void
  maxFiles?: number
}

export function ScreenshotUpload({
  userId,
  screenshots,
  onScreenshotsChange,
  maxFiles = 4,
}: ScreenshotUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remainingSlots = maxFiles - screenshots.length
    if (files.length > remainingSlots) {
      setError(`You can only upload ${remainingSlots} more image(s)`)
      return
    }

    setError('')
    setIsUploading(true)

    try {
      const uploadedUrls: string[] = []

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed')
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Images must be less than 5MB')
          continue
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const fileName = `${userId}/journal/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('journal-screenshots')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          // If bucket doesn't exist, show helpful error
          if (uploadError.message.includes('not found')) {
            setError('Storage not configured. Please contact support.')
          } else {
            setError('Failed to upload image. Please try again.')
          }
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('journal-screenshots')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
      }

      if (uploadedUrls.length > 0) {
        onScreenshotsChange([...screenshots, ...uploadedUrls])
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Failed to upload. Please try again.')
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeScreenshot = async (urlToRemove: string) => {
    // Extract filename from URL for deletion
    try {
      const url = new URL(urlToRemove)
      const pathParts = url.pathname.split('/')
      const bucketIndex = pathParts.indexOf('journal-screenshots')
      if (bucketIndex >= 0) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/')
        await supabase.storage.from('journal-screenshots').remove([filePath])
      }
    } catch {
      // Ignore deletion errors, just remove from state
    }

    onScreenshotsChange(screenshots.filter(url => url !== urlToRemove))
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm text-[var(--muted)]">
        Screenshots (optional)
      </label>

      {/* Upload area */}
      {screenshots.length < maxFiles && (
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed border-[var(--card-border)] rounded-lg p-6 text-center transition-colors cursor-pointer hover:border-[var(--gold)] ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={32} className="animate-spin text-[var(--gold)]" />
              <span className="text-sm text-[var(--muted)]">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                <Upload size={24} className="text-[var(--gold)]" />
              </div>
              <span className="text-sm font-medium">Click to upload chart screenshots</span>
              <span className="text-xs text-[var(--muted)]">
                PNG, JPG up to 5MB ({maxFiles - screenshots.length} remaining)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-[var(--danger)]">{error}</p>
      )}

      {/* Preview grid */}
      {screenshots.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {screenshots.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-32 overflow-hidden rounded-lg border border-[var(--card-border)]">
                <Image
                  src={url}
                  alt={`Screenshot ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 200px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <button
                type="button"
                onClick={() => removeScreenshot(url)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger)]"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state hint */}
      {screenshots.length === 0 && !isUploading && (
        <p className="text-xs text-[var(--muted)] flex items-center gap-1">
          <ImageIcon size={12} />
          Add chart screenshots to improve your trade analysis
        </p>
      )}
    </div>
  )
}
