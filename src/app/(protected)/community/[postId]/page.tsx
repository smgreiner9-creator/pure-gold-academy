'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Textarea } from '@/components/ui'
import { ArrowLeft, MessageSquare, Send, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import type { CommunityPost, CommunityComment, Profile } from '@/types/database'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [post, setPost] = useState<(CommunityPost & { author?: Profile }) | null>(null)
  const [comments, setComments] = useState<(CommunityComment & { author?: Profile })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()

  const postId = typeof params.postId === 'string' ? params.postId : Array.isArray(params.postId) ? params.postId[0] : undefined

  useEffect(() => {
    if (postId) {
      loadPost()
    }
  }, [postId])

  const loadPost = async () => {
    if (!postId) return

    try {
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (postError) throw postError
      setPost(postData as CommunityPost & { author?: Profile })

      const { data: commentsData } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      setComments((commentsData || []) as (CommunityComment & { author?: Profile })[])
    } catch (error) {
      console.error('Error loading post:', error)
      router.push('/community')
    } finally {
      setIsLoading(false)
    }
  }

  const submitComment = async () => {
    if (!profile?.id || !postId || !newComment.trim()) return

    // Check for signal-like content
    const signalPatterns = /buy now|sell now|entry:|tp:|sl:|take profit:|stop loss:|signal/i
    if (signalPatterns.test(newComment)) {
      alert('Signal-based trading advice is not allowed.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          user_id: profile.id,
          content: newComment.trim(),
        })
        .select('*')
        .single()

      if (error) throw error

      setComments([...comments, data as CommunityComment & { author?: Profile }])
      setNewComment('')

      // Notify post author (simplified - in production would look up author separately)
      if (post?.user_id && post.user_id !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          title: 'New Comment',
          message: `${profile.display_name || profile.email} commented on your post`,
          type: 'comment',
          link: `/community/${postId}`,
        })
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return

    try {
      await supabase.from('community_comments').delete().eq('id', commentId)
      setComments(comments.filter(c => c.id !== commentId))
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const deletePost = async () => {
    if (!postId || !confirm('Delete this post and all its comments?')) return

    try {
      await supabase.from('community_posts').delete().eq('id', postId)
      router.push('/community')
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="animate-pulse h-64" />
      </div>
    )
  }

  if (!post) return null

  const isAuthor = profile?.id === (post.author as Profile)?.id

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/community')}>
          <ArrowLeft size={18} />
          Back
        </Button>
        {isAuthor && (
          <Button variant="ghost" onClick={deletePost} className="hover:text-[var(--danger)]">
            <Trash2 size={18} />
            Delete Post
          </Button>
        )}
      </div>

      {/* Post */}
      <Card padding="lg">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-[var(--gold)] flex items-center justify-center text-black font-bold text-lg">
            {(post.author as Profile)?.display_name?.[0] || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">
                {(post.author as Profile)?.display_name || (post.author as Profile)?.email}
              </span>
              {(post.author as Profile)?.role === 'teacher' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
                  Teacher
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--muted)]">{formatDate(post.created_at)}</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
        <p className="whitespace-pre-wrap">{post.content}</p>
      </Card>

      {/* Comments */}
      <Card padding="lg">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-[var(--gold)]" />
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <p className="text-[var(--muted)] text-center py-4">
            No comments yet. Be the first to respond!
          </p>
        ) : (
          <div className="space-y-4 mb-6">
            {comments.map(comment => (
              <div
                key={comment.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-[var(--background)]"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--gold)] flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {(comment.author as Profile)?.display_name?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {(comment.author as Profile)?.display_name || (comment.author as Profile)?.email}
                      </span>
                      {(comment.author as Profile)?.role === 'teacher' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
                          Teacher
                        </span>
                      )}
                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    {profile?.id === (comment.author as Profile)?.id && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="p-1 rounded hover:bg-[var(--danger)]/10 text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Comment */}
        <div className="border-t border-[var(--card-border)] pt-4">
          <Textarea
            id="new-comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="mb-3"
          />
          <div className="flex justify-end">
            <Button
              onClick={submitComment}
              isLoading={isSubmitting}
              disabled={!newComment.trim()}
            >
              <Send size={16} />
              Comment
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
