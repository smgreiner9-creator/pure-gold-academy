'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { LearnContent, Classroom, ContentType } from '@/types/database'

export default function ContentManagementPage() {
  const { profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState<LearnContent[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    content_type: 'video' as ContentType,
    content_url: '',
    content_text: '',
    is_premium: false,
  })
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id) {
      loadClassrooms()
    }
  }, [profile?.id])

  useEffect(() => {
    if (selectedClassroom) {
      loadContent()
    }
  }, [selectedClassroom])

  const loadClassrooms = async () => {
    if (!profile?.id) return

    const { data } = await supabase
      .from('classrooms')
      .select('*')
      .eq('teacher_id', profile.id)

    if (data && data.length > 0) {
      setClassrooms(data)
      setSelectedClassroom(data[0].id)
    }
    setIsLoading(false)
  }

  const loadContent = async () => {
    const { data } = await supabase
      .from('learn_content')
      .select('*')
      .eq('classroom_id', selectedClassroom)
      .order('order_index', { ascending: true })

    setContent(data || [])
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
    if (!profile?.id || !selectedClassroom || !newContent.title.trim()) return

    setIsAdding(true)
    try {
      const { data, error } = await supabase
        .from('learn_content')
        .insert({
          classroom_id: selectedClassroom,
          teacher_id: profile.id,
          title: newContent.title.trim(),
          description: newContent.description.trim() || null,
          content_type: newContent.content_type,
          content_url: newContent.content_url || null,
          content_text: newContent.content_text || null,
          is_premium: newContent.is_premium,
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
        is_premium: false,
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
          <h3 className="text-xl font-bold mb-2">No Classrooms Yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Create a classroom first to upload content
          </p>
          <a
            href="/teacher/classrooms"
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            Create Classroom
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-[var(--muted)] text-sm">Upload and organize educational content</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Content
          </button>
        </div>
      </div>

      {content.length === 0 ? (
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">description</span>
          </div>
          <h3 className="text-xl font-bold mb-2">No Content Yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            Add videos, PDFs, and articles for your students
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Content
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {content.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]"
            >
              <div className="flex items-center gap-4">
                <div className="text-[var(--muted)] cursor-move">
                  <span className="material-symbols-outlined">drag_indicator</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl text-[var(--gold)]">{getIcon(item.content_type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{item.title}</h3>
                    {item.is_premium && (
                      <span className="text-[9px] px-2 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] font-bold uppercase">
                        Premium
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-[var(--muted)] truncate">{item.description}</p>
                  )}
                </div>
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

              <label className="flex items-center gap-3 p-3 rounded-xl bg-black/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newContent.is_premium}
                  onChange={(e) => setNewContent(prev => ({ ...prev, is_premium: e.target.checked }))}
                  className="w-4 h-4 accent-[var(--gold)]"
                />
                <span className="text-sm">Premium content only</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={addContent}
                  disabled={isAdding || !newContent.title.trim()}
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
    </div>
  )
}
