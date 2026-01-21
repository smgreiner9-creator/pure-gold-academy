'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { LearnContent, Classroom, ContentType, Lesson } from '@/types/database'

const UNASSIGNED_LESSON_ID = 'unassigned'

export default function ContentManagementPage() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState<LearnContent[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [selectedLesson, setSelectedLesson] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [editingContent, setEditingContent] = useState<LearnContent | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingLesson, setIsSavingLesson] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    content_type: 'video' as ContentType,
    content_url: '',
    content_text: '',
    explanation: '',
    is_premium: false,
    is_individually_priced: false,
    price: '',
  })
  const [lessonForm, setLessonForm] = useState({ title: '', summary: '' })
  const [editForm, setEditForm] = useState({
    lesson_id: '',
    title: '',
    description: '',
    content_url: '',
    content_text: '',
    explanation: '',
    is_premium: false,
    is_individually_priced: false,
    price: '',
  })
  const supabase = useMemo(() => createClient(), [])
  const preferredClassroomId = searchParams.get('classroomId')
  const preferredLessonId = searchParams.get('lessonId')

  const loadClassrooms = useCallback(async () => {
    if (!profile?.id) return

    const [classroomsRes, stripeRes] = await Promise.all([
      supabase
        .from('classrooms')
        .select('*')
        .eq('teacher_id', profile.id),
      supabase
        .from('teacher_stripe_accounts')
        .select('charges_enabled')
        .eq('teacher_id', profile.id)
        .single()
    ])

    if (classroomsRes.data && classroomsRes.data.length > 0) {
      const classroomsData = classroomsRes.data
      setClassrooms(classroomsData)
      const initialClassroom = preferredClassroomId && classroomsData.some(c => c.id === preferredClassroomId)
        ? preferredClassroomId
        : classroomsData[0].id
      setSelectedClassroom(initialClassroom)
    }
    setStripeConnected(stripeRes.data?.charges_enabled === true)
    setIsLoading(false)
  }, [profile?.id, preferredClassroomId, supabase])

  const loadLessons = useCallback(async () => {
    if (!selectedClassroom) return

    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('classroom_id', selectedClassroom)
      .order('order_index', { ascending: true })

    const lessonData = data || []
    setLessons(lessonData as Lesson[])

    if (lessonData.length === 0) {
      setSelectedLesson('')
      return
    }

    const preferredLesson = preferredLessonId && lessonData.some(l => l.id === preferredLessonId)
      ? preferredLessonId
      : null

    if (preferredLesson) {
      setSelectedLesson(preferredLesson)
      return
    }

    if (!lessonData.some(l => l.id === selectedLesson)) {
      setSelectedLesson(lessonData[0].id)
    }
  }, [preferredLessonId, selectedClassroom, selectedLesson, supabase])

  const loadContent = useCallback(async () => {
    if (!selectedClassroom) return

    let query = supabase
      .from('learn_content')
      .select('*')
      .eq('classroom_id', selectedClassroom)

    if (selectedLesson === UNASSIGNED_LESSON_ID) {
      query = query.is('lesson_id', null)
    } else if (selectedLesson) {
      query = query.eq('lesson_id', selectedLesson)
    } else {
      setContent([])
      return
    }

    const { data } = await query.order('order_index', { ascending: true })

    setContent(data || [])
  }, [selectedClassroom, selectedLesson, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadClassrooms()
    }
  }, [profile?.id, loadClassrooms])

  useEffect(() => {
    if (selectedClassroom) {
      loadLessons()
    } else {
      setLessons([])
      setSelectedLesson('')
    }
  }, [selectedClassroom, loadLessons])

  useEffect(() => {
    if (selectedClassroom && selectedLesson) {
      loadContent()
    } else if (selectedClassroom && selectedLesson === UNASSIGNED_LESSON_ID) {
      loadContent()
    } else {
      setContent([])
    }
  }, [selectedClassroom, selectedLesson, loadContent])

  const createLesson = async () => {
    if (!profile?.id || !selectedClassroom || !lessonForm.title.trim()) return

    setIsSavingLesson(true)
    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          classroom_id: selectedClassroom,
          title: lessonForm.title.trim(),
          summary: lessonForm.summary.trim() || null,
          order_index: lessons.length,
        })
        .select()
        .single()

      if (error) throw error
      if (data) {
        const updatedLessons = [...lessons, data as Lesson]
        setLessons(updatedLessons)
        setSelectedLesson(data.id)
      }
      setLessonForm({ title: '', summary: '' })
      setShowLessonModal(false)
    } catch (error) {
      console.error('Error creating lesson:', error)
    } finally {
      setIsSavingLesson(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('learn-content')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('learn-content')
        .getPublicUrl(fileName)

      setNewContent(prev => ({ ...prev, content_url: publicUrl }))
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const addContent = async () => {
    if (
      !profile?.id ||
      !selectedClassroom ||
      !selectedLesson ||
      selectedLesson === UNASSIGNED_LESSON_ID ||
      !newContent.title.trim()
    ) return
    if (newContent.content_type === 'image' && !newContent.explanation.trim()) return

    setIsAdding(true)
    try {
      const price = newContent.is_individually_priced ? parseFloat(newContent.price) || 0 : 0
      const { data, error } = await supabase
        .from('learn_content')
        .insert({
          classroom_id: selectedClassroom,
          teacher_id: profile.id,
          lesson_id: selectedLesson,
          title: newContent.title.trim(),
          description: newContent.description.trim() || null,
          explanation: newContent.explanation.trim() || null,
          content_type: newContent.content_type,
          content_url: newContent.content_url || null,
          content_text: newContent.content_text || null,
          is_premium: newContent.is_premium,
          is_individually_priced: newContent.is_individually_priced && price > 0,
          price: price,
          order_index: content.length,
        })
        .select()
        .single()

      if (error) throw error

      setContent([...content, data])
      setNewContent({
        title: '',
        description: '',
        content_type: 'video',
        content_url: '',
        content_text: '',
        explanation: '',
        is_premium: false,
        is_individually_priced: false,
        price: '',
      })
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding content:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const deleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return

    try {
      await supabase.from('learn_content').delete().eq('id', id)
      setContent(content.filter(c => c.id !== id))
    } catch (error) {
      console.error('Error deleting content:', error)
    }
  }

  const openEditModal = (item: LearnContent) => {
    setEditingContent(item)
    setEditForm({
      lesson_id: item.lesson_id || lessons[0]?.id || '',
      title: item.title,
      description: item.description || '',
      content_url: item.content_url || '',
      content_text: item.content_text || '',
      explanation: item.explanation || '',
      is_premium: item.is_premium,
      is_individually_priced: item.is_individually_priced,
      price: item.price?.toString() || '',
    })
    setShowEditModal(true)
  }

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('learn-content')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('learn-content')
        .getPublicUrl(fileName)

      setEditForm(prev => ({ ...prev, content_url: publicUrl }))
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const saveEditChanges = async () => {
    if (!editingContent || !editForm.title.trim()) return
    if (!editForm.lesson_id) return
    if (editingContent.content_type === 'image' && !editForm.explanation.trim()) return

    setIsSaving(true)
    try {
      const price = editForm.is_individually_priced ? parseFloat(editForm.price) || 0 : 0
      const { error } = await supabase
        .from('learn_content')
        .update({
          lesson_id: editForm.lesson_id,
          title: editForm.title.trim(),
          description: editForm.description.trim() || null,
          content_url: editForm.content_url || null,
          content_text: editForm.content_text || null,
          explanation: editForm.explanation.trim() || null,
          is_premium: editForm.is_premium,
          is_individually_priced: editForm.is_individually_priced && price > 0,
          price: price,
        })
        .eq('id', editingContent.id)

      if (error) throw error

      setContent(content.map(c =>
        c.id === editingContent.id
          ? {
              ...c,
              ...editForm,
              description: editForm.description || null,
              explanation: editForm.explanation || null,
              is_individually_priced: editForm.is_individually_priced && price > 0,
              price: price,
            }
          : c
      ))
      setShowEditModal(false)
      setEditingContent(null)
    } catch (error) {
      console.error('Error saving content:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newContent = [...content]
    const draggedItem = newContent[draggedIndex]
    newContent.splice(draggedIndex, 1)
    newContent.splice(index, 0, draggedItem)
    setContent(newContent)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    // Save new order to database
    try {
      await Promise.all(
        content.map((item, index) =>
          supabase
            .from('learn_content')
            .update({ order_index: index })
            .eq('id', item.id)
        )
      )
    } catch (error) {
      console.error('Error saving order:', error)
      // Reload content on error to restore original order
      loadContent()
    }

    setDraggedIndex(null)
  }

  const getIcon = (type: ContentType) => {
    switch (type) {
      case 'video': return 'play_circle'
      case 'pdf': return 'description'
      case 'image': return 'image'
      case 'text': return 'article'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-64" />
      </div>
    )
  }

  if (classrooms.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">description</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Strategies Yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Create a strategy first to add lessons and content
          </p>
          <Link
            href="/teacher/classrooms"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            Create Strategy
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-[var(--muted)] text-sm">Upload and organize content by lesson</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
            disabled={lessons.length === 0}
          >
            {lessons.length === 0 ? (
              <option value="">No lessons yet</option>
            ) : (
              <>
                {lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                ))}
                <option value={UNASSIGNED_LESSON_ID}>Unassigned content</option>
              </>
            )}
          </select>
          <button
            onClick={() => setShowLessonModal(true)}
            className="h-10 px-4 rounded-lg border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">library_add</span>
            Add Lesson
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={lessons.length === 0 || selectedLesson === UNASSIGNED_LESSON_ID}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Content
          </button>
        </div>
      </div>

      {lessons.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">layers</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Create a Lesson First</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Lessons help students follow your strategy step by step.
          </p>
          <button
            onClick={() => setShowLessonModal(true)}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">library_add</span>
            Add Lesson
          </button>
        </div>
      ) : content.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">description</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Content Yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Add videos, PDFs, images, and articles for this lesson
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={selectedLesson === UNASSIGNED_LESSON_ID}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Content
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {content.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`p-4 rounded-2xl border bg-[var(--card-bg)] transition-all ${
                draggedIndex === index
                  ? 'border-[var(--gold)] opacity-50'
                  : 'border-[var(--card-border)]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-[var(--muted)] cursor-grab active:cursor-grabbing">
                  <span className="material-symbols-outlined">drag_indicator</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl text-[var(--gold)]">{getIcon(item.content_type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{item.title}</h3>
                    {item.is_premium && (
                      <span className="text-[9px] px-2 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] font-bold uppercase">
                        Premium
                      </span>
                    )}
                    {item.is_individually_priced && item.price > 0 && (
                      <span className="text-[9px] px-2 py-0.5 rounded-lg bg-[var(--success)]/10 text-[var(--success)] font-bold">
                        ${item.price}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-[var(--muted)] truncate">{item.description}</p>
                  )}
                </div>
                <button
                  onClick={() => openEditModal(item)}
                  className="p-2 rounded-lg hover:bg-white/5 text-[var(--muted)] hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button
                  onClick={() => deleteContent(item.id)}
                  className="p-2 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <h3 className="text-xl font-bold mb-6">Add Lesson</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Summary
                </label>
                <textarea
                  value={lessonForm.summary}
                  onChange={(e) => setLessonForm(prev => ({ ...prev, summary: e.target.value }))}
                  rows={3}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowLessonModal(false)
                    setLessonForm({ title: '', summary: '' })
                  }}
                  className="flex-1 h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createLesson}
                  disabled={isSavingLesson || !lessonForm.title.trim()}
                  className="flex-1 gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                >
                  {isSavingLesson ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : null}
                  Add Lesson
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <h3 className="text-xl font-bold mb-6">Add New Content</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Title *
                </label>
                <input
                  type="text"
                  value={newContent.title}
                  onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Content title"
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Description
                </label>
                <textarea
                  value={newContent.description}
                  onChange={(e) => setNewContent(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the content"
                  rows={2}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Content Type
                </label>
                <select
                  value={newContent.content_type}
                  onChange={(e) => setNewContent(prev => ({ ...prev, content_type: e.target.value as ContentType }))}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                >
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="image">Image</option>
                  <option value="text">Text/Article</option>
                </select>
              </div>

              {newContent.content_type === 'text' ? (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                    Content
                  </label>
                  <textarea
                    value={newContent.content_text}
                    onChange={(e) => setNewContent(prev => ({ ...prev, content_text: e.target.value }))}
                    placeholder="Write your article content here..."
                    rows={8}
                    className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                    Content URL or File
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newContent.content_url}
                      onChange={(e) => setNewContent(prev => ({ ...prev, content_url: e.target.value }))}
                      placeholder="https://... or upload below"
                      className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={
                        newContent.content_type === 'video' ? 'video/*' :
                        newContent.content_type === 'pdf' ? 'application/pdf' :
                        newContent.content_type === 'image' ? 'image/*' : '*/*'
                      }
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-lg">upload</span>
                      )}
                      Upload File
                    </button>
                  </div>
                </div>
              )}

              {newContent.content_type === 'image' && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                    Explanation *
                  </label>
                  <textarea
                    value={newContent.explanation}
                    onChange={(e) => setNewContent(prev => ({ ...prev, explanation: e.target.value }))}
                    placeholder="Explain the chart or image context..."
                    rows={4}
                    className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 p-3 rounded-xl bg-black/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newContent.is_premium}
                  onChange={(e) => setNewContent(prev => ({ ...prev, is_premium: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--gold)]"
                />
                <span className="text-sm">Premium content only</span>
              </label>

              {/* Individual Pricing */}
              <div className="space-y-3 p-4 rounded-xl bg-black/20">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newContent.is_individually_priced}
                    onChange={(e) => setNewContent(prev => ({ ...prev, is_individually_priced: e.target.checked }))}
                    disabled={!stripeConnected}
                    className="w-4 h-4 accent-[var(--gold)]"
                  />
                  <span className="text-sm">Sell this content individually</span>
                </label>
                {!stripeConnected && (
                  <p className="text-xs text-[var(--warning)]">
                    Connect Stripe in Settings to enable individual content sales
                  </p>
                )}
                {newContent.is_individually_priced && stripeConnected && (
                  <div>
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                      Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                      <input
                        type="number"
                        value={newContent.price}
                        onChange={(e) => setNewContent(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        min="1"
                        step="0.01"
                        className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                      />
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-2">
                      One-time purchase. 15% platform fee applies.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addContent}
                  disabled={
                    isAdding ||
                    !newContent.title.trim() ||
                    (newContent.content_type === 'image' && !newContent.explanation.trim())
                  }
                  className="flex-1 gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                >
                  {isAdding ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : null}
                  Add Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingContent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <h3 className="text-xl font-bold mb-6">Edit Content</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Lesson *
                </label>
                <select
                  value={editForm.lesson_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lesson_id: e.target.value }))}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                >
                  {lessons.map(lesson => (
                    <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Title *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                />
              </div>

              {editingContent.content_type === 'text' ? (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                    Content
                  </label>
                  <textarea
                    value={editForm.content_text}
                    onChange={(e) => setEditForm(prev => ({ ...prev, content_text: e.target.value }))}
                    rows={8}
                    className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                    Content URL
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.content_url}
                      onChange={(e) => setEditForm(prev => ({ ...prev, content_url: e.target.value }))}
                      className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                    />
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept={
                        editingContent.content_type === 'video' ? 'video/*' :
                        editingContent.content_type === 'pdf' ? 'application/pdf' :
                        editingContent.content_type === 'image' ? 'image/*' : '*/*'
                      }
                      onChange={handleEditFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-lg">upload</span>
                      )}
                      Upload New File
                    </button>
                  </div>
                </div>
              )}

              {editingContent.content_type === 'image' && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                    Explanation *
                  </label>
                  <textarea
                    value={editForm.explanation}
                    onChange={(e) => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                    rows={4}
                    className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 p-3 rounded-xl bg-black/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.is_premium}
                  onChange={(e) => setEditForm(prev => ({ ...prev, is_premium: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--gold)]"
                />
                <span className="text-sm">Premium content only</span>
              </label>

              {/* Individual Pricing */}
              <div className="space-y-3 p-4 rounded-xl bg-black/20">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_individually_priced}
                    onChange={(e) => setEditForm(prev => ({ ...prev, is_individually_priced: e.target.checked }))}
                    disabled={!stripeConnected}
                    className="w-4 h-4 accent-[var(--gold)]"
                  />
                  <span className="text-sm">Sell this content individually</span>
                </label>
                {!stripeConnected && (
                  <p className="text-xs text-[var(--warning)]">
                    Connect Stripe in Settings to enable individual content sales
                  </p>
                )}
                {editForm.is_individually_priced && stripeConnected && (
                  <div>
                    <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                      Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        min="1"
                        step="0.01"
                        className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                      />
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-2">
                      One-time purchase. 15% platform fee applies.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingContent(null)
                  }}
                  className="flex-1 h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditChanges}
                  disabled={
                    isSaving ||
                    !editForm.title.trim() ||
                    !editForm.lesson_id ||
                    (editingContent.content_type === 'image' && !editForm.explanation.trim())
                  }
                  className="flex-1 gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : null}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
