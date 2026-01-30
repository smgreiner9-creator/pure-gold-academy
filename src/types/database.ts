export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'teacher' | 'admin'
export type SubscriptionTier = 'free' | 'premium'
export type EmotionType = 'calm' | 'confident' | 'anxious' | 'fearful' | 'greedy' | 'frustrated' | 'neutral'
export type TradeDirection = 'long' | 'short'
export type TradeOutcome = 'win' | 'loss' | 'breakeven'
export type ContentType = 'video' | 'pdf' | 'image' | 'text' | 'youtube' | 'tradingview'
export type TradeCallStatus = 'active' | 'hit_tp1' | 'hit_tp2' | 'hit_tp3' | 'hit_sl' | 'manual_close' | 'cancelled'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type LiveSessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'
export type PricingType = 'free' | 'paid'
export type LessonContentType = 'video' | 'chart' | 'pdf' | 'text'
export type LessonStatus = 'draft' | 'published'
export type JournalEntryStatus = 'draft' | 'published'
export type SetupType = 'breakout' | 'pullback' | 'reversal' | 'range' | 'trend_continuation' | 'news' | 'custom'

export interface OnboardingState {
  trades_logged: number
  first_trade_at: string | null
  insights_unlocked: boolean
  community_unlocked: boolean
  completed_at: string | null
  instruments?: string[]
  trading_rules?: string[]
  current_level?: number
  last_level_up_at?: string | null
}
export type ClassroomSubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'suspended' | 'past_due'
export type PurchaseStatus = 'pending' | 'completed' | 'refunded' | 'failed'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          role: UserRole
          subscription_tier: SubscriptionTier
          classroom_id: string | null
          current_track_id: string | null
          bio: string | null
          social_links: Json | null
          slug: string | null
          onboarding_state: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          subscription_tier?: SubscriptionTier
          classroom_id?: string | null
          current_track_id?: string | null
          bio?: string | null
          social_links?: Json | null
          slug?: string | null
          onboarding_state?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          subscription_tier?: SubscriptionTier
          classroom_id?: string | null
          current_track_id?: string | null
          bio?: string | null
          social_links?: Json | null
          slug?: string | null
          onboarding_state?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      classrooms: {
        Row: {
          id: string
          teacher_id: string
          name: string
          description: string | null
          invite_code: string
          journaling_rules: Json
          is_public: boolean
          is_paid: boolean
          tagline: string | null
          logo_url: string | null
          banner_url: string | null
          trading_style: string | null
          markets: string[] | null
          trade_calls_enabled: boolean
          live_sessions_enabled: boolean
          curriculum_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          name: string
          description?: string | null
          invite_code?: string
          journaling_rules?: Json
          is_public?: boolean
          is_paid?: boolean
          tagline?: string | null
          logo_url?: string | null
          banner_url?: string | null
          trading_style?: string | null
          markets?: string[] | null
          trade_calls_enabled?: boolean
          live_sessions_enabled?: boolean
          curriculum_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          name?: string
          description?: string | null
          invite_code?: string
          journaling_rules?: Json
          is_public?: boolean
          is_paid?: boolean
          tagline?: string | null
          logo_url?: string | null
          banner_url?: string | null
          trading_style?: string | null
          markets?: string[] | null
          trade_calls_enabled?: boolean
          live_sessions_enabled?: boolean
          curriculum_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          classroom_id: string | null
          instrument: string
          direction: TradeDirection
          entry_price: number
          exit_price: number | null
          position_size: number
          stop_loss: number | null
          take_profit: number | null
          r_multiple: number | null
          pnl: number | null
          outcome: TradeOutcome | null
          emotion_before: EmotionType
          emotion_during: EmotionType | null
          emotion_after: EmotionType | null
          rules_followed: Json
          notes: string | null
          screenshot_urls: string[]
          chart_data: Json | null
          pre_trade_mindset: Json | null
          trade_date: string
          entry_time: string | null
          exit_time: string | null
          status: JournalEntryStatus
          trade_call_id: string | null
          setup_type: SetupType | null
          setup_type_custom: string | null
          execution_rating: number | null
          reflection_notes: string | null
          custom_tags: string[]
          import_source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          classroom_id?: string | null
          instrument: string
          direction: TradeDirection
          entry_price: number
          exit_price?: number | null
          position_size: number
          stop_loss?: number | null
          take_profit?: number | null
          r_multiple?: number | null
          pnl?: number | null
          outcome?: TradeOutcome | null
          emotion_before: EmotionType
          emotion_during?: EmotionType | null
          emotion_after?: EmotionType | null
          rules_followed?: Json
          notes?: string | null
          screenshot_urls?: string[]
          chart_data?: Json | null
          pre_trade_mindset?: Json | null
          trade_date: string
          entry_time?: string | null
          exit_time?: string | null
          status?: JournalEntryStatus
          trade_call_id?: string | null
          setup_type?: SetupType | null
          setup_type_custom?: string | null
          execution_rating?: number | null
          reflection_notes?: string | null
          custom_tags?: string[]
          import_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          classroom_id?: string | null
          instrument?: string
          direction?: TradeDirection
          entry_price?: number
          exit_price?: number | null
          position_size?: number
          stop_loss?: number | null
          take_profit?: number | null
          r_multiple?: number | null
          pnl?: number | null
          outcome?: TradeOutcome | null
          emotion_before?: EmotionType
          emotion_during?: EmotionType | null
          emotion_after?: EmotionType | null
          rules_followed?: Json
          notes?: string | null
          screenshot_urls?: string[]
          chart_data?: Json | null
          pre_trade_mindset?: Json | null
          trade_date?: string
          entry_time?: string | null
          exit_time?: string | null
          status?: JournalEntryStatus
          trade_call_id?: string | null
          setup_type?: SetupType | null
          setup_type_custom?: string | null
          execution_rating?: number | null
          reflection_notes?: string | null
          custom_tags?: string[]
          import_source?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_focus: {
        Row: {
          id: string
          user_id: string
          week_start: string
          focus_text: string
          focus_type: string
          improvement_score: number | null
          reviewed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          focus_text: string
          focus_type: string
          improvement_score?: number | null
          reviewed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          focus_text?: string
          focus_type?: string
          improvement_score?: number | null
          reviewed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      journal_feedback: {
        Row: {
          id: string
          journal_entry_id: string
          teacher_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          journal_entry_id: string
          teacher_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          journal_entry_id?: string
          teacher_id?: string
          content?: string
          created_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          id: string
          classroom_id: string
          title: string
          summary: string | null
          order_index: number
          content_type: LessonContentType | null
          content_url: string | null
          content_text: string | null
          explanation: string
          status: LessonStatus
          attachment_urls: string[]
          teacher_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          title: string
          summary?: string | null
          order_index?: number
          content_type?: LessonContentType | null
          content_url?: string | null
          content_text?: string | null
          explanation?: string
          status?: LessonStatus
          attachment_urls?: string[]
          teacher_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          title?: string
          summary?: string | null
          order_index?: number
          content_type?: LessonContentType | null
          content_url?: string | null
          content_text?: string | null
          explanation?: string
          status?: LessonStatus
          attachment_urls?: string[]
          teacher_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      classroom_rules: {
        Row: {
          id: string
          classroom_id: string
          rule_text: string
          description: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          rule_text: string
          description?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          rule_text?: string
          description?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      learn_content: {
        Row: {
          id: string
          classroom_id: string
          teacher_id: string
          lesson_id: string | null
          module_id: string | null
          title: string
          description: string | null
          explanation: string | null
          content_type: ContentType
          content_url: string | null
          content_text: string | null
          order_index: number
          is_premium: boolean
          is_individually_priced: boolean
          price: number
          insight_tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          teacher_id: string
          lesson_id?: string | null
          module_id?: string | null
          title: string
          description?: string | null
          explanation?: string | null
          content_type: ContentType
          content_url?: string | null
          content_text?: string | null
          order_index?: number
          is_premium?: boolean
          is_individually_priced?: boolean
          price?: number
          insight_tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          teacher_id?: string
          lesson_id?: string | null
          module_id?: string | null
          title?: string
          description?: string | null
          explanation?: string | null
          content_type?: ContentType
          content_url?: string | null
          content_text?: string | null
          order_index?: number
          is_premium?: boolean
          is_individually_priced?: boolean
          price?: number
          insight_tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      learn_progress: {
        Row: {
          id: string
          user_id: string
          content_id: string
          completed: boolean
          progress_percent: number
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          completed?: boolean
          progress_percent?: number
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          completed?: boolean
          progress_percent?: number
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          id: string
          classroom_id: string
          user_id: string
          title: string
          content: string
          category: string
          tags: string[]
          post_type: string
          shared_journal_data: Json | null
          journal_entry_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          user_id: string
          title: string
          content: string
          category?: string
          tags?: string[]
          post_type?: string
          shared_journal_data?: Json | null
          journal_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          user_id?: string
          title?: string
          content?: string
          category?: string
          tags?: string[]
          post_type?: string
          shared_journal_data?: Json | null
          journal_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_comment_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_comment_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          parent_comment_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      community_votes: {
        Row: {
          id: string
          user_id: string
          post_id: string | null
          comment_id: string | null
          vote_type: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id?: string | null
          comment_id?: string | null
          vote_type: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string | null
          comment_id?: string | null
          vote_type?: number
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          read?: boolean
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          read?: boolean
          link?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: SubscriptionTier
          status: string
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: SubscriptionTier
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: SubscriptionTier
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      watched_instruments: {
        Row: {
          id: string
          user_id: string
          symbol: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      teacher_stripe_accounts: {
        Row: {
          id: string
          teacher_id: string
          stripe_account_id: string | null
          charges_enabled: boolean
          payouts_enabled: boolean
          onboarding_complete: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          stripe_account_id?: string | null
          charges_enabled?: boolean
          payouts_enabled?: boolean
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          stripe_account_id?: string | null
          charges_enabled?: boolean
          payouts_enabled?: boolean
          onboarding_complete?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      classroom_pricing: {
        Row: {
          id: string
          classroom_id: string
          pricing_type: PricingType
          monthly_price: number
          currency: string
          stripe_price_id: string | null
          trial_days: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          pricing_type?: PricingType
          monthly_price?: number
          currency?: string
          stripe_price_id?: string | null
          trial_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          pricing_type?: PricingType
          monthly_price?: number
          currency?: string
          stripe_price_id?: string | null
          trial_days?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      classroom_subscriptions: {
        Row: {
          id: string
          student_id: string
          classroom_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: ClassroomSubscriptionStatus
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          classroom_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: ClassroomSubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          classroom_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: ClassroomSubscriptionStatus
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_purchases: {
        Row: {
          id: string
          student_id: string
          content_id: string
          stripe_payment_intent_id: string | null
          amount: number
          currency: string
          platform_fee: number
          teacher_payout: number
          status: PurchaseStatus
          purchased_at: string
        }
        Insert: {
          id?: string
          student_id: string
          content_id: string
          stripe_payment_intent_id?: string | null
          amount: number
          currency?: string
          platform_fee: number
          teacher_payout: number
          status?: PurchaseStatus
          purchased_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          content_id?: string
          stripe_payment_intent_id?: string | null
          amount?: number
          currency?: string
          platform_fee?: number
          teacher_payout?: number
          status?: PurchaseStatus
          purchased_at?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          id: string
          user_id: string
          check_date: string
          has_traded: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          check_date: string
          has_traded?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          check_date?: string
          has_traded?: boolean
          created_at?: string
        }
        Relationships: []
      }
      trade_calls: {
        Row: {
          id: string
          classroom_id: string
          teacher_id: string
          instrument: string
          direction: TradeDirection
          entry_price: number
          stop_loss: number
          take_profit_1: number | null
          take_profit_2: number | null
          take_profit_3: number | null
          risk_reward_ratio: number | null
          timeframe: string | null
          analysis_text: string | null
          chart_url: string | null
          status: TradeCallStatus
          actual_exit_price: number | null
          result_pips: number | null
          result_percent: number | null
          closed_at: string | null
          close_notes: string | null
          published_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          teacher_id: string
          instrument: string
          direction: TradeDirection
          entry_price: number
          stop_loss: number
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          risk_reward_ratio?: number | null
          timeframe?: string | null
          analysis_text?: string | null
          chart_url?: string | null
          status?: TradeCallStatus
          actual_exit_price?: number | null
          result_pips?: number | null
          result_percent?: number | null
          closed_at?: string | null
          close_notes?: string | null
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          teacher_id?: string
          instrument?: string
          direction?: TradeDirection
          entry_price?: number
          stop_loss?: number
          take_profit_1?: number | null
          take_profit_2?: number | null
          take_profit_3?: number | null
          risk_reward_ratio?: number | null
          timeframe?: string | null
          analysis_text?: string | null
          chart_url?: string | null
          status?: TradeCallStatus
          actual_exit_price?: number | null
          result_pips?: number | null
          result_percent?: number | null
          closed_at?: string | null
          close_notes?: string | null
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trade_call_follows: {
        Row: {
          id: string
          trade_call_id: string
          student_id: string
          journal_entry_id: string | null
          followed_at: string
        }
        Insert: {
          id?: string
          trade_call_id: string
          student_id: string
          journal_entry_id?: string | null
          followed_at?: string
        }
        Update: {
          id?: string
          trade_call_id?: string
          student_id?: string
          journal_entry_id?: string | null
          followed_at?: string
        }
        Relationships: []
      }
      curriculum_tracks: {
        Row: {
          id: string
          classroom_id: string
          name: string
          description: string | null
          difficulty_level: DifficultyLevel
          order_index: number
          is_published: boolean
          prerequisite_track_id: string | null
          estimated_hours: number | null
          icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          name: string
          description?: string | null
          difficulty_level?: DifficultyLevel
          order_index?: number
          is_published?: boolean
          prerequisite_track_id?: string | null
          estimated_hours?: number | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          name?: string
          description?: string | null
          difficulty_level?: DifficultyLevel
          order_index?: number
          is_published?: boolean
          prerequisite_track_id?: string | null
          estimated_hours?: number | null
          icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_modules: {
        Row: {
          id: string
          track_id: string
          title: string
          summary: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          track_id: string
          title: string
          summary?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          track_id?: string
          title?: string
          summary?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      track_progress: {
        Row: {
          id: string
          user_id: string
          track_id: string
          started_at: string
          completed_at: string | null
          current_module_id: string | null
          progress_percent: number
        }
        Insert: {
          id?: string
          user_id: string
          track_id: string
          started_at?: string
          completed_at?: string | null
          current_module_id?: string | null
          progress_percent?: number
        }
        Update: {
          id?: string
          user_id?: string
          track_id?: string
          started_at?: string
          completed_at?: string | null
          current_module_id?: string | null
          progress_percent?: number
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          id: string
          classroom_id: string
          teacher_id: string
          title: string
          description: string | null
          scheduled_start: string
          scheduled_duration_minutes: number
          actual_start: string | null
          actual_end: string | null
          status: LiveSessionStatus
          stream_url: string | null
          recording_url: string | null
          thumbnail_url: string | null
          max_attendees: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          classroom_id: string
          teacher_id: string
          title: string
          description?: string | null
          scheduled_start: string
          scheduled_duration_minutes?: number
          actual_start?: string | null
          actual_end?: string | null
          status?: LiveSessionStatus
          stream_url?: string | null
          recording_url?: string | null
          thumbnail_url?: string | null
          max_attendees?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          classroom_id?: string
          teacher_id?: string
          title?: string
          description?: string | null
          scheduled_start?: string
          scheduled_duration_minutes?: number
          actual_start?: string | null
          actual_end?: string | null
          status?: LiveSessionStatus
          stream_url?: string | null
          recording_url?: string | null
          thumbnail_url?: string | null
          max_attendees?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_attendees: {
        Row: {
          id: string
          session_id: string
          user_id: string
          joined_at: string
          left_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          joined_at?: string
          left_at?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          joined_at?: string
          left_at?: string | null
        }
        Relationships: []
      }
      topic_reviews: {
        Row: {
          id: string
          student_id: string
          classroom_id: string
          rating: number
          review_text: string | null
          teacher_response: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          classroom_id: string
          rating: number
          review_text?: string | null
          teacher_response?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          classroom_id?: string
          rating?: number
          review_text?: string | null
          teacher_response?: string | null
          created_at?: string
        }
        Relationships: []
      }
      progress_reports: {
        Row: {
          id: string
          user_id: string
          classroom_id: string
          period_start: string
          period_end: string
          report_data: Json
          teacher_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          classroom_id: string
          period_start: string
          period_end: string
          report_data?: Json
          teacher_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          classroom_id?: string
          period_start?: string
          period_end?: string
          report_data?: Json
          teacher_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_digests: {
        Row: {
          id: string
          user_id: string
          week_start: string
          week_end: string
          digest_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          week_end: string
          digest_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          week_end?: string
          digest_data?: Json
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: UserRole
      subscription_tier: SubscriptionTier
      emotion_type: EmotionType
      trade_direction: TradeDirection
      trade_outcome: TradeOutcome
      content_type: ContentType
      pricing_type: PricingType
      classroom_subscription_status: ClassroomSubscriptionStatus
      purchase_status: PurchaseStatus
      trade_call_status: TradeCallStatus
      difficulty_level: DifficultyLevel
      live_session_status: LiveSessionStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Classroom = Database['public']['Tables']['classrooms']['Row']
export type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
export type JournalFeedback = Database['public']['Tables']['journal_feedback']['Row']
export type Lesson = Database['public']['Tables']['lessons']['Row']
export type ClassroomRule = Database['public']['Tables']['classroom_rules']['Row']
export type LearnContent = Database['public']['Tables']['learn_content']['Row']
export type LearnProgress = Database['public']['Tables']['learn_progress']['Row']
export type CommunityPost = Database['public']['Tables']['community_posts']['Row']
export type CommunityComment = Database['public']['Tables']['community_comments']['Row']
export type CommunityVote = Database['public']['Tables']['community_votes']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type WatchedInstrument = Database['public']['Tables']['watched_instruments']['Row']

// Teacher pricing types
export type TeacherStripeAccount = Database['public']['Tables']['teacher_stripe_accounts']['Row']
export type ClassroomPricing = Database['public']['Tables']['classroom_pricing']['Row']
export type ClassroomSubscription = Database['public']['Tables']['classroom_subscriptions']['Row']
export type ContentPurchase = Database['public']['Tables']['content_purchases']['Row']

// Daily check-in type
export type DailyCheckin = Database['public']['Tables']['daily_checkins']['Row']

// Trade Calls types
export type TradeCall = Database['public']['Tables']['trade_calls']['Row']
export type TradeCallFollow = Database['public']['Tables']['trade_call_follows']['Row']

// Curriculum types
export type CurriculumTrack = Database['public']['Tables']['curriculum_tracks']['Row']
export type TrackModule = Database['public']['Tables']['track_modules']['Row']
export type TrackProgress = Database['public']['Tables']['track_progress']['Row']

// Live Sessions types
export type LiveSession = Database['public']['Tables']['live_sessions']['Row']
export type SessionAttendee = Database['public']['Tables']['session_attendees']['Row']

// Extended types with relations
export type TradeCallWithTeacher = TradeCall & {
  teacher?: Profile
}

export type CurriculumTrackWithModules = CurriculumTrack & {
  modules?: TrackModule[]
  content_count?: number
}

export type TrackModuleWithContent = TrackModule & {
  content?: LearnContent[]
}

export type LiveSessionWithTeacher = LiveSession & {
  teacher?: Profile
  attendee_count?: number
}

// Topic is a simplified alias for Classroom in the new teacher flow
export type Topic = Classroom

// Extended lesson type with topic info
export type LessonWithTopic = Lesson & {
  classroom?: Classroom
}

// Topic Reviews
export type TopicReview = Database['public']['Tables']['topic_reviews']['Row']

// Progress Reports
export type ProgressReport = Database['public']['Tables']['progress_reports']['Row']

// Report data shape
export interface RecommendedContent {
  id: string
  title: string
  content_type: ContentType
}

export interface ProgressReportData {
  totalTrades: number
  winRate: number
  avgRMultiple: number
  bestTrade: { instrument: string; rMultiple: number; pnl: number } | null
  worstTrade: { instrument: string; rMultiple: number; pnl: number } | null
  emotionBreakdown: {
    before: Record<string, number>
    during: Record<string, number>
    after: Record<string, number>
  }
  rulesFollowed: { rule: string; count: number; total: number }[]
  improvementAreas: string[]
  strengths: string[]
  streaks: { currentWin: number; currentLoss: number; bestWin: number }
  comparedToPrevious: { winRateChange: number; avgRChange: number } | null
  recommendedContent?: RecommendedContent[]
}

// Weekly Focus type
export type WeeklyFocus = Database['public']['Tables']['weekly_focus']['Row']

// Consistency Score breakdown
export interface ConsistencyScoreBreakdown {
  ruleAdherence: number    // 0-100, weight 40%
  riskManagement: number   // 0-100, weight 25%
  emotionalDiscipline: number // 0-100, weight 20%
  journalingConsistency: number // 0-100, weight 15%
  overall: number          // 0-100 weighted total
}

// Pre-trade nudge
export interface PreTradeNudge {
  id: string
  type: 'loss_streak' | 'instrument' | 'day_of_week' | 'emotion'
  severity: 'info' | 'warning' | 'danger'
  title: string
  message: string
  icon: string
}

// Progressive unlock level
export interface UnlockLevel {
  level: number
  trades: number
  title: string
  unlocks: string[]
}

// Extended teacher profile with public data
export type TeacherPublicProfile = Profile & {
  classrooms?: Classroom[]
  review_count?: number
  avg_rating?: number
  student_count?: number
}
