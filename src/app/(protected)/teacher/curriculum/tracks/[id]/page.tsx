'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Input, Textarea } from '@/components/ui'
import {
  ArrowLeft,
  Plus,
  Layers,
  Pencil,
  Trash2,
  GripVertical,
  FileText
} from 'lucide-react'
import type { CurriculumTrack, TrackModule } from '@/types/database'

export default function TrackDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const trackId = params.id as string

  const [track, setTrack] = useState<CurriculumTrack | null>(null)
  const [modules, setModules] = useState<(TrackModule & { content?: { count: number }[] })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [editingModule, setEditingModule] = useState<TrackModule | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({ title: '', summary: '' })

  const supabase = useMemo(() => createClient(), [])

  const loadData = useCallback(async () => {
    if (!profile?.id || !trackId) return

    try {
      // Load track
      const { data: trackData } = await supabase
        .from('curriculum_tracks')
        .select('*')
        .eq('id', trackId)
        .single()

      if (!trackData) {
        router.push('/teacher/curriculum')
        return
      }

      setTrack(trackData)

      // Load modules with content count
      const { data: moduleData } = await supabase
        .from('track_modules')
        .select('*, content:learn_content(count)')
        .eq('track_id', trackId)
        .order('order_index')

      // Type assertion needed until Supabase types are regenerated after migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setModules((moduleData || []) as any)
    } catch (error) {
      console.error('Error loading track data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, trackId, supabase, router])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id, loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const endpoint = '/api/curriculum/modules'
      const method = editingModule ? 'PATCH' : 'POST'
      const body = editingModule
        ? { id: editingModule.id, ...formData }
        : { track_id: trackId, ...formData }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error('Failed to save module')

      setShowModuleForm(false)
      setEditingModule(null)
      setFormData({ title: '', summary: '' })
      loadData()
    } catch (error) {
      console.error('Error saving module:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (module: TrackModule) => {
    setEditingModule(module)
    setFormData({ title: module.title, summary: module.summary || '' })
    setShowModuleForm(true)
  }

  const handleDelete = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? Content will be unlinked but not deleted.')) return

    try {
      const res = await fetch(`/api/curriculum/modules?id=${moduleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadData()
    } catch (error) {
      console.error('Error deleting module:', error)
    }
  }

  const cancelForm = () => {
    setShowModuleForm(false)
    setEditingModule(null)
    setFormData({ title: '', summary: '' })
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-[var(--card-border)] rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-20 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="text-center py-12">
          <p className="text-[var(--muted)]">Track not found</p>
          <Link href="/teacher/curriculum">
            <Button variant="ghost" className="mt-4">Back to Curriculum</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/teacher/curriculum">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{track.name}</h1>
          <p className="text-[var(--muted)]">{track.description || 'No description'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-[var(--muted)] mb-1">Modules</p>
          <p className="text-2xl font-bold">{modules.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)] mb-1">Total Content</p>
          <p className="text-2xl font-bold">
            {modules.reduce((sum, m) => sum + (m.content?.[0]?.count || 0), 0)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)] mb-1">Difficulty</p>
          <p className="text-2xl font-bold capitalize">{track.difficulty_level}</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--muted)] mb-1">Status</p>
          <p className={`text-2xl font-bold ${track.is_published ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}>
            {track.is_published ? 'Published' : 'Draft'}
          </p>
        </Card>
      </div>

      {/* Module Form Modal */}
      {showModuleForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold">
                {editingModule ? 'Edit Module' : 'Add Module'}
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1">Module Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Introduction to Risk Management"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Summary (Optional)</label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Brief description of what this module covers..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={cancelForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="flex-1">
                  {editingModule ? 'Update' : 'Add Module'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modules List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modules</h2>
          <Button size="sm" onClick={() => setShowModuleForm(true)}>
            <Plus size={16} />
            Add Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <Card className="text-center py-8">
            <Layers size={40} className="mx-auto mb-3 text-[var(--muted)]" />
            <p className="text-[var(--muted)] mb-3">No modules yet</p>
            <Button size="sm" onClick={() => setShowModuleForm(true)}>
              <Plus size={16} />
              Add First Module
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {modules.map((module, index) => {
              const contentCount = module.content?.[0]?.count || 0

              return (
                <Card key={module.id} className="flex items-center gap-3">
                  {/* Drag handle (visual only for now) */}
                  <div className="text-[var(--muted)] cursor-grab">
                    <GripVertical size={18} />
                  </div>

                  {/* Order number */}
                  <div className="w-8 h-8 rounded-full bg-[var(--card-border)] flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>

                  {/* Module info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{module.title}</h3>
                    {module.summary && (
                      <p className="text-sm text-[var(--muted)] line-clamp-1">{module.summary}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-1">
                      <FileText size={12} />
                      <span>{contentCount} content items</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(module)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(module.id)}>
                      <Trash2 size={14} className="text-[var(--danger)]" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      <Card className="bg-[var(--card-bg)]">
        <h3 className="font-semibold mb-2">Module Tips</h3>
        <ul className="text-sm text-[var(--muted)] space-y-1 list-disc list-inside">
          <li>Order modules in a logical learning sequence</li>
          <li>Keep modules focused on specific topics</li>
          <li>Add content to modules through the Content Manager</li>
          <li>Aim for 3-7 content items per module</li>
        </ul>
      </Card>
    </div>
  )
}
