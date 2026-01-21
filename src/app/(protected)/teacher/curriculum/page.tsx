'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button, Input, Select, Textarea } from '@/components/ui'
import {
  Plus,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Layers
} from 'lucide-react'
import type { CurriculumTrack, Classroom, DifficultyLevel } from '@/types/database'

const difficultyColors: Record<DifficultyLevel, string> = {
  beginner: 'bg-green-500/20 text-green-500',
  intermediate: 'bg-yellow-500/20 text-yellow-500',
  advanced: 'bg-red-500/20 text-red-500',
}

const difficultyLabels: Record<DifficultyLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export default function TeacherCurriculumPage() {
  const { profile } = useAuth()
  const [tracks, setTracks] = useState<(CurriculumTrack & { modules?: { count: number }[] })[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTrack, setEditingTrack] = useState<CurriculumTrack | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    difficulty_level: 'beginner' as DifficultyLevel,
    estimated_hours: '',
    icon: '',
  })

  const loadData = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Load classrooms
      const { data: classroomData } = await supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id)

      setClassrooms(classroomData || [])

      if (classroomData && classroomData.length > 0) {
        const defaultClassroom = selectedClassroom || classroomData[0].id
        if (!selectedClassroom) {
          setSelectedClassroom(defaultClassroom)
        }

        // Load tracks for selected classroom
        const { data: trackData } = await supabase
          .from('curriculum_tracks')
          .select('*, modules:track_modules(count)')
          .eq('classroom_id', defaultClassroom)
          .order('order_index')

        // Type assertion needed until Supabase types are regenerated after migration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTracks((trackData || []) as any)
      }
    } catch (error) {
      console.error('Error loading curriculum data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, selectedClassroom, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id, loadData])

  const handleClassroomChange = async (classroomId: string) => {
    setSelectedClassroom(classroomId)
    setIsLoading(true)

    const { data: trackData } = await supabase
      .from('curriculum_tracks')
      .select('*, modules:track_modules(count)')
      .eq('classroom_id', classroomId)
      .order('order_index')

    // Type assertion needed until Supabase types are regenerated after migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTracks((trackData || []) as any)
    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassroom) return

    setIsSubmitting(true)

    try {
      const endpoint = '/api/curriculum/tracks'
      const method = editingTrack ? 'PATCH' : 'POST'
      const body = editingTrack
        ? { id: editingTrack.id, ...formData, estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null }
        : { classroom_id: selectedClassroom, ...formData, estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        throw new Error('Failed to save track')
      }

      setShowCreateForm(false)
      setEditingTrack(null)
      setFormData({ name: '', description: '', difficulty_level: 'beginner', estimated_hours: '', icon: '' })
      loadData()
    } catch (error) {
      console.error('Error saving track:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (track: CurriculumTrack) => {
    setEditingTrack(track)
    setFormData({
      name: track.name,
      description: track.description || '',
      difficulty_level: track.difficulty_level,
      estimated_hours: track.estimated_hours?.toString() || '',
      icon: track.icon || '',
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track? All modules and content associations will be removed.')) return

    try {
      const res = await fetch(`/api/curriculum/tracks?id=${trackId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      loadData()
    } catch (error) {
      console.error('Error deleting track:', error)
    }
  }

  const handleTogglePublish = async (track: CurriculumTrack) => {
    try {
      const res = await fetch('/api/curriculum/tracks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: track.id, is_published: !track.is_published }),
      })
      if (!res.ok) throw new Error('Failed to update')
      loadData()
    } catch (error) {
      console.error('Error toggling publish:', error)
    }
  }

  const cancelForm = () => {
    setShowCreateForm(false)
    setEditingTrack(null)
    setFormData({ name: '', description: '', difficulty_level: 'beginner', estimated_hours: '', icon: '' })
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-[var(--card-border)] rounded animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (classrooms.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card className="text-center py-12">
          <GraduationCap size={48} className="mx-auto mb-4 text-[var(--muted)]" />
          <h2 className="text-xl font-semibold mb-2">Create a Strategy First</h2>
          <p className="text-[var(--muted)] mb-4">
            You need to create a trading strategy before you can build a curriculum.
          </p>
          <Link href="/teacher/strategy/new">
            <Button>Create Strategy</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Curriculum</h1>
          <p className="text-[var(--muted)]">Build structured learning tracks for your students</p>
        </div>
        <div className="flex items-center gap-3">
          {classrooms.length > 1 && (
            <Select
              value={selectedClassroom}
              onChange={(e) => handleClassroomChange(e.target.value)}
              className="w-48"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          )}
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus size={18} />
            New Track
          </Button>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold">
                {editingTrack ? 'Edit Track' : 'Create Learning Track'}
              </h3>

              <div>
                <label className="block text-sm font-medium mb-1">Track Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Beginner Foundations"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will students learn in this track?"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <Select
                    value={formData.difficulty_level}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value as DifficultyLevel }))}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Est. Hours</label>
                  <Input
                    type="number"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    placeholder="e.g., 10"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={cancelForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting} className="flex-1">
                  {editingTrack ? 'Update Track' : 'Create Track'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Tracks List */}
      {tracks.length === 0 ? (
        <Card className="text-center py-12">
          <BookOpen size={48} className="mx-auto mb-4 text-[var(--muted)]" />
          <h2 className="text-xl font-semibold mb-2">No Learning Tracks Yet</h2>
          <p className="text-[var(--muted)] mb-4">
            Create learning tracks to organize your content into structured paths.
          </p>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus size={18} />
            Create First Track
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {tracks.map((track, index) => {
            const moduleCount = track.modules?.[0]?.count || 0

            return (
              <Card key={track.id} className="relative overflow-hidden">
                <div className="flex items-start gap-4">
                  {/* Order indicator */}
                  <div className="flex flex-col items-center gap-1 text-[var(--muted)]">
                    <span className="text-xs">#{index + 1}</span>
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{track.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[track.difficulty_level]}`}>
                        {difficultyLabels[track.difficulty_level]}
                      </span>
                      {!track.is_published && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--muted)]/20 text-[var(--muted)]">
                          Draft
                        </span>
                      )}
                    </div>

                    {track.description && (
                      <p className="text-sm text-[var(--muted)] mb-2 line-clamp-2">{track.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Layers size={14} />
                        {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
                      </span>
                      {track.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {track.estimated_hours} hours
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(track)}
                      title={track.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {track.is_published ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(track)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(track.id)}
                    >
                      <Trash2 size={16} className="text-[var(--danger)]" />
                    </Button>
                    <Link href={`/teacher/curriculum/tracks/${track.id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                        <ChevronRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info card */}
      <Card className="bg-[var(--card-bg)]">
        <h3 className="font-semibold mb-2">Building an Effective Curriculum</h3>
        <ul className="text-sm text-[var(--muted)] space-y-1 list-disc list-inside">
          <li>Start with foundational concepts in a beginner track</li>
          <li>Break tracks into focused modules (e.g., &quot;Risk Management&quot;, &quot;Chart Patterns&quot;)</li>
          <li>Add content to modules to create a clear learning path</li>
          <li>Use prerequisites to ensure students learn in the right order</li>
          <li>Publish tracks when they&apos;re ready for students to access</li>
        </ul>
      </Card>
    </div>
  )
}
