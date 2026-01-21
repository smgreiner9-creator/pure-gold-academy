'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Classroom, Profile, Lesson, ClassroomRule } from '@/types/database'

interface StudentWithStats extends Profile {
  total_trades: number
  win_rate: number
}

export default function ClassroomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const classroomId = params.id as string
  const { profile } = useAuth()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [students, setStudents] = useState<StudentWithStats[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [rules, setRules] = useState<ClassroomRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingVisibility, setIsSavingVisibility] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [lessonForm, setLessonForm] = useState({ title: '', summary: '' })
  const [isSavingLesson, setIsSavingLesson] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [ruleForm, setRuleForm] = useState({ rule_text: '', description: '' })
  const [isSavingRule, setIsSavingRule] = useState(false)
  const [editingRule, setEditingRule] = useState<ClassroomRule | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const loadClassroomData = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Load classroom and students in parallel
      const [classroomRes, studentsRes, journalsRes, lessonsRes, rulesRes] = await Promise.all([
        supabase
          .from('classrooms')
          .select('*')
          .eq('id', classroomId)
          .eq('teacher_id', profile.id)
          .single(),
        supabase
          .from('profiles')
          .select('*')
          .eq('classroom_id', classroomId)
          .eq('role', 'student')
          .order('display_name', { ascending: true }),
        supabase
          .from('journal_entries')
          .select('user_id, outcome')
          .eq('classroom_id', classroomId),
        supabase
          .from('lessons')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('order_index', { ascending: true }),
        supabase
          .from('classroom_rules')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('order_index', { ascending: true })
      ])

      if (classroomRes.data) {
        setClassroom(classroomRes.data)
        setIsPublic(classroomRes.data.is_public)
        setEditForm({
          name: classroomRes.data.name,
          description: classroomRes.data.description || ''
        })
      }

      const studentsData = studentsRes.data || []
      const journalsData = journalsRes.data || []
      setLessons((lessonsRes.data || []) as Lesson[])
      setRules((rulesRes.data || []) as ClassroomRule[])

      // Group journals by student
      const journalsByStudent = new Map<string, typeof journalsData>()
      journalsData.forEach(journal => {
        const existing = journalsByStudent.get(journal.user_id) || []
        existing.push(journal)
        journalsByStudent.set(journal.user_id, existing)
      })

      // Calculate stats for each student
      const studentsWithStats = studentsData.map(student => {
        const journals = journalsByStudent.get(student.id) || []
        const wins = journals.filter(j => j.outcome === 'win').length
        const withOutcome = journals.filter(j => j.outcome).length
        return {
          ...student,
          total_trades: journals.length,
          win_rate: withOutcome > 0 ? (wins / withOutcome) * 100 : 0
        } as StudentWithStats
      })

      setStudents(studentsWithStats)
    } catch (error) {
      console.error('Error loading classroom:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, classroomId, supabase])

  useEffect(() => {
    if (profile?.id && classroomId) {
      loadClassroomData()
    }
  }, [profile?.id, classroomId, loadClassroomData])

  const saveChanges = async () => {
    if (!editForm.name.trim()) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('classrooms')
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null
        })
        .eq('id', classroomId)

      if (error) throw error

      setClassroom(prev => prev ? {
        ...prev,
        name: editForm.name.trim(),
        description: editForm.description.trim() || null
      } : null)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating classroom:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const openLessonModal = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson)
      setLessonForm({
        title: lesson.title,
        summary: lesson.summary || ''
      })
    } else {
      setEditingLesson(null)
      setLessonForm({ title: '', summary: '' })
    }
    setShowLessonModal(true)
  }

  const saveLesson = async () => {
    if (!profile?.id || !lessonForm.title.trim()) return

    setIsSavingLesson(true)
    try {
      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonForm.title.trim(),
            summary: lessonForm.summary.trim() || null,
          })
          .eq('id', editingLesson.id)

        if (error) throw error

        setLessons(lessons.map(lesson =>
          lesson.id === editingLesson.id
            ? { ...lesson, title: lessonForm.title.trim(), summary: lessonForm.summary.trim() || null }
            : lesson
        ))
      } else {
        const { data, error } = await supabase
          .from('lessons')
          .insert({
            classroom_id: classroomId,
            title: lessonForm.title.trim(),
            summary: lessonForm.summary.trim() || null,
            order_index: lessons.length,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setLessons([...lessons, data as Lesson])
        }
      }

      setShowLessonModal(false)
      setEditingLesson(null)
      setLessonForm({ title: '', summary: '' })
    } catch (error) {
      console.error('Error saving lesson:', error)
    } finally {
      setIsSavingLesson(false)
    }
  }

  const deleteLesson = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Delete the lesson "${lessonTitle}"? Content inside will remain but be unassigned.`)) {
      return
    }

    try {
      await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId)

      setLessons(lessons.filter(lesson => lesson.id !== lessonId))
    } catch (error) {
      console.error('Error deleting lesson:', error)
    }
  }

  const openRuleModal = (rule?: ClassroomRule) => {
    if (rule) {
      setEditingRule(rule)
      setRuleForm({
        rule_text: rule.rule_text,
        description: rule.description || ''
      })
    } else {
      setEditingRule(null)
      setRuleForm({ rule_text: '', description: '' })
    }
    setShowRuleModal(true)
  }

  const saveRule = async () => {
    if (!profile?.id || !ruleForm.rule_text.trim()) return

    setIsSavingRule(true)
    try {
      if (editingRule) {
        const { error } = await supabase
          .from('classroom_rules')
          .update({
            rule_text: ruleForm.rule_text.trim(),
            description: ruleForm.description.trim() || null,
          })
          .eq('id', editingRule.id)

        if (error) throw error

        setRules(rules.map(rule =>
          rule.id === editingRule.id
            ? { ...rule, rule_text: ruleForm.rule_text.trim(), description: ruleForm.description.trim() || null }
            : rule
        ))
      } else {
        const { data, error } = await supabase
          .from('classroom_rules')
          .insert({
            classroom_id: classroomId,
            rule_text: ruleForm.rule_text.trim(),
            description: ruleForm.description.trim() || null,
            order_index: rules.length,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setRules([...rules, data as ClassroomRule])
        }
      }

      setShowRuleModal(false)
      setEditingRule(null)
      setRuleForm({ rule_text: '', description: '' })
    } catch (error) {
      console.error('Error saving rule:', error)
    } finally {
      setIsSavingRule(false)
    }
  }

  const deleteRule = async (ruleId: string, ruleText: string) => {
    if (!confirm(`Delete the rule "${ruleText}"?`)) {
      return
    }

    try {
      await supabase
        .from('classroom_rules')
        .delete()
        .eq('id', ruleId)

      setRules(rules.filter(rule => rule.id !== ruleId))
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const removeStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from this classroom? They will lose access to classroom content but their journal entries will be preserved.`)) {
      return
    }

    try {
      await supabase
        .from('profiles')
        .update({ classroom_id: null })
        .eq('id', studentId)

      setStudents(students.filter(s => s.id !== studentId))
    } catch (error) {
      console.error('Error removing student:', error)
    }
  }

  const deleteClassroom = async () => {
    if (!confirm('Are you sure you want to delete this classroom? All students will be removed from it. This action cannot be undone.')) {
      return
    }

    try {
      // First remove all students from classroom
      await supabase
        .from('profiles')
        .update({ classroom_id: null })
        .eq('classroom_id', classroomId)

      // Delete the classroom
      await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroomId)

      router.push('/teacher/classrooms')
    } catch (error) {
      console.error('Error deleting classroom:', error)
    }
  }

  const toggleVisibility = async () => {
    if (!classroom) return
    setIsSavingVisibility(true)
    try {
      const nextValue = !isPublic
      const { error } = await supabase
        .from('classrooms')
        .update({ is_public: nextValue })
        .eq('id', classroom.id)

      if (error) throw error
      setIsPublic(nextValue)
      setClassroom({ ...classroom, is_public: nextValue })
    } catch (error) {
      console.error('Error updating visibility:', error)
    } finally {
      setIsSavingVisibility(false)
    }
  }

  const copyInviteCode = () => {
    if (classroom?.invite_code) {
      navigator.clipboard.writeText(classroom.invite_code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-40" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-20" />
          ))}
        </div>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-4">school</span>
          <h3 className="text-xl font-bold mb-2">Strategy Not Found</h3>
          <p className="text-[var(--muted)] mb-4">This strategy may have been deleted or you don&apos;t have access.</p>
          <Link href="/teacher/classrooms" className="text-[var(--gold)] hover:underline">
            Back to Strategies
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href="/teacher/classrooms"
        className="inline-flex items-center gap-1 text-[var(--muted)] hover:text-white transition-colors text-sm"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Back to Strategies
      </Link>

      {/* Strategy Header */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                Strategy Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
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
                rows={3}
                className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditForm({ name: classroom.name, description: classroom.description || '' })
                }}
                className="h-10 px-4 rounded-lg border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveChanges}
                disabled={isSaving || !editForm.name.trim()}
                className="h-10 px-4 rounded-lg gold-gradient text-black font-bold hover:opacity-90 transition-all text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl text-[var(--gold)]">school</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{classroom.name}</h1>
                {classroom.description && (
                  <p className="text-[var(--muted)] mt-1">{classroom.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-sm text-[var(--muted)]">Invite code:</span>
                  <code className="px-3 py-1.5 rounded-lg bg-black/40 text-[var(--gold)] font-mono text-sm">
                    {classroom.invite_code}
                  </code>
                  <button
                    onClick={copyInviteCode}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    {copiedCode ? (
                      <span className="material-symbols-outlined text-lg text-[var(--success)]">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-lg">content_copy</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleVisibility}
                disabled={isSavingVisibility}
                className="h-10 px-4 rounded-lg border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">
                  {isPublic ? 'public' : 'lock'}
                </span>
                {isPublic ? 'Public' : 'Private'}
              </button>
              <Link
                href={`/teacher/classrooms/${classroomId}/pricing`}
                className="h-10 px-4 rounded-lg border border-[var(--gold)]/30 text-[var(--gold)] font-semibold hover:bg-[var(--gold)]/10 transition-colors text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">payments</span>
                Pricing
              </Link>
              <button
                onClick={() => setIsEditing(true)}
                className="h-10 px-4 rounded-lg border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
              <button
                onClick={deleteClassroom}
                className="h-10 px-4 rounded-lg border border-[var(--danger)]/30 text-[var(--danger)] font-semibold hover:bg-[var(--danger)]/10 transition-colors text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lessons Section */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg">Lessons</h2>
            <p className="text-sm text-[var(--muted)]">Break this strategy into teachable steps.</p>
          </div>
          <button
            onClick={() => openLessonModal()}
            className="gold-gradient text-black font-bold h-10 px-4 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm w-fit"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Lesson
          </button>
        </div>

        {lessons.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-3">menu_book</span>
            <p className="text-[var(--muted)] mb-2">No lessons yet</p>
            <p className="text-sm text-[var(--muted)]">Create your first lesson to start organizing content.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map(lesson => (
              <div
                key={lesson.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-black/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg text-[var(--gold)]">layers</span>
                  </div>
                  <div>
                    <p className="font-semibold">{lesson.title}</p>
                    {lesson.summary && (
                      <p className="text-sm text-[var(--muted)]">{lesson.summary}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/teacher/content?classroomId=${classroomId}&lessonId=${lesson.id}`}
                    className="h-9 px-3 rounded-lg border border-[var(--gold)]/30 text-[var(--gold)] font-semibold hover:bg-[var(--gold)]/10 transition-colors text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    Manage Content
                  </Link>
                  <button
                    onClick={() => openLessonModal(lesson)}
                    className="h-9 px-3 rounded-lg border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteLesson(lesson.id, lesson.title)}
                    className="h-9 px-3 rounded-lg border border-[var(--danger)]/30 text-[var(--danger)] font-semibold hover:bg-[var(--danger)]/10 transition-colors text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strategy Rules Section */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-lg">Strategy Rules</h2>
            <p className="text-sm text-[var(--muted)]">Define the non-negotiables for this strategy.</p>
          </div>
          <button
            onClick={() => openRuleModal()}
            className="gold-gradient text-black font-bold h-10 px-4 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm w-fit"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Rule
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-3">fact_check</span>
            <p className="text-[var(--muted)] mb-2">No rules set</p>
            <p className="text-sm text-[var(--muted)]">Add the core rules students must follow.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div
                key={rule.id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-black/20"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg text-[var(--gold)]">verified</span>
                  </div>
                  <div>
                    <p className="font-semibold">{rule.rule_text}</p>
                    {rule.description && (
                      <p className="text-sm text-[var(--muted)]">{rule.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openRuleModal(rule)}
                    className="h-9 px-3 rounded-lg border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id, rule.rule_text)}
                    className="h-9 px-3 rounded-lg border border-[var(--danger)]/30 text-[var(--danger)] font-semibold hover:bg-[var(--danger)]/10 transition-colors text-xs flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students Section */}
      <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Enrolled Students</h2>
          <span className="text-sm text-[var(--muted)]">{students.length} students</span>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-[var(--muted)] mb-3">group</span>
            <p className="text-[var(--muted)] mb-2">No students enrolled yet</p>
            <p className="text-sm text-[var(--muted)]">
              Share the invite code <code className="text-[var(--gold)]">{classroom.invite_code}</code> with your students
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map(student => (
              <div
                key={student.id}
                className="flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-black/30 transition-colors"
              >
                <Link
                  href={`/teacher/students/${student.id}`}
                  className="flex items-center gap-4 flex-1 group"
                >
                  <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center text-black font-bold shrink-0">
                    {student.display_name?.[0] || student.email[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold group-hover:text-[var(--gold)] transition-colors truncate">
                      {student.display_name || student.email}
                    </p>
                    <p className="text-sm text-[var(--muted)] truncate">{student.email}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold">{student.total_trades} trades</p>
                    <p className={`text-xs font-semibold ${
                      student.win_rate >= 50 ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                    }`}>
                      {student.win_rate.toFixed(0)}% win rate
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      removeStudent(student.id, student.display_name || student.email)
                    }}
                    className="p-2 rounded-lg hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                    title="Remove student"
                  >
                    <span className="material-symbols-outlined text-lg">person_remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      {students.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Total Students</p>
            <p className="text-2xl font-bold text-[var(--gold)]">{students.length}</p>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Total Trades</p>
            <p className="text-2xl font-bold">{students.reduce((sum, s) => sum + s.total_trades, 0)}</p>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Avg Win Rate</p>
            <p className={`text-2xl font-bold ${
              (students.reduce((sum, s) => sum + s.win_rate, 0) / students.length) >= 50
                ? 'text-[var(--success)]'
                : 'text-[var(--danger)]'
            }`}>
              {(students.reduce((sum, s) => sum + s.win_rate, 0) / students.length).toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <h3 className="text-xl font-bold mb-6">{editingLesson ? 'Edit Lesson' : 'Add Lesson'}</h3>
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
                    setEditingLesson(null)
                    setLessonForm({ title: '', summary: '' })
                  }}
                  className="flex-1 h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveLesson}
                  disabled={isSavingLesson || !lessonForm.title.trim()}
                  className="flex-1 gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                >
                  {isSavingLesson && (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  )}
                  Save Lesson
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-8 p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
            <h3 className="text-xl font-bold mb-6">{editingRule ? 'Edit Rule' : 'Add Rule'}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Rule *
                </label>
                <input
                  type="text"
                  value={ruleForm.rule_text}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, rule_text: e.target.value }))}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Explanation
                </label>
                <textarea
                  value={ruleForm.description}
                  onChange={(e) => setRuleForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRuleModal(false)
                    setEditingRule(null)
                    setRuleForm({ rule_text: '', description: '' })
                  }}
                  className="flex-1 h-11 px-6 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRule}
                  disabled={isSavingRule || !ruleForm.rule_text.trim()}
                  className="flex-1 gold-gradient text-black font-bold h-11 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
                >
                  {isSavingRule && (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  )}
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
