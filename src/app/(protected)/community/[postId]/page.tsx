'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import VoteButton from '@/components/community/VoteButton'
import ThreadedComment from '@/components/community/ThreadedComment'
import type { CommentWithMeta } from '@/components/community/ThreadedComment'
import type { CommunityPost, CommunityComment, CommunityVote, Profile } from '@/types/database'
import { formatDate, getCategoryColor, getCategoryLabel } from '@/lib/communityUtils'

type PostWithMeta = CommunityPost & {
  author?: Profile
  score: number
  userVote: 1 | -1 | null
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [post, setPost] = useState<PostWithMeta | null>(null)
  const [comments, setComments] = useState<CommentWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const postId = typeof params.postId === 'string' ? params.postId : Array.isArray(params.postId) ? params.postId[0] : undefined

  const buildCommentTree = useCallback(
    (
      flatComments: CommunityComment[],
      profileMap: Map<string, Profile>,
      voteScoreMap: Map<string, number>,
      userVoteMap: Map<string, 1 | -1>
    ): CommentWithMeta[] => {
      const commentMap = new Map<string, CommentWithMeta>()
      const roots: CommentWithMeta[] = []

      // First pass: create all comment nodes
      flatComments.forEach((c) => {
        commentMap.set(c.id, {
          ...c,
          author: profileMap.get(c.user_id),
          children: [],
          score: voteScoreMap.get(c.id) || 0,
          userVote: userVoteMap.get(c.id) || null,
        })
      })

      // Second pass: build tree
      flatComments.forEach((c) => {
        const node = commentMap.get(c.id)!
        if (c.parent_comment_id) {
          const parent = commentMap.get(c.parent_comment_id)
          if (parent) {
            if (!parent.children) parent.children = []
            parent.children.push(node)
          } else {
            // Orphan — treat as root
            roots.push(node)
          }
        } else {
          roots.push(node)
        }
      })

      return roots
    },
    []
  )

  const loadPost = useCallback(async () => {
    if (!postId || !profile?.id) return

    try {
      // Fetch post
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (postError) throw postError

      // Fetch post author
      const { data: authorData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', postData.user_id)
        .single()

      // Fetch post votes
      const { data: postVotes } = await supabase
        .from('community_votes')
        .select('*')
        .eq('post_id', postId)

      let postScore = 0
      let postUserVote: 1 | -1 | null = null
      if (postVotes) {
        postVotes.forEach((v: CommunityVote) => {
          postScore += v.vote_type
          if (v.user_id === profile.id) {
            const vt = v.vote_type
            if (vt === 1 || vt === -1) {
              postUserVote = vt
            }
          }
        })
      }

      setPost({
        ...postData,
        author: authorData || undefined,
        score: postScore,
        userVote: postUserVote,
      })

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (!commentsData || commentsData.length === 0) {
        setComments([])
        return
      }

      // Fetch comment authors
      const commentAuthorIds = [...new Set(commentsData.map((c) => c.user_id))]
      const { data: commentProfiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', commentAuthorIds)

      const profileMap = new Map<string, Profile>()
      if (commentProfiles) {
        commentProfiles.forEach((p) => profileMap.set(p.id, p))
      }

      // Fetch comment votes
      const commentIds = commentsData.map((c) => c.id)
      const { data: commentVotes } = await supabase
        .from('community_votes')
        .select('*')
        .in('comment_id', commentIds)

      const voteScoreMap = new Map<string, number>()
      const userVoteMap = new Map<string, 1 | -1>()
      if (commentVotes) {
        commentVotes.forEach((v: CommunityVote) => {
          if (v.comment_id) {
            voteScoreMap.set(v.comment_id, (voteScoreMap.get(v.comment_id) || 0) + v.vote_type)
            if (v.user_id === profile.id) {
              const vt = v.vote_type
              if (vt === 1 || vt === -1) {
                userVoteMap.set(v.comment_id, vt)
              }
            }
          }
        })
      }

      const tree = buildCommentTree(commentsData, profileMap, voteScoreMap, userVoteMap)
      setComments(tree)
    } catch (error) {
      console.error('Error loading post:', error)
      router.push('/community')
    } finally {
      setIsLoading(false)
    }
  }, [postId, profile?.id, supabase, router, buildCommentTree])

  useEffect(() => {
    if (postId && profile?.id) {
      loadPost()
    }
  }, [postId, profile?.id, loadPost])

  const handlePostVote = async (voteType: 1 | -1) => {
    if (!profile?.id || !post) return

    const currentVote = post.userVote

    // Optimistic update
    setPost((prev) => {
      if (!prev) return prev
      if (currentVote === voteType) {
        return { ...prev, score: prev.score - voteType, userVote: null }
      } else if (currentVote) {
        return { ...prev, score: prev.score - currentVote + voteType, userVote: voteType }
      } else {
        return { ...prev, score: prev.score + voteType, userVote: voteType }
      }
    })

    try {
      if (currentVote === voteType) {
        await supabase.from('community_votes').delete().eq('user_id', profile.id).eq('post_id', post.id)
      } else if (currentVote) {
        await supabase.from('community_votes').update({ vote_type: voteType }).eq('user_id', profile.id).eq('post_id', post.id)
      } else {
        await supabase.from('community_votes').insert({
          user_id: profile.id,
          post_id: post.id,
          vote_type: voteType,
        })
      }
    } catch (error) {
      console.error('Vote error:', error)
      loadPost()
    }
  }

  const handleCommentVote = async (commentId: string, voteType: 1 | -1) => {
    if (!profile?.id) return

    // Find current vote by traversing tree
    const findVote = (nodes: CommentWithMeta[]): 1 | -1 | null => {
      for (const node of nodes) {
        if (node.id === commentId) return node.userVote
        if (node.children) {
          const found = findVote(node.children)
          if (found !== null) return found
        }
      }
      return null
    }
    const currentVote = findVote(comments)

    // Optimistic update
    const updateTree = (nodes: CommentWithMeta[]): CommentWithMeta[] =>
      nodes.map((node) => {
        if (node.id === commentId) {
          if (currentVote === voteType) {
            return { ...node, score: node.score - voteType, userVote: null }
          } else if (currentVote) {
            return { ...node, score: node.score - currentVote + voteType, userVote: voteType }
          } else {
            return { ...node, score: node.score + voteType, userVote: voteType }
          }
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) }
        }
        return node
      })

    setComments((prev) => updateTree(prev))

    try {
      if (currentVote === voteType) {
        await supabase.from('community_votes').delete().eq('user_id', profile.id).eq('comment_id', commentId)
      } else if (currentVote) {
        await supabase.from('community_votes').update({ vote_type: voteType }).eq('user_id', profile.id).eq('comment_id', commentId)
      } else {
        await supabase.from('community_votes').insert({
          user_id: profile.id,
          comment_id: commentId,
          vote_type: voteType,
        })
      }
    } catch (error) {
      console.error('Comment vote error:', error)
      loadPost()
    }
  }

  const submitComment = async (parentCommentId?: string, content?: string) => {
    const commentContent = content || newComment.trim()
    if (!profile?.id || !postId || !commentContent) return

    const signalPatterns = /buy now|sell now|entry:|tp:|sl:|take profit:|stop loss:|signal/i
    if (signalPatterns.test(commentContent)) {
      alert('Signal-based trading advice is not allowed.')
      return
    }

    if (!parentCommentId) setIsSubmitting(true)

    try {
      const insertData: {
        post_id: string
        user_id: string
        content: string
        parent_comment_id?: string
      } = {
        post_id: postId,
        user_id: profile.id,
        content: commentContent,
      }
      if (parentCommentId) {
        insertData.parent_comment_id = parentCommentId
      }

      const { error } = await supabase
        .from('community_comments')
        .insert(insertData)
        .select('*')
        .single()

      if (error) throw error

      // Refresh comments to get correct tree
      await loadPost()
      if (!parentCommentId) setNewComment('')

      // Notify post author
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
      if (!parentCommentId) setIsSubmitting(false)
    }
  }

  const handleReply = async (parentCommentId: string, content: string) => {
    await submitComment(parentCommentId, content)
  }

  const deleteComment = async (commentId: string) => {
    if (!profile?.id || !confirm('Delete this comment?')) return

    try {
      await supabase.from('community_comments').delete().eq('id', commentId).eq('user_id', profile.id)
      await loadPost()
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const deletePost = async () => {
    if (!profile?.id || !postId || !confirm('Delete this post and all its comments?')) return

    try {
      await supabase.from('community_posts').delete().eq('id', postId).eq('user_id', profile.id)
      router.push('/community')
    } catch (error) {
      console.error('Error deleting post:', error)
    }
  }

  // Count all comments including nested
  const totalComments = useMemo(() => {
    const count = (nodes: CommentWithMeta[]): number => {
      return nodes.reduce((acc, node) => acc + 1 + (node.children ? count(node.children) : 0), 0)
    }
    return count(comments)
  }, [comments])

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="p-6 rounded-2xl glass-surface animate-pulse h-64" />
        <div className="p-6 rounded-2xl glass-surface animate-pulse h-48" />
      </div>
    )
  }

  if (!post) return null

  const isAuthor = profile?.id === post.user_id

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/community')}
          className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Community
        </button>
        {isAuthor && (
          <button
            onClick={deletePost}
            className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--danger)] transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            Delete
          </button>
        )}
      </div>

      {/* Post */}
      <div className="p-6 rounded-2xl glass-surface">
        <div className="flex gap-4">
          {/* Vote */}
          <VoteButton score={post.score} userVote={post.userVote} onVote={handlePostVote} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-[var(--gold)] flex items-center justify-center text-black font-bold shrink-0">
                {post.author?.display_name?.[0] || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {post.author?.display_name || post.author?.email || 'User'}
                  </span>
                  {post.author?.role === 'teacher' && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)]">
                      Teacher
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)]">{formatDate(post.created_at)}</p>
              </div>
              {post.category && post.category !== 'general' && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ml-auto ${getCategoryColor(
                    post.category
                  )}`}
                >
                  {getCategoryLabel(post.category)}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="p-6 rounded-2xl glass-surface">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--gold)]">forum</span>
          Comments ({totalComments})
        </h3>

        {comments.length === 0 ? (
          <p className="text-[var(--muted)] text-center py-6 text-sm">
            No comments yet. Be the first to respond!
          </p>
        ) : (
          <div className="divide-y divide-[var(--glass-surface-border)]">
            {comments.map((comment) => (
              <ThreadedComment
                key={comment.id}
                comment={comment}
                depth={0}
                onReply={handleReply}
                onVote={handleCommentVote}
                onDelete={deleteComment}
                currentUserId={profile?.id}
              />
            ))}
          </div>
        )}

        {/* New Comment Form */}
        <div className="mt-6 pt-4 border-t border-[var(--glass-surface-border)]">
          <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest mb-2 block">
            Add a comment
          </label>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full input-field rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--gold)] text-sm transition-colors min-h-[100px] resize-none mb-3"
          />
          <div className="flex justify-end">
            <button
              onClick={() => submitComment()}
              disabled={isSubmitting || !newComment.trim()}
              className="gold-gradient text-black font-bold h-10 px-6 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">send</span>
                  Comment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
