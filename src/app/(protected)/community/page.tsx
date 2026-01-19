'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { CommunityPost, Profile } from '@/types/database'

export default function CommunityPage() {
  const { profile } = useAuth()
  const [posts, setPosts] = useState<(CommunityPost & { author?: Profile; comment_count?: number })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '' })
  const [isCreating, setIsCreating] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (profile?.id) {
      loadPosts()
    }
  }, [profile?.id, profile?.classroom_id])

  const loadPosts = async () => {
    if (!profile?.id) return

    try {
      // Show all community posts to everyone (open community)
      const query = supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })

      const { data } = await query

      if (data) {
        // Get comment counts
        const postsWithComments = await Promise.all(
          data.map(async (post) => {
            const { count } = await supabase
              .from('community_comments')
              .select('*', { count: 'exact', head: true })
              .eq('post_id', post.id)
            return { ...post, comment_count: count || 0 }
          })
        )
        setPosts(postsWithComments as (CommunityPost & { author?: Profile; comment_count?: number })[])
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createPost = async () => {
    if (!profile?.id || !profile?.classroom_id || !newPost.title.trim() || !newPost.content.trim()) return

    // Check for signal-like content
    const signalPatterns = /buy now|sell now|entry:|tp:|sl:|take profit:|stop loss:|signal|🚀.*buy|📉.*sell/i
    if (signalPatterns.test(newPost.content) || signalPatterns.test(newPost.title)) {
      alert('Signal-based trading advice is not allowed in the community. Please focus on education and discussion.')
      return
    }

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          classroom_id: profile.classroom_id,
          user_id: profile.id,
          title: newPost.title.trim(),
          content: newPost.content.trim(),
        })
        .select('*')
        .single()

      if (error) throw error

      setPosts([{ ...data, comment_count: 0 } as CommunityPost & { author?: Profile; comment_count?: number }, ...posts])
      setNewPost({ title: '', content: '' })
      setShowNewPostModal(false)
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] animate-pulse h-32" />
        ))}
      </div>
    )
  }

  // Determine if user can post (needs to be in a classroom)
  const canPost = !!profile?.classroom_id

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Community</h1>
          <p className="text-[var(--muted)] text-sm">Discuss and learn with fellow traders</p>
        </div>
        {canPost ? (
          <button
            onClick={() => setShowNewPostModal(true)}
            className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all gold-glow text-sm w-fit"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Post
          </button>
        ) : (
          <Link
            href="/classroom/join"
            className="h-10 px-6 rounded-lg flex items-center gap-2 border border-[var(--card-border)] text-[var(--muted)] hover:text-white hover:bg-white/5 transition-all text-sm w-fit"
          >
            <span className="material-symbols-outlined text-sm">group_add</span>
            Join to Post
          </Link>
        )}
      </div>

      {/* Guidelines */}
      <div className="p-4 rounded-2xl border border-[var(--warning)]/20 bg-[var(--warning)]/5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[var(--warning)] shrink-0 mt-0.5">warning</span>
          <div>
            <h4 className="font-semibold text-[var(--warning)]">Community Guidelines</h4>
            <p className="text-sm text-[var(--muted)] mt-1">
              This is an education-focused community. No signal-based trading advice (e.g., &quot;Buy now&quot;, &quot;Entry: X&quot;).
              Focus on learning, strategy discussion, and supporting fellow traders.
            </p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="p-12 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">forum</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No Posts Yet</h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            {canPost ? 'Be the first to start a discussion' : 'Join a classroom to start posting'}
          </p>
          {canPost ? (
            <button
              onClick={() => setShowNewPostModal(true)}
              className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create Post
            </button>
          ) : (
            <Link
              href="/classroom/join"
              className="gold-gradient text-black font-bold h-10 px-6 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-sm">group_add</span>
              Join Classroom
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link key={post.id} href={`/community/${post.id}`}>
              <div className="p-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--gold)]/50 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--gold)] flex items-center justify-center text-black font-bold shrink-0">
                    {(post.author as Profile)?.display_name?.[0] || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold">
                        {(post.author as Profile)?.display_name || (post.author as Profile)?.email || 'User'}
                      </span>
                      {(post.author as Profile)?.role === 'teacher' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                          Teacher
                        </span>
                      )}
                      <span className="text-[var(--card-border)]">•</span>
                      <span className="text-sm text-[var(--muted)]">{formatDate(post.created_at)}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                    <p className="text-[var(--muted)] line-clamp-2 text-sm">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">chat_bubble</span>
                        {post.comment_count} comments
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="p-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Create New Post</h3>
              <button
                onClick={() => setShowNewPostModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-white hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Title
                </label>
                <input
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What's your question or topic?"
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Content
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your thoughts, ask questions, or discuss strategies..."
                  className="w-full bg-black/40 border border-[var(--card-border)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors min-h-[150px] resize-none"
                />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Remember: No signal-based advice. Focus on education and discussion.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="flex-1 py-3 rounded-xl border border-[var(--card-border)] font-semibold hover:bg-white/5 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createPost}
                  disabled={isCreating || !newPost.title.trim() || !newPost.content.trim()}
                  className="flex-1 gold-gradient text-black font-bold py-3 rounded-xl hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreating ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
