# Pure Gold Trading Academy - Documentation

## Overview

Pure Gold Trading Academy is a comprehensive web application for trading education, featuring trade journaling, classroom management, and community features.

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [Authentication & Roles](#authentication--roles)
4. [Student Dashboard](#student-dashboard)
5. [Trade Journaling](#trade-journaling)
6. [Learning Content](#learning-content)
7. [Trade Calls](#trade-calls)
8. [Curriculum Tracks](#curriculum-tracks)
9. [Live Sessions](#live-sessions)
10. [Teacher Backend](#teacher-backend)
11. [Community](#community)
12. [Notifications](#notifications)
13. [Subscriptions](#subscriptions)
14. [Database Schema](#database-schema)
15. [Environment Variables](#environment-variables)
16. [Deployment](#deployment)

---

## Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Material Symbols Outlined (Google)
- **Design System**: 3-tier glassmorphism (Surface / Elevated / Floating) with frosted noise texture

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (protected)/        # Authenticated routes
│   │   ├── dashboard/      # Student dashboard
│   │   ├── journal/        # Trade journaling
│   │   ├── learn/          # Educational content
│   │   ├── community/      # Discussion forum
│   │   ├── teacher/        # Teacher backend
│   │   ├── settings/       # User settings
│   │   └── notifications/  # Notification center
│   ├── auth/               # Authentication pages
│   └── api/                # API routes
├── components/             # React components
│   ├── dashboard/          # Dashboard widgets
│   ├── journal/            # Journal components
│   ├── layout/             # Layout components
│   ├── settings/           # Settings components
│   └── ui/                 # UI primitives
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities & configurations
├── store/                  # Zustand stores
└── types/                  # TypeScript types
```

---

## Features

### Core Features

1. **User Authentication** - Email/password with student/teacher roles
2. **Student Dashboard** - Market news, session indicator, position calculator, recent trades with quick-close navigation
3. **Calendar Heatmap** - Monthly calendar view of trading activity with behavioral insight panel (emotion patterns, streaks, performance analytics)
3. **Trade Journaling** - Structured entries with screenshots, emotions, rules
4. **Learning Content** - Video, PDF, image, text, YouTube embeds, TradingView charts
5. **Trade Calls** - Real-time teacher trade ideas with entry/SL/TPs and analysis
6. **Curriculum Tracks** - Structured learning paths (beginner → advanced) with modules
7. **Live Sessions** - Scheduled live trading streams with teacher
8. **Teacher Backend** - Classroom management, analytics, feedback, trade calls, curriculum
9. **Public Strategies** - Marketplace listing for discoverable strategies
10. **Community** - Discussion posts and comments
11. **Push Notifications** - Web push for important updates
12. **Subscriptions** - Free and premium tiers via Stripe

---

## Authentication & Roles

### Roles

| Role | Description |
|------|-------------|
| `student` | Default role for traders. Can journal, learn, and participate in community |
| `teacher` | Can create classrooms, upload content, review journals, provide feedback |

### Authentication Flow

1. User signs up with email/password
2. Email verification required
3. Profile created with selected role
4. Role-based navigation and access control

### Implementation

```typescript
// useAuth hook provides:
const { user, profile, isPremium, signIn, signUp, signOut } = useAuth()
```

---

## Student Dashboard

### Components

#### Stats Header (`StatsHeader.tsx`)
- Total trades count
- Win rate percentage
- Average R-Multiple
- Journal streak (days)
- Current trading session indicator

#### Position Calculator (`PositionCalculator.tsx`)
- Account balance input
- Risk percentage selection
- Entry price, stop loss inputs
- Calculates position size and risk amount

#### Market News (`MarketNews.tsx`)
- Real-time market headlines
- Source links
- Refresh functionality

#### Forex Factory News (`ForexFactoryNews.tsx`)
- Economic calendar integration
- Impact level indicators (High/Medium/Low)
- Currency filtering

#### Session Indicator (`SessionIndicator.tsx`)
- Sydney, Tokyo, London, New York sessions
- Visual timeline with overlaps
- Current session highlight

#### Watched Instruments (`WatchedInstruments.tsx`)
- Customizable instrument list
- Mock price data (integrate real API in production)
- Daily change percentages

---

## Trade Journaling

### Journal Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instrument` | string | Yes | Trading pair (XAUUSD, EURUSD, etc.) |
| `direction` | enum | Yes | 'long' or 'short' |
| `entry_price` | number | Yes | Entry price |
| `exit_price` | number | No | Exit price (leave blank if open) |
| `position_size` | number | Yes | Lot size |
| `stop_loss` | number | No | Stop loss price |
| `take_profit` | number | No | Take profit price |
| `outcome` | enum | No | 'win', 'loss', 'breakeven' |
| `r_multiple` | number | Auto | Calculated risk/reward |
| `pnl` | number | Auto | Calculated profit/loss |
| `emotion_before` | enum | Yes | Pre-trade emotion |
| `emotion_during` | enum | No | During-trade emotion |
| `emotion_after` | enum | No | Post-trade emotion |
| `notes` | text | No | Trade analysis and reflection |
| `rules_followed` | array | No | Checklist of trading rules |
| `screenshot_urls` | array | No | Chart screenshots (max 4) |
| `chart_data` | jsonb | No | TradingView chart state with annotations (NEW Jan 29) |
| `pre_trade_mindset` | jsonb | No | Readiness score (1-5) + psychology tags (NEW Jan 29) |

### Interactive Chart (NEW - Jan 29, 2026)

- TradingView `lightweight-charts` v5 widget embedded in journal form Step 2
- Annotation toolbar: Horizontal Line, Trend Line, Entry, Exit, Stop Loss, Take Profit, Text
- Chart state serialized as JSON and saved with entry
- Displayed read-only on journal detail page
- Color-coded annotations: green (entry), orange (exit), red (SL), blue (TP)

### Pre-Trade Mindset Capture (NEW - Jan 29, 2026)

- Inline bar at top of journal form Step 1 (~60px height)
- Readiness slider: 5 tappable gold dots (1-5 scale)
- Quick-tag badges: Revenge, FOMO, Confident, Uncertain, Tired (multi-select toggle)
- Optional — skippable, never blocking
- Data feeds into Psychology analytics tab

### Emotion Types

- Calm, Confident, Neutral, Anxious, Fearful, Greedy, Frustrated

### Trading Rules

- Followed trading plan
- Proper risk management (1-2% max)
- Waited for confirmation
- Traded during optimal session
- Checked economic calendar
- Good emotional state
- Set stop loss before entry
- Documented trade thesis

### Screenshots

- Upload up to 4 images per entry
- Stored in Supabase Storage bucket `journal-screenshots`
- Supports PNG, JPG up to 5MB

---

## Learning Content

### Content Types

| Type | Icon | Description |
|------|------|-------------|
| `video` | play_circle | YouTube/Vimeo embeds or direct video |
| `pdf` | picture_as_pdf | PDF documents |
| `article` | article | Text/HTML content |
| `image` | image | Image galleries |

### Content Model

```typescript
interface LearningContent {
  id: string
  title: string
  description: string
  type: 'video' | 'pdf' | 'article' | 'image'
  content_url: string
  thumbnail_url?: string
  duration_minutes?: number
  is_premium: boolean
  classroom_id?: string
  teacher_id: string
  order_index: number
}
```

### Access Control

- Free content visible to all users
- Premium content requires active subscription
- Classroom-specific content only visible to enrolled students

---

## Trade Calls

> *Added January 21, 2026*

### Overview

Trade calls allow teachers to share real-time trade ideas with their students. Students can view the calls, see the analysis, and optionally copy them to their journal.

### Trade Call Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `instrument` | string | Yes | Trading pair (XAUUSD, EURUSD, etc.) |
| `direction` | enum | Yes | 'long' or 'short' |
| `entry_price` | decimal | Yes | Entry price level |
| `stop_loss` | decimal | Yes | Stop loss price |
| `take_profit_1` | decimal | No | First take profit target |
| `take_profit_2` | decimal | No | Second take profit target |
| `take_profit_3` | decimal | No | Third take profit target |
| `risk_reward_ratio` | decimal | Auto | Calculated R:R ratio |
| `timeframe` | string | No | Chart timeframe (1H, 4H, D, etc.) |
| `analysis_text` | text | No | Trade reasoning and analysis |
| `chart_url` | url | No | TradingView chart URL |
| `status` | enum | Auto | active, hit_tp1, hit_tp2, hit_tp3, hit_sl, manual_close, cancelled |

### Trade Call Statuses

- **active** - Trade is currently open
- **hit_tp1/2/3** - Take profit level was reached
- **hit_sl** - Stop loss was hit
- **manual_close** - Teacher manually closed the trade
- **cancelled** - Trade was cancelled before entry

### Student Features

- View all active and recent trade calls from their classroom
- See detailed analysis and chart links
- "Copy to Journal" button pre-fills a new journal entry
- Track which calls they followed

### Teacher Features

- Post new trade calls quickly from dashboard or dedicated page
- Close trades with actual exit price and notes
- View performance stats (win rate, total calls, etc.)
- Filter by status and classroom

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/trade-calls` | GET | List trade calls |
| `/api/trade-calls` | POST | Create new trade call |
| `/api/trade-calls` | PATCH | Update/close trade call |
| `/api/trade-calls` | DELETE | Delete trade call |
| `/api/trade-calls/follow` | POST | Student follows a call |
| `/api/trade-calls/follow` | GET | Get student's followed calls |

---

## Curriculum Tracks

> *Added January 21, 2026*

### Overview

Curriculum tracks provide structured learning paths that guide students from beginner to advanced topics. Each track contains modules, and modules contain content.

### Track Structure

```
Classroom
└── Curriculum Track (e.g., "Beginner Forex")
    ├── Module 1: Market Basics
    │   ├── Content: What is Forex (video)
    │   ├── Content: Currency Pairs (text)
    │   └── Content: Market Hours (image)
    ├── Module 2: Chart Reading
    │   ├── Content: Candlestick Patterns (video)
    │   └── Content: Support & Resistance (video)
    └── Module 3: First Trade
        └── Content: Demo Account Setup (pdf)
```

### Track Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Track name |
| `description` | text | Track overview |
| `difficulty_level` | enum | beginner, intermediate, advanced |
| `prerequisite_track_id` | uuid | Track that must be completed first |
| `estimated_hours` | integer | Estimated completion time |
| `is_published` | boolean | Whether students can see it |
| `order_index` | integer | Display order |

### Module Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Module name |
| `summary` | text | Module description |
| `order_index` | integer | Order within track |

### Progress Tracking

- Students can see their progress percentage per track
- Prerequisite tracks must be completed before unlocking next level
- Progress is calculated based on content completion within modules

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/curriculum/tracks` | GET | List tracks |
| `/api/curriculum/tracks` | POST | Create track |
| `/api/curriculum/tracks` | PATCH | Update track |
| `/api/curriculum/tracks` | DELETE | Delete track |
| `/api/curriculum/modules` | GET | List modules |
| `/api/curriculum/modules` | POST | Create module |
| `/api/curriculum/modules` | PATCH | Update module |
| `/api/curriculum/modules` | DELETE | Delete module |

---

## Live Sessions

> *Added January 21, 2026*

### Overview

Live sessions allow teachers to schedule and host live trading streams. Students see upcoming sessions and can join when the teacher goes live.

### Session Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Session title |
| `description` | text | What will be covered |
| `scheduled_start` | timestamp | When the session starts |
| `scheduled_duration_minutes` | integer | Expected length |
| `status` | enum | scheduled, live, ended, cancelled |
| `stream_url` | url | YouTube/Twitch/Zoom link |
| `recording_url` | url | Post-session recording link |
| `actual_start` | timestamp | When teacher went live |
| `actual_end` | timestamp | When session ended |

### Session Statuses

- **scheduled** - Upcoming session
- **live** - Currently streaming
- **ended** - Session completed
- **cancelled** - Session was cancelled

### Student Features

- View upcoming sessions with countdown timers
- See "Live Now" indicator when teacher is streaming
- Click to join via stream URL
- Sessions display in local timezone

### Teacher Features

- Schedule sessions with date, time, and duration
- Add stream URL when ready (can be added later)
- "Go Live" button to start the session
- "End Session" button to complete
- View past sessions

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/live-sessions` | GET | List sessions |
| `/api/live-sessions` | POST | Create session |
| `/api/live-sessions` | PATCH | Update session (including status changes) |
| `/api/live-sessions` | DELETE | Delete session |

---

## Teacher Backend

> *Redesigned January 28, 2026 — simplified Topics + Lessons model*

### Teacher Dashboard (`/teacher`)

- 2 stat cards: Total students, Total earnings
- TopicsList component showing all topics with lesson counts and pricing badges
- Floating "Add Lesson" button (TeacherFAB) on all teacher pages
- Empty state CTA for new teachers

### Teacher Sidebar Navigation

When on `/teacher` routes, the sidebar shows:
- Dashboard (`/teacher`)
- My Topics (`/teacher/topics`)
- Add Lesson (`/teacher/lessons/new`)
- Trade Calls (`/teacher/trade-calls`)
- Live Sessions (`/teacher/live`)
- Settings (`/teacher/settings`)

### Topics (`/teacher/topics`)

- **List View**: Topic cards with name, lesson count (published/total), free/paid badge, student count
- **Detail View** (`/teacher/topics/[id]`): Inline-editable name and description, pricing badge, student count, invite code, lesson list with content type icons, delete lesson capability
- **Inline Creation**: Topics can be created inline from the TopicSelector component during lesson creation

### Lesson Creation (`/teacher/lessons/new`)

Single-page form with:
- **TopicSelector**: Dropdown with lesson counts, inline "New Topic" form (name, description, free/paid toggle, monthly price)
- **Lesson Title**: Required text field
- **Content Type Picker**: Icon-based selector (Video / Chart / PDF / Text)
- **Adaptive Content Input**: Video URL field, file upload for chart/PDF, textarea for text
- **Explanation**: Always-present required textarea for teaching notes
- **Attachments**: Optional PDF/image file uploads
- **Actions**: Save as Draft / Publish Lesson

### Trade Calls (`/teacher/trade-calls`)

- List all trade calls with performance stats
- Filter by classroom and status (active/closed)
- Create new trade call with quick form
- Close trades with exit price and notes
- View win/loss statistics

### Curriculum (`/teacher/curriculum`)

- Manage curriculum tracks per classroom
- Create/edit tracks with difficulty levels
- Set prerequisite tracks for progressive learning
- Publish/unpublish tracks
- Track detail view for managing modules

### Live Sessions (`/teacher/live`)

- Schedule upcoming live sessions
- Set title, description, date/time, duration
- Add stream URL (YouTube/Twitch/Zoom)
- Go Live / End Session controls
- View past sessions

### Classrooms / Topics

> Classrooms are now referred to as "Topics" in the teacher UI. The `classrooms` table is unchanged — only the UI labeling and flow have been simplified.

- Old URLs (`/teacher/classrooms`, `/teacher/classrooms/[id]`, `/teacher/strategy/new`, `/teacher/content`, `/teacher/curriculum`) redirect to new equivalents
- Topics are created inline during lesson creation or from the topics list
- Pricing set per-topic (free or paid monthly subscription)

### Students (`/teacher/students`)

> *Expanded January 29, 2026 — Full Analytics Dashboard*

- **Overview cards**: Total students, average class win rate, average R-multiple, active journalers (last 7 days)
- **Tabs**: Students list and Class Analytics view
- **Class Analytics** (`ClassAnalytics` component): SVG win rate trend (12 weeks), R-multiple trend, emotion patterns, rule adherence summary
- **Student Alerts** (`StudentAlerts` component): Inactive 7+ days, losing streaks (3+), low rule adherence (<40%)
- **Student list**: Searchable, sortable by name/win rate/avg R/trade count/last active
- **Student deep-dive** (`/teacher/students/[id]`): 6 tabs — Overview (equity curve + recent trades), Emotions, Rules, Psychology, Journals, Feedback. Reuses all analytics components from Phase 1.
- **Authorization**: Verifies teacher owns a classroom the student is subscribed to before showing data

### Automated Progress Reports (NEW - Jan 29, 2026)

- **Generate reports**: `/api/reports/generate` POST endpoint computes analytics for a student over a period (weekly/monthly)
- **Report data**: Total trades, win rate, avg R, streaks, emotion breakdown, rule adherence, strengths, improvement areas, comparison to previous period
- **Teacher notes**: Editable per-report via PATCH endpoint
- **Student view**: `/journal/reports` page lists reports grouped by classroom, expandable to full `ProgressReport` component
- **Report renderer**: Summary cards, strengths (green), improvements (amber), emotion bars, rule progress bars, best/worst trades, teacher notes

### Journal Review (`/teacher/journals`)

- View all student journal entries
- Filter by classroom
- Inline feedback form
- Notification sent to student on feedback

### Content Management

> *Content management has been replaced by the single-page Lesson Form at `/teacher/lessons/new`. Old `/teacher/content` URL redirects there.*

- Content is now created as part of lessons with type-specific inputs
- Each lesson has: primary content (video URL, chart image, PDF file, or text) + optional attachments
- Explanation field always present for teacher commentary
- Lessons dual-write to `learn_content` table for backward compatibility with student learn pages

---

## Community

> *Rewritten January 29, 2026 — Threaded Discussions + Voting + Trade Reviews*

### Posts

- Create new discussion posts with title, content, and category
- Categories: General, Chart Analysis, Strategy, Psychology, Question, Trade Review
- Upvote/downvote system with score display
- Threaded comment replies (max 3 levels deep)
- Sort by Hot (weighted by recency), New (chronological), Top (by score)
- Search posts by keyword
- Classroom-scoped: users only see posts from their subscribed classrooms
- Signal prevention filtering on post/comment creation

### Trade Reviews (NEW - Jan 29, 2026)

- Share journal entries to community with privacy controls
- Choose what to expose: P&L, emotions, chart data
- Embedded TradingView chart in read-only mode (if shared)
- Trade details: instrument, direction, entry/exit, outcome, R-multiple
- Created via "Share to Community" button on journal detail page

### Comments

- Threaded replies with recursive rendering (3 levels max)
- Inline reply forms on each comment
- Upvote/downvote on individual comments
- Delete own comments (with ownership verification)

### Voting

- New `community_votes` table with unique constraints per user per post/comment
- Optimistic updates with rollback on error
- Vote type: +1 (upvote) or -1 (downvote)

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/community/trade-review` | POST | Create trade review post from journal entry |

---

## Notifications

### In-App Notifications

Located at `/notifications`, displays:
- Journal feedback notifications
- New content notifications
- Comment notifications
- System notifications

### Push Notifications

Enable via Settings to receive browser push notifications for:
- New feedback on journal entries
- New content published
- Community activity

### Implementation

```typescript
// usePushNotifications hook
const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications()
```

---

## Subscriptions

### Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | $0/month | Basic journaling, position calculator, limited content |
| Premium | $2.80/month | Unlimited journals, advanced analytics, all content, priority feedback |

### Teacher Pricing

- Classroom pricing is configurable per teacher
- Teacher payouts use Stripe Connect

### Stripe Integration

#### Environment Variables

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### API Endpoints

- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Open billing portal
- `POST /api/stripe/connect/onboard` - Start Stripe Connect onboarding
- `GET /api/stripe/connect/status` - Check Stripe Connect status
- `POST /api/stripe/connect/checkout/classroom` - Classroom subscription checkout
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

#### Webhook Events

- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Cancel subscription

---

## Database Schema

### Core Tables

#### profiles
```sql
- id (uuid, PK)
- email (text)
- display_name (text)
- role ('student' | 'teacher' | 'admin')
- classroom_id (uuid, FK -> classrooms)
- subscription_tier ('free' | 'premium')
- push_enabled (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### journal_entries
```sql
- id (uuid, PK)
- user_id (uuid, FK -> profiles)
- classroom_id (uuid, FK -> classrooms)
- instrument (text)
- direction ('long' | 'short')
- entry_price (decimal)
- exit_price (decimal)
- position_size (decimal)
- stop_loss (decimal)
- take_profit (decimal)
- r_multiple (decimal)
- pnl (decimal)
- outcome ('win' | 'loss' | 'breakeven')
- emotion_before (text)
- emotion_during (text)
- emotion_after (text)
- notes (text)
- rules_followed (jsonb)
- screenshot_urls (jsonb)
- trade_date (date)
- entry_time (time)
- exit_time (time)
- created_at (timestamp)
- updated_at (timestamp)
```

#### classrooms
```sql
- id (uuid, PK)
- teacher_id (uuid, FK -> profiles)
- name (text)
- description (text)
- invite_code (text, unique)
- is_public (boolean)
- created_at (timestamp)
```

#### lessons
```sql
- id (uuid, PK)
- classroom_id (uuid, FK -> classrooms)
- teacher_id (uuid, FK -> profiles)          -- Added Jan 28, 2026
- title (text)
- summary (text)
- order_index (integer)
- content_type (text)                         -- Added Jan 28: video/chart/pdf/text
- content_url (text)                          -- Added Jan 28: URL for video/chart/pdf
- content_text (text)                         -- Added Jan 28: text content body
- explanation (text)                          -- Added Jan 28: teacher commentary (required)
- status (text)                               -- Added Jan 28: draft/published
- attachment_urls (text[])                    -- Added Jan 28: optional file attachments
- created_at (timestamp)
- updated_at (timestamp)
```

#### learn_content
```sql
- id (uuid, PK)
- teacher_id (uuid, FK -> profiles)
- classroom_id (uuid, FK -> classrooms)
- lesson_id (uuid, FK -> lessons)
- title (text)
- description (text)
- explanation (text)
- type ('video' | 'pdf' | 'image' | 'text')
- content_url (text)
- thumbnail_url (text)
- duration_minutes (integer)
- is_premium (boolean)
- order_index (integer)
- created_at (timestamp)
```

#### notifications
```sql
- id (uuid, PK)
- user_id (uuid, FK -> profiles)
- title (text)
- message (text)
- type (text)
- link (text)
- read (boolean)
- created_at (timestamp)
```

#### community_posts
```sql
- id (uuid, PK)
- author_id (uuid, FK -> profiles)
- title (text)
- content (text)
- likes (integer)
- created_at (timestamp)
```

#### subscriptions
```sql
- id (uuid, PK)
- user_id (uuid, FK -> profiles)
- stripe_customer_id (text)
- stripe_subscription_id (text)
- tier ('free' | 'premium')
- status (text)
- current_period_start (timestamp)
- current_period_end (timestamp)
```

### Trade Calls Tables (NEW - Jan 21, 2026)

#### trade_calls
```sql
- id (uuid, PK)
- classroom_id (uuid, FK -> classrooms)
- teacher_id (uuid, FK -> profiles)
- instrument (text)
- direction (text) -- 'long' | 'short'
- entry_price (decimal)
- stop_loss (decimal)
- take_profit_1 (decimal)
- take_profit_2 (decimal)
- take_profit_3 (decimal)
- risk_reward_ratio (decimal)
- timeframe (text)
- analysis_text (text)
- chart_url (text)
- status (trade_call_status) -- active, hit_tp1, hit_tp2, hit_tp3, hit_sl, manual_close, cancelled
- actual_exit_price (decimal)
- result_pips (decimal)
- closed_at (timestamp)
- close_notes (text)
- published_at (timestamp)
- created_at (timestamp)
```

#### trade_call_follows
```sql
- id (uuid, PK)
- trade_call_id (uuid, FK -> trade_calls)
- student_id (uuid, FK -> profiles)
- journal_entry_id (uuid, FK -> journal_entries)
- followed_at (timestamp)
```

### Curriculum Tables (NEW - Jan 21, 2026)

#### curriculum_tracks
```sql
- id (uuid, PK)
- classroom_id (uuid, FK -> classrooms)
- name (text)
- description (text)
- difficulty_level (difficulty_level) -- beginner, intermediate, advanced
- order_index (integer)
- is_published (boolean)
- prerequisite_track_id (uuid, FK -> curriculum_tracks)
- estimated_hours (integer)
- icon (text)
- created_at (timestamp)
```

#### track_modules
```sql
- id (uuid, PK)
- track_id (uuid, FK -> curriculum_tracks)
- title (text)
- summary (text)
- order_index (integer)
- created_at (timestamp)
```

#### track_progress
```sql
- id (uuid, PK)
- user_id (uuid, FK -> profiles)
- track_id (uuid, FK -> curriculum_tracks)
- started_at (timestamp)
- completed_at (timestamp)
- current_module_id (uuid, FK -> track_modules)
- progress_percent (integer)
```

### Live Sessions Tables (NEW - Jan 21, 2026)

#### live_sessions
```sql
- id (uuid, PK)
- classroom_id (uuid, FK -> classrooms)
- teacher_id (uuid, FK -> profiles)
- title (text)
- description (text)
- scheduled_start (timestamp)
- scheduled_duration_minutes (integer)
- actual_start (timestamp)
- actual_end (timestamp)
- status (live_session_status) -- scheduled, live, ended, cancelled
- stream_url (text)
- recording_url (text)
- thumbnail_url (text)
- max_attendees (integer)
- created_at (timestamp)
```

#### session_attendees
```sql
- id (uuid, PK)
- session_id (uuid, FK -> live_sessions)
- user_id (uuid, FK -> profiles)
- joined_at (timestamp)
- left_at (timestamp)
```

### Classroom Enhancements (Jan 21, 2026)

Added columns to `classrooms` table:
- `tagline` (text)
- `logo_url` (text)
- `banner_url` (text)
- `trading_style` (text)
- `markets` (text[])
- `trade_calls_enabled` (boolean)
- `live_sessions_enabled` (boolean)
- `curriculum_enabled` (boolean)

Added column to `profiles` table:
- `current_track_id` (uuid, FK -> curriculum_tracks)

Added column to `learn_content` table:
- `module_id` (uuid, FK -> track_modules)

### Marketplace Tables (NEW - Jan 29, 2026)

#### topic_reviews
```sql
- id (uuid, PK)
- student_id (uuid, FK -> profiles)
- classroom_id (uuid, FK -> classrooms)
- rating (integer, 1-5)
- review_text (text)
- teacher_response (text)
- created_at (timestamp)
-- Unique: one review per student per classroom
```

### Community Enhancement Tables (NEW - Jan 29, 2026)

#### community_votes
```sql
- id (uuid, PK)
- user_id (uuid, FK -> profiles)
- post_id (uuid, FK -> community_posts)
- comment_id (uuid, FK -> community_comments)
- vote_type (smallint, 1 or -1)
- created_at (timestamp)
-- CHECK: exactly one of post_id or comment_id must be set
-- Unique: one vote per user per post, one vote per user per comment
```

Added columns to `community_posts`:
- `category` (varchar, default 'general')
- `tags` (text[], default '{}')
- `post_type` (varchar, default 'discussion')
- `shared_journal_data` (jsonb) — trade review data
- `journal_entry_id` (uuid) — source journal entry

Added column to `community_comments`:
- `parent_comment_id` (uuid, self-referencing FK) — for threaded replies

### Progress Reports Table (NEW - Jan 29, 2026)

#### progress_reports
```sql
- id (uuid, PK)
- user_id (uuid, FK -> profiles, CASCADE)
- classroom_id (uuid, FK -> classrooms, CASCADE)
- period_start (date)
- period_end (date)
- report_data (jsonb) — computed analytics
- teacher_notes (text)
- created_at (timestamp)
- updated_at (timestamp)
-- Unique: one report per user per classroom per period
```

### Additional Tables

- `classroom_rules` - Strategy-level rules
- `daily_checkins` - Activity tracking and streaks
- `teacher_stripe_accounts` - Stripe Connect accounts for teachers
- `classroom_pricing` - Classroom subscription pricing
- `content_purchases` - Individual content sales
- `learn_progress` - Student progress on content
- `journal_feedback` - Teacher feedback on journal entries
- `community_comments` - Comments on community posts (+ `parent_comment_id` for threading)
- `watched_instruments` - User tracked symbols

---

### Topics & Lessons API (NEW - Jan 28, 2026)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/topics` | GET | List teacher's topics with lesson counts and pricing |
| `/api/topics` | POST | Create topic (classroom + pricing) |
| `/api/lessons` | POST | Create lesson with dual-write to learn_content |

---

### Marketplace & Reviews (NEW - Jan 29, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/courses` | GET | Public course catalog listing |
| `/api/reviews` | GET | Fetch reviews for a classroom |
| `/api/reviews` | POST | Create a review (auth required) |
| `/api/reviews` | PATCH | Update own review |

### Community (NEW - Jan 29, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/community/trade-review` | POST | Create trade review post from journal entry |

### Progress Reports (NEW - Jan 29, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reports/generate` | POST | Generate progress report for a student |
| `/api/reports/generate` | GET | Fetch reports (teacher or student) |
| `/api/reports/generate` | PATCH | Update teacher notes on a report |

---

## Update Log

### January 29, 2026 — Calendar Heatmap Redesign + Recent Trades UX
**Agent:** Claude Opus 4.5

**Calendar Heatmap (`CalendarHeatmap.tsx`) — Complete Rewrite:**
- Replaced 26-week horizontal GitHub-style heatmap strip with single-month calendar grid (7-column Mon–Sun, `w-10 h-10` cells)
- Added month navigation (`<` / `>` buttons) with `currentMonth` state
- Two-column layout: calendar (60%) + behavioral insight panel (40%), stacks vertically on mobile
- Insight panel shows one prioritized monthly insight (emotion patterns, streaks, best day, instrument focus, win rate, low activity) plus month stats (trades, win rate, total R)
- Parallel Supabase queries for heatmap data and insight data (with `emotion_before`)
- Removed broken month header row, `WEEKS` constant, `gridDates` memo, `monthLabels` memo

**Recent Trades (`RecentTrades.tsx`):**
- Open trade close button now navigates to `/journal/[id]` (detail page) instead of opening `QuickCloseModal`
- Removed `QuickCloseModal` import, `closingTrade` state, and modal render block

---

### January 29, 2026 — Glass Command Center: Frontend Redesign
**Agent:** Claude Opus 4.5

Complete visual overhaul transforming the flat dark-card UI into an Apple-inspired frosted glassmorphism system. Inspired by Tradezella's clean simplicity but with Pure Gold's dark gold identity.

**Design System Changes:**
- Introduced 3-tier glass elevation: Surface (16px blur, `saturate(1.2)`), Elevated (24px blur, `saturate(1.3)`), Floating (36px blur, `saturate(1.4)`)
- SVG frosted noise texture on all glass panels via `::before` pseudo-element with `mix-blend-mode: overlay`
- Warmed gold palette: `--gold` from #FFB800 to #F5A623, added `--gold-muted` (#A07818)
- Added indigo secondary accent: `--accent` (#6366F1) for info badges and secondary CTAs
- Background gradients intensified (12%→20% gold opacity) with `background-attachment: fixed`
- Glass border opacity increased across all tiers for sharper panel edges
- Glass backgrounds made more translucent to let ambient gradients show through

**New CSS Classes:**
- `.glass-surface`, `.glass-elevated`, `.glass-floating` — 3-tier panel system
- `.glass-interactive` — hover border glow + translateY lift
- `.glass-shimmer` — light sweep pseudo-element on hover
- `.btn-gold`, `.btn-glass`, `.btn-outline` — button hierarchy
- `.input-field` — standardized glass input with focus ring
- `.skeleton-glass` — loading shimmer animation
- `.nav-active` — navigation active state

**New Components:**
- `Icon.tsx` — Material Symbols wrapper (sm/md/lg/xl sizes)
- `GlassModal.tsx` — Reusable `glass-floating` modal with AnimatePresence

**Icon Migration:**
- Replaced ALL Lucide React imports with Material Symbols Outlined spans across 30+ files
- Removed `lucide-react` from `package.json` entirely

**Codebase Sweep (70+ files):**
- Replaced inline `bg-[var(--card-bg)] border border-[var(--card-border)]` → `glass-surface`
- Replaced inline input styling → `input-field`
- Replaced modal backgrounds → `glass-floating`
- Replaced cancel buttons → `btn-glass`
- Replaced active pills `bg-[var(--gold)] text-black` → `glass-elevated text-[var(--gold)]`
- Replaced all `border-[var(--card-border)]` dividers → `border-[var(--glass-surface-border)]`

**Modified Components:** Card.tsx (added `tier` prop), Button.tsx (added `glass` variant), Sidebar, StatsHeader, MobileNav, Header, and 70+ other files
**Removed:** `lucide-react` dependency, `.sidebar-3d`, `.mobile-nav-3d` CSS classes, broad attribute selectors

---

### January 29, 2026 ~02:00-03:30 UTC — Strategic Enhancement Plan (4 Phases)
**Agent:** Claude Opus 4.5

Implemented the full 4-phase strategic enhancement plan to deepen Pure Gold's competitive moat in psychology-first journaling and education marketplace.

**Phase 1: TradingView Charts + Psychology Deepening**
- Interactive `lightweight-charts` v5 widget in journal form with annotation toolbar
- Pre-trade mindset capture (readiness 1-5 + psychology tags)
- Psychology analytics tab with readiness/tag impact analysis
- Emotion flow Sankey diagram (Before → During → After transitions)
- Journal form expanded from 3 to 4 steps

**Phase 2: Teacher Marketplace Completion**
- Public teacher directory (`/teachers`) and profiles (`/teachers/[slug]`) with SEO
- Course catalog (`/courses`) and detail (`/courses/[id]`) with server rendering
- Ratings & reviews system with `topic_reviews` table
- Track record verification badge from trade call data
- Teacher settings expanded with bio, slug, social links

**Phase 3: Community Enhancement**
- Threaded discussions (max 3 levels) replacing flat comments
- Upvote/downvote system with `community_votes` table
- Post categories, sort (hot/new/top), and search
- Trade review post type with privacy-controlled journal sharing
- "Share to Community" button on journal detail page

**Phase 4: Teacher Analytics & Student Insights**
- Teacher student dashboard with aggregate analytics and alerts
- Individual student deep-dive (6 tabs reusing Phase 1 analytics)
- Automated progress reports with `/api/reports/generate`
- Student reports page at `/journal/reports`

**Code Review Fixes:**
- N+1 comment count query → batch fetch
- Teacher student page auth → classroom ownership check
- Chart annotation duplication → ref tracking + cleanup
- Community posts → classroom-scoped filtering
- Reports API → ownership validation
- FK constraints, vote_type validation, delete ownership, shared utilities

**New Tables:** `topic_reviews`, `community_votes`, `progress_reports`
**New Columns:** 8 new columns across `journal_entries`, `profiles`, `community_posts`, `community_comments`
**Migrations:** 6 new SQL files
**Files Created:** ~40 new files
**Files Modified:** ~15 existing files

---

### January 28, 2026 - Teacher Flow Redesign: Topics + Lessons
**Agent:** Claude Opus 4.5

Redesigned the teacher experience from a scattered multi-page flow into a streamlined model: Topics contain Lessons. Pricing is per-topic. Lesson creation is a single page.

**Design Philosophy:**
- Inspired by Podia and Teachable's simplicity
- Minimal required fields, sensible defaults, single-page flows
- Teacher should: login → add lesson → set price → done

**New Components:**
- `LessonForm` - Single-page lesson creation with adaptive content inputs
- `TopicSelector` - Dropdown with inline topic creation (name, description, pricing)
- `TopicsList` - Topic cards with lesson counts and pricing badges
- `TeacherFAB` - Floating "Add Lesson" button on all teacher pages

**New Pages:**
- `/teacher/topics` - Topic listing
- `/teacher/topics/[id]` - Topic detail with inline editing and lesson management
- `/teacher/lessons/new` - Single-page lesson creation

**New API Routes:**
- `POST /api/topics` - Create topic (classroom + pricing rows)
- `GET /api/topics` - List teacher's topics with counts
- `POST /api/lessons` - Create lesson with dual-write to learn_content

**Modified Files:**
- `src/app/(protected)/teacher/page.tsx` - Dashboard rewrite (609 → ~160 lines)
- `src/components/layout/Sidebar.tsx` - Added teacher sub-navigation
- `src/app/(protected)/teacher/layout.tsx` - Added TeacherFAB
- `src/types/database.ts` - Added LessonContentType, LessonStatus, new Lesson fields

**Redirect Stubs (7 files):**
- `/teacher/classrooms` → `/teacher/topics`
- `/teacher/classrooms/[id]` → `/teacher/topics/[id]`
- `/teacher/classrooms/[id]/pricing` → `/teacher/topics/[id]`
- `/teacher/strategy/new` → `/teacher/lessons/new`
- `/teacher/content` → `/teacher/lessons/new`
- `/teacher/curriculum` → `/teacher/topics`
- `/teacher/curriculum/tracks/[id]` → `/teacher/topics`

**Security Fixes (from code review):**
- Routed all mutations through API routes with server-side auth
- Added teacher_id ownership checks to topic detail page
- Added error logging for dual-write failures
- Fixed TopicSelector infinite loop (useMemo for Supabase client)

**Database Migration:** `supabase/migrations/20260128_topic_simplification.sql`
- Added columns to `lessons`: content_type, content_url, content_text, explanation, status, attachment_urls, teacher_id
- Created `lesson-attachments` storage bucket

---

### January 21, 2026 (~14:00-18:00 EST) - Teacher Portal Reimagination
**Agent:** Claude Opus 4.5

Major feature release transforming the teacher portal into a comprehensive trading education platform:

**Trade Calls System**
- New `trade_calls` and `trade_call_follows` tables
- Teachers can post real-time trade ideas with instrument, direction, entry/SL/TPs
- Optional analysis text and TradingView chart URLs
- Status tracking: active → hit_tp/sl/manual_close/cancelled
- Students see calls in learn page, can copy to journal
- Performance statistics for teachers

**Curriculum Tracks**
- New `curriculum_tracks`, `track_modules`, `track_progress` tables
- Structured learning paths with difficulty levels (beginner/intermediate/advanced)
- Prerequisite-based track unlocking
- Modules group content within tracks
- Progress tracking per student

**Live Sessions**
- New `live_sessions` and `session_attendees` tables
- Teachers can schedule live trading streams
- Go Live / End Session controls
- Students see upcoming sessions with countdown timers
- Stream URL support (YouTube/Twitch/Zoom)

**Embed Support**
- YouTube video embeds with thumbnail preview and lazy loading
- TradingView chart embeds
- Auto-detection from pasted URLs
- New components: YouTubeEmbed, TradingViewEmbed, EmbedPicker

**Classroom Enhancements**
- Added branding fields: tagline, logo_url, banner_url
- Added trading_style and markets array
- Feature flags: trade_calls_enabled, live_sessions_enabled, curriculum_enabled

**New Files Created**
- 9 new page components (teacher + student views)
- 5 new API route files
- 6 new components (trade-calls, embeds)
- 1 new utility file (embedUtils.ts)
- 1 new migration file

**Migration:** `supabase/migrations/20260121_teacher_portal_reimagine.sql`

---

### January 20, 2026 (19:26 EST)
- Performance refactors: deferred public strategy listing load, hook dependency fixes, memoized derived lists, and `next/image` adoption with Supabase patterns.

### January 20, 2026 (18:29 EST)
- Added lessons + strategy rules, public strategy visibility, guided strategy setup flow, and image explanations.

---

## Environment Variables

### Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Optional (Enable Features)

```env
# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK...
VAPID_PRIVATE_KEY=...
```

---

## Deployment

### Prerequisites

1. Node.js 18+
2. Supabase project with schema applied
3. (Optional) Stripe account for payments

### Build & Deploy

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Supabase Setup

1. Create Supabase project
2. Run database migrations
3. Set up Row Level Security policies
4. Create storage bucket for screenshots
5. Configure email templates

### Vercel Deployment

1. Connect GitHub repository
2. Add environment variables
3. Deploy

---

## Support

For issues or feature requests, please open an issue on the repository.

---

*Built with Next.js, Supabase, and Stripe*
