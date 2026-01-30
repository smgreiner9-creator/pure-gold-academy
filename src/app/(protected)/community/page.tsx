'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import PostFilters, { CATEGORIES } from '@/components/community/PostFilters'
import VoteButton from '@/components/community/VoteButton'
import { formatDate, getCategoryColor, getCategoryLabel } from '@/lib/communityUtils'
import { PageHeader } from '@/components/layout/PageHeader'
import { useActiveClassroomStore } from '@/store/activeClassroom'
import type { CommunityPost, Profile } from '@/types/database'

type PostWithMeta = CommunityPost & {
  author?: Profile
  comment_count: number
  score: number
  userVote: 1 | -1 | null
}

export default function CommunityPage() {
  const { profile } = useAuth()
  const { activeClassroomId, subscribedClassrooms } = useActiveClassroomStore()
  const [posts, setPosts] = useState<PostWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewPostModal, setShowNewPostModal] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'general' })
  const [postClassroomId, setPostClassroomId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSort, setActiveSort] = useState('hot')
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = useMemo(() => createClient(), [])

  // Default post classroom to active classroom
  useEffect(() => {
    if (activeClassroomId && !postClassroomId) {
      setPostClassroomId(activeClassroomId)
    }
  }, [activeClassroomId, postClassroomId])

  const loadPosts = useCallback(async () => {
    if (!profile?.id) return

    try {
      // Determine the user's classroom IDs
      const classroomIds: string[] = []
      if (profile.classroom_id) {
        classroomIds.push(profile.classroom_id)
      }
      const { data: subs } = await supabase
        .from('classroom_subscriptions')
        .select('classroom_id')
        .eq('student_id', profile.id)
        .eq('status', 'active')
      if (subs) {
        subs.forEach((s) => {
          if (!classroomIds.includes(s.classroom_id)) {
            classroomIds.push(s.classroom_id)
          }
        })
      }

      if (classroomIds.length === 0) {
        setPosts([])
        setIsLoading(false)
        return
      }

      const { data } = await supabase
        .from('community_posts')
        .select('*')
        .in('classroom_id', classroomIds)
        .order('created_at', { ascending: false })

      if (!data) return

      // Get all post IDs
      const postIds = data.map((p) => p.id)
      const authorIds = [...new Set(data.map((p) => p.user_id))]

      // Fetch comments, votes, and profiles in parallel
      const [
        { data: allComments },
        { data: allVotes },
        { data: profiles },
      ] = await Promise.all([
        supabase
          .from('community_comments')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('community_votes')
          .select('post_id, user_id, vote_type')
          .in('post_id', postIds),
        supabase
          .from('profiles')
          .select('*')
          .in('id', authorIds),
      ])

      const commentCountsMap = new Map<string, number>()
      ;(allComments || []).forEach((c) => {
        commentCountsMap.set(c.post_id, (commentCountsMap.get(c.post_id) || 0) + 1)
      })

      const profileMap = new Map<string, Profile>()
      if (profiles) {
        profiles.forEach((p) => profileMap.set(p.id, p))
      }

      // Build vote scores and user votes
      const voteScoreMap = new Map<string, number>()
      const userVoteMap = new Map<string, 1 | -1>()
      if (allVotes) {
        allVotes.forEach((v) => {
          if (v.post_id) {
            voteScoreMap.set(v.post_id, (voteScoreMap.get(v.post_id) || 0) + v.vote_type)
            if (v.user_id === profile.id) {
              const vt = v.vote_type
              if (vt === 1 || vt === -1) {
                userVoteMap.set(v.post_id, vt)
              }
            }
          }
        })
      }

      const postsWithMeta: PostWithMeta[] = data.map((post) => ({
        ...post,
        author: profileMap.get(post.user_id),
        comment_count: commentCountsMap.get(post.id) || 0,
        score: voteScoreMap.get(post.id) || 0,
        userVote: userVoteMap.get(post.id) || null,
      }))

      setPosts(postsWithMeta)
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile?.id, profile?.classroom_id, supabase])

  useEffect(() => {
    if (profile?.id) {
      loadPosts()
    }
  }, [profile?.id, loadPosts])

  const handleVote = useCallback(
    async (postId: string, voteType: 1 | -1) => {
      if (!profile?.id) return

      // Find current vote
      const currentPost = posts.find((p) => p.id === postId)
      if (!currentPost) return

      const currentVote = currentPost.userVote

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p
          if (currentVote === voteType) {
            // Remove vote
            return { ...p, score: p.score - voteType, userVote: null }
          } else if (currentVote) {
            // Change vote
            return { ...p, score: p.score - currentVote + voteType, userVote: voteType }
          } else {
            // New vote
            return { ...p, score: p.score + voteType, userVote: voteType }
          }
        })
      )

      try {
        if (currentVote === voteType) {
          // Remove vote
          await supabase
            .from('community_votes')
            .delete()
            .eq('user_id', profile.id)
            .eq('post_id', postId)
        } else if (currentVote) {
          // Update vote
          await supabase
            .from('community_votes')
            .update({ vote_type: voteType })
            .eq('user_id', profile.id)
            .eq('post_id', postId)
        } else {
          // Insert vote
          await supabase.from('community_votes').insert({
            user_id: profile.id,
            post_id: postId,
            vote_type: voteType,
          })
        }
      } catch (error) {
        console.error('Vote error:', error)
        // Revert on error
        loadPosts()
      }
    },
    [profile?.id, posts, supabase, loadPosts]
  )

  const createPost = async () => {
    const targetClassroomId = postClassroomId || activeClassroomId || profile?.classroom_id
    if (!profile?.id || !targetClassroomId || !newPost.title.trim() || !newPost.content.trim()) return

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
          classroom_id: targetClassroomId,
          user_id: profile.id,
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          category: newPost.category,
        })
        .select('*')
        .single()

      if (error) throw error

      const newPostWithMeta: PostWithMeta = {
        ...data,
        author: profile,
        comment_count: 0,
        score: 0,
        userVote: null,
      }
      setPosts((prev) => [newPostWithMeta, ...prev])
      setNewPost({ title: '', content: '', category: 'general' })
      setShowNewPostModal(false)
    } catch (error) {
      console.error('Error creating post:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Filter and sort
  const filteredPosts = useMemo(() => {
    let result = [...posts]

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.author?.display_name?.toLowerCase().includes(q)
      )
    }

    // Sort
    switch (activeSort) {
      case 'hot':
        result.sort((a, b) => {
          // Hot = score weighted by recency
          const ageA = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60)
          const ageB = (Date.now() - new Date(b.created_at).getTime()) / (1000 * 60 * 60)
          const hotA = (a.score + a.comment_count) / Math.pow(ageA + 2, 1.5)
          const hotB = (b.score + b.comment_count) / Math.pow(ageB + 2, 1.5)
          return hotB - hotA
        })
        break
      case 'new':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'top':
        result.sort((a, b) => b.score - a.score)
        break
    }

    return result
  }, [posts, activeCategory, activeSort, searchQuery])

  if (isLoading) {
    return (
      <div className="content-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="col-span-full glass-surface animate-pulse h-32" />
        ))}
      </div>
    )
  }

  const canPost = subscribedClassrooms.length > 0 || !!profile?.classroom_id

  return (
    <>
      <PageHeader
        title="Community"
        subtitle="Discuss and learn with fellow traders"
        action={
          canPost ? (
            <button
              onClick={() => setShowNewPostModal(true)}
              className="btn-gold h-9 px-4 rounded-lg flex items-center gap-1.5 text-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="hidden sm:inline">New Post</span>
            </button>
          ) : (
            <Link
              href="/classroom/join"
              className="btn-glass h-9 px-4 rounded-lg flex items-center gap-1.5 text-[var(--muted)] hover:text-[var(--foreground)] text-sm"
            >
              <span className="material-symbols-outlined text-sm">group_add</span>
              <span className="hidden sm:inline">Join to Post</span>
            </Link>
          )
        }
      />

      <div className="content-grid">

      {/* Guidelines */}
      <div className="col-span-full glass-surface p-4 border-[var(--warning)]/20 bg-[var(--warning)]/5">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[var(--warning)] shrink-0 mt-0.5">warning</span>
          <div>
            <h4 className="font-semibold text-[var(--warning)]">Community Guidelines</h4>
            <p className="text-sm text-[var(--muted)] mt-1">
              This is an education-focused community. No signal-based trading advice (e.g., &quot;Buy now&quot;,
              &quot;Entry: X&quot;). Focus on learning, strategy discussion, and supporting fellow traders.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="col-span-full">
      <PostFilters
        activeCategory={activeCategory}
        activeSort={activeSort}
        searchQuery={searchQuery}
        onCategoryChange={setActiveCategory}
        onSortChange={setActiveSort}
        onSearchChange={setSearchQuery}
      />
      </div>

      {/* Posts */}
      {filteredPosts.length === 0 ? (
        <div className="col-span-full glass-surface p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--gold)]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[var(--gold)]">forum</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {posts.length === 0 ? 'No Posts Yet' : 'No matching posts'}
          </h3>
          <p className="text-[var(--muted)] mb-6 text-sm">
            {posts.length === 0
              ? canPost
                ? 'Be the first to start a discussion'
                : 'Join a classroom to start posting'
              : 'Try adjusting your filters or search query'}
          </p>
          {posts.length === 0 && canPost && (
            <button
              onClick={() => setShowNewPostModal(true)}
              className="btn-gold h-10 px-6 rounded-lg inline-flex items-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create Post
            </button>
          )}
        </div>
      ) : (
        <div className="col-span-full space-y-3">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="glass-surface glass-interactive flex gap-4 p-6"
            >
              {/* Vote buttons */}
              <VoteButton
                score={post.score}
                userVote={post.userVote}
                onVote={(voteType) => handleVote(post.id, voteType)}
              />

              {/* Post content */}
              <Link href={`/community/${post.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <div className="w-6 h-6 rounded-lg bg-[var(--gold)] flex items-center justify-center text-black font-bold text-xs shrink-0">
                    {post.author?.display_name?.[0] || 'U'}
                  </div>
                  <span className="font-semibold text-sm">
                    {post.author?.display_name || post.author?.email || 'User'}
                  </span>
                  {post.author?.role === 'teacher' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                      Teacher
                    </span>
                  )}
                  <span className="text-[var(--glass-surface-border)]">·</span>
                  <span className="text-xs text-[var(--muted)]">{formatDate(post.created_at)}</span>
                  {post.category && post.category !== 'general' && (
                    <>
                      <span className="text-[var(--glass-surface-border)]">·</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${getCategoryColor(
                          post.category
                        )}`}
                      >
                        {getCategoryLabel(post.category)}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-1">{post.title}</h3>
                <p className="text-[var(--muted)] line-clamp-2 text-sm">{post.content}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    {post.comment_count} comments
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-floating p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Create New Post</h3>
              <button
                onClick={() => setShowNewPostModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              {/* Classroom picker (only when user has 2+ classrooms) */}
              {subscribedClassrooms.length >= 2 && (
                <div>
                  <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                    Post to Classroom
                  </label>
                  <select
                    value={postClassroomId || ''}
                    onChange={(e) => setPostClassroomId(e.target.value)}
                    className="input-field w-full text-sm rounded-lg"
                  >
                    {subscribedClassrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setNewPost((prev) => ({ ...prev, category: cat.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        newPost.category === cat.value
                          ? 'glass-elevated text-[var(--gold)]'
                          : 'text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--glass-surface-border)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Title
                </label>
                <input
                  value={newPost.title}
                  onChange={(e) => setNewPost((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="What's your question or topic?"
                  className="input-field w-full text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
                  Content
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your thoughts, ask questions, or discuss strategies..."
                  className="input-field w-full text-sm min-h-[150px] resize-none"
                />
              </div>
              <p className="text-xs text-[var(--muted)]">
                Remember: No signal-based advice. Focus on education and discussion.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="btn-glass flex-1 py-3 rounded-xl font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createPost}
                  disabled={isCreating || !newPost.title.trim() || !newPost.content.trim()}
                  className="btn-gold flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
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
    </>
  )
}
