# Pure Gold Trading Academy - Reference Guide

> **Read Me First** - This document serves as the primary reference for understanding, maintaining, and developing the Pure Gold Trading Academy platform. Updated after each development session.

---

## Guiding Philosophy

**Depth over breadth. Quality over speed. Tokens are free.**

This is not about efficiency. This is about excellence. When you pick a task, you are committing to understanding it completely and leaving behind work that future agents can build on.

---

## Quick Overview

**What is this?** A full-stack trading education platform for forex/crypto traders with journaling, classrooms, and analytics.

**Tech Stack:** Next.js 16 + TypeScript + Supabase + Stripe + Tailwind CSS 4

**Live at:** [Configure in environment]

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Features](#core-features)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Authorization](#authentication--authorization)
6. [Key Files Reference](#key-files-reference)
7. [Environment Variables](#environment-variables)
8. [Common Tasks](#common-tasks)
9. [Session History](#session-history)

---

## Project Structure

```
src/
├── app/                      # Next.js App Router (pages & routing)
│   ├── (protected)/          # Auth-required routes
│   │   ├── dashboard/        # Main trading dashboard
│   │   ├── journal/          # Trade journaling (CRUD + analytics)
│   │   ├── learn/            # Educational content viewer
│   │   ├── community/        # Discussion forum
│   │   ├── teacher/          # Teacher portal
│   │   │   ├── topics/        # Topic list & detail pages
│   │   │   ├── lessons/new/   # Single-page lesson creation
│   │   │   ├── trade-calls/   # Trade calls management
│   │   │   ├── live/          # Live sessions
│   │   │   └── settings/      # Teacher settings
│   │   ├── classroom/        # Classroom join flow
│   │   ├── notifications/    # Notification center
│   │   └── settings/         # User settings & subscriptions
│   ├── auth/                 # Login & signup pages
│   ├── api/                  # API endpoints
│   │   ├── stripe/           # Payment processing
│   │   ├── webhooks/         # Stripe webhooks
│   │   ├── prices/           # Live forex/crypto/gold prices
│   │   └── forex-factory/    # Economic calendar
│   └── page.tsx              # Marketing homepage
│
├── components/
│   ├── ui/                   # Primitives (Button, Input, Card, Select, etc.)
│   ├── layout/               # Sidebar, Header, MobileNav, FAB
│   ├── dashboard/            # 15 dashboard widgets
│   ├── journal/              # Journal forms & display
│   ├── analytics/            # Charts (equity curve, emotions, etc.)
│   ├── learn/                # Content cards & viewer
│   └── settings/             # Settings components
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts            # Authentication management
│   ├── useContentAccess.ts   # Content access control
│   ├── useJournalUsage.ts    # Journal quota tracking
│   ├── useTeacherStripe.ts   # Teacher Stripe integration
│   └── ...                   # 8 hooks total
│
├── lib/
│   ├── supabase/             # Supabase clients (browser, server, middleware)
│   ├── constants.ts          # App constants (limits, pricing)
│   └── streakUtils.ts        # Streak calculation logic
│
├── store/
│   └── auth.ts               # Zustand auth state store
│
├── types/
│   └── database.ts           # Full Supabase schema types
│
└── middleware.ts             # Route protection middleware
```

---

## Core Features

### 1. Trade Journaling
- **Location:** `src/app/(protected)/journal/`
- **Components:** `src/components/journal/`
- **Fields:** Instrument, direction, prices, position size, stop/take profit, R-multiple, PnL, emotions (before/during/after), rules followed, screenshots
- **Quota:** Free tier = 15/month, Premium = unlimited

### 2. Student Dashboard
- **Location:** `src/app/(protected)/dashboard/`
- **Widgets:** Position calculator, watched instruments, market news, economic calendar, trading sessions, recent trades, streak badges, milestones
- **Keyboard shortcuts:** Available via `?` key

### 3. Teacher Portal
- **Location:** `src/app/(protected)/teacher/`
- **Features:** Topic management, single-page lesson creation, student management, pricing configuration, Stripe Connect
- **Redesigned (Jan 28):** Simplified to Topics + Lessons model. Single-page lesson form with content type picker. Floating Add Lesson FAB.
- **New (Jan 21):** Trade Calls, Curriculum Tracks, Live Sessions

### 4. Learning System
- **Location:** `src/app/(protected)/learn/`
- **Content types:** Video, PDF, image, text, YouTube embeds, TradingView charts
- **Access control:** Free, premium, individually priced
- **New (Jan 21):** Curriculum tracks with modules, progress tracking

### 5. Trade Calls (NEW - Jan 21, 2026)
- **Location:** `src/app/(protected)/teacher/trade-calls/` (teacher), `src/app/(protected)/learn/` (student)
- **Components:** `src/components/trade-calls/`
- **Features:** Post trade ideas with entry/SL/TPs, analysis, TradingView charts
- **Student action:** Copy to journal

### 6. Curriculum Tracks (NEW - Jan 21, 2026)
- **Location:** `src/app/(protected)/teacher/curriculum/` (teacher), `src/app/(protected)/learn/tracks/` (student)
- **Features:** Structured learning paths (beginner → advanced), modules, prerequisites
- **Progress:** Track completion percentage per student

### 7. Live Sessions (NEW - Jan 21, 2026)
- **Location:** `src/app/(protected)/teacher/live/` (teacher), `src/app/(protected)/learn/live/` (student)
- **Features:** Schedule streams, go live, end sessions
- **Streaming:** YouTube/Twitch/Zoom support

### 8. Community Forum
- **Location:** `src/app/(protected)/community/`
- **Features:** Posts, comments, signal-prevention filtering

### 9. Topics & Lessons (NEW - Jan 28, 2026)
- **Topics Location:** `src/app/(protected)/teacher/topics/`
- **Lesson Form:** `src/components/teacher/LessonForm.tsx`
- **Components:** `src/components/teacher/` (TopicSelector, TopicsList, TeacherFAB)
- **API:** `/api/topics` (GET, POST), `/api/lessons` (POST)
- **Flow:** Teacher selects/creates topic → fills single-page lesson form → publish or save draft
- **Dual-write:** Lessons write to both `lessons` and `learn_content` tables for backward compatibility

### 10. Payments (Stripe)
- **Platform subscription:** $2.80/month premium
- **Classroom subscriptions:** Teacher-set pricing
- **Content purchases:** Individual content sales
- **Teacher payouts:** Stripe Connect

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User accounts | user_id, email, role (student/teacher/admin), subscription_tier, current_track_id |
| `classrooms` | Teacher topics (UI: "Topics") | teacher_id, name, invite_code, is_paid, tagline, logo_url, banner_url |
| `journal_entries` | Trade logs | instrument, direction, prices, emotions, rules_followed, screenshots |
| `journal_feedback` | Teacher comments | journal_entry_id, teacher_id, content |
| `lessons` | Topic lessons | classroom_id, teacher_id, title, summary, content_type, content_url, content_text, explanation, status, attachment_urls, order_index |
| `classroom_rules` | Strategy rules | classroom_id, rule_text, description |
| `learn_content` | Educational materials | classroom_id, lesson_id, module_id, content_type, content_url |
| `learn_progress` | Student progress | user_id, content_id, completed |
| `community_posts` | Forum posts | classroom_id, user_id, title, content |
| `subscriptions` | Stripe subscription data | user_id, stripe_customer_id, tier, status |
| `watched_instruments` | Tracked symbols | user_id, symbol, name |
| `daily_checkins` | Activity tracking | user_id, check_date, has_traded |
| `teacher_stripe_accounts` | Teacher Connect accounts | teacher_id, stripe_account_id |
| `classroom_pricing` | Classroom subscription pricing | classroom_id, monthly_price |
| `content_purchases` | Individual content sales | student_id, content_id, amount |

### Trade Calls Tables (NEW - Jan 21, 2026)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `trade_calls` | Teacher trade ideas | instrument, direction, entry_price, stop_loss, take_profit_1/2/3, status |
| `trade_call_follows` | Student follows | trade_call_id, student_id, journal_entry_id |

### Curriculum Tables (NEW - Jan 21, 2026)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `curriculum_tracks` | Learning paths | classroom_id, name, difficulty_level, prerequisite_track_id |
| `track_modules` | Modules in tracks | track_id, title, order_index |
| `track_progress` | Student progress | user_id, track_id, progress_percent, completed_at |

### Live Sessions Tables (NEW - Jan 21, 2026)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `live_sessions` | Scheduled streams | classroom_id, title, scheduled_start, status, stream_url |
| `session_attendees` | Attendance tracking | session_id, user_id, joined_at |

### Custom Types
- `user_role`: student | teacher | admin
- `subscription_tier`: free | premium
- `emotion_type`: confident | anxious | fearful | greedy | calm | frustrated | neutral
- `trade_direction`: long | short
- `trade_outcome`: win | loss | breakeven
- `content_type`: video | pdf | image | text | youtube | tradingview
- `trade_call_status`: active | hit_tp1 | hit_tp2 | hit_tp3 | hit_sl | manual_close | cancelled (NEW)
- `difficulty_level`: beginner | intermediate | advanced (NEW)
- `live_session_status`: scheduled | live | ended | cancelled (NEW)

---

## API Endpoints

### Payments & Stripe
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/checkout` | POST | Create premium subscription checkout |
| `/api/stripe/portal` | POST | Customer subscription management |
| `/api/stripe/connect/onboard` | POST | Teacher Stripe Connect setup |
| `/api/stripe/connect/status` | GET | Check teacher Stripe status |
| `/api/stripe/connect/checkout/classroom` | POST | Classroom subscription checkout |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |

### Data
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/prices` | GET | Live forex/crypto/gold prices (15min cache) |
| `/api/forex-factory` | GET | Economic calendar events |

### Topics & Lessons (NEW - Jan 28, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/topics` | GET | List teacher's topics with lesson counts and pricing |
| `/api/topics` | POST | Create topic (classroom + classroom_pricing rows) |
| `/api/lessons` | POST | Create lesson with dual-write to learn_content |

### Trade Calls (NEW - Jan 21, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/trade-calls` | GET | List trade calls (filtered by classroom/status) |
| `/api/trade-calls` | POST | Create new trade call |
| `/api/trade-calls` | PATCH | Update/close trade call |
| `/api/trade-calls` | DELETE | Delete trade call |
| `/api/trade-calls/follow` | GET | Get student's followed calls |
| `/api/trade-calls/follow` | POST | Student follows a trade call |
| `/api/trade-calls/follow` | DELETE | Unfollow trade call |

### Curriculum (NEW - Jan 21, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/curriculum/tracks` | GET | List curriculum tracks |
| `/api/curriculum/tracks` | POST | Create track |
| `/api/curriculum/tracks` | PATCH | Update track |
| `/api/curriculum/tracks` | DELETE | Delete track |
| `/api/curriculum/modules` | GET | List modules |
| `/api/curriculum/modules` | POST | Create module |
| `/api/curriculum/modules` | PATCH | Update module |
| `/api/curriculum/modules` | DELETE | Delete module |

### Live Sessions (NEW - Jan 21, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/live-sessions` | GET | List live sessions |
| `/api/live-sessions` | POST | Create session |
| `/api/live-sessions` | PATCH | Update session (including go live/end) |
| `/api/live-sessions` | DELETE | Delete session |

---

## Authentication & Authorization

### Auth Flow
1. **Signup:** Email/password + role selection + email verification
2. **Login:** Session-based with cookie storage
3. **Protection:** Middleware redirects unauthenticated users

### Route Protection
Protected routes in `src/middleware.ts`:
- /dashboard, /journal, /learn, /community, /teacher, /settings, /notifications

### Role Permissions
- **Student:** Dashboard, journal, learn, community
- **Teacher:** All student features + teacher portal + classroom management

### Subscription Tiers
- **Free:** 15 journals/month, basic features
- **Premium:** $2.80/month, unlimited journals, advanced analytics

---

## Key Files Reference

### Must-Know Files
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Route protection logic |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/hooks/useAuth.ts` | Auth state management hook |
| `src/store/auth.ts` | Zustand auth store |
| `src/lib/constants.ts` | App-wide constants (limits, pricing) |
| `src/types/database.ts` | Full TypeScript schema |

### Component Entry Points
| Feature | Entry File |
|---------|------------|
| Dashboard | `src/app/(protected)/dashboard/page.tsx` |
| Journal | `src/app/(protected)/journal/page.tsx` |
| Teacher Dashboard | `src/app/(protected)/teacher/page.tsx` |
| Teacher Topics | `src/app/(protected)/teacher/topics/page.tsx` |
| Teacher Topic Detail | `src/app/(protected)/teacher/topics/[id]/page.tsx` |
| Lesson Form | `src/components/teacher/LessonForm.tsx` |
| Learning | `src/app/(protected)/learn/page.tsx` |

---

## Environment Variables

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Required - App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional - Stripe (for payments)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional - Forex API fallback
APILAYER_FOREX_KEY=your_key

# Optional - Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

---

## Common Tasks

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build && npm start
```

### Add New Protected Route
1. Create folder in `src/app/(protected)/your-route/`
2. Add `page.tsx` with your component
3. Route is automatically protected via middleware

### Add Database Table
1. Create migration in Supabase dashboard
2. Update `src/types/database.ts` with new types
3. Add RLS policies for security

### Add New Dashboard Widget
1. Create component in `src/components/dashboard/`
2. Import in `src/app/(protected)/dashboard/page.tsx`
3. Add to grid layout

---

## Design System

### Colors (Black & Gold Theme)
- **Background:** #050505 (deep black)
- **Gold Primary:** #FFB800
- **Gold Light:** #FFD54F
- **Gold Dark:** #E5A500
- **Card Background:** #0F0F0F
- **Success:** #22C55E
- **Danger:** #EF4444

### Typography
- Sans: Inter (variable)
- Mono: JetBrains Mono

---

## Session History

### Session: January 28, 2026
**Agent:** Claude Opus 4.5
**Task:** Teacher Flow Redesign — Simplified Topics + Lessons Model

**Problem:** The teacher flow was scattered across multiple pages with unnecessary fields. Teachers had to navigate Classroom → Strategy Wizard → Content Management → Pricing → Curriculum just to add a lesson.

**Solution:** Streamlined to: Topics contain Lessons. Pricing is per-topic. Lesson creation is a single page. Inspired by Podia and Teachable's simplicity.

**Major Changes:**

1. **Topics + Lessons Model**
   - `classrooms` table reused as "Topics" (no schema rename, just UI relabeling)
   - Per-topic pricing (free or paid monthly subscription)
   - Created TopicSelector, TopicsList, TeacherFAB, LessonForm components
   - New pages: `/teacher/topics`, `/teacher/topics/[id]`, `/teacher/lessons/new`

2. **Single-Page Lesson Creation**
   - Icon-based content type picker (Video / Chart / PDF / Text)
   - Adaptive content input (URL field, file upload, or textarea)
   - Always-present explanation field
   - Optional file attachments
   - Save as Draft / Publish actions

3. **API Routes**
   - `POST /api/topics` — Creates classroom + classroom_pricing
   - `GET /api/topics` — Lists topics with lesson counts and pricing
   - `POST /api/lessons` — Creates lesson with dual-write to learn_content

4. **Teacher Dashboard Rewrite**
   - Reduced from 609 to ~160 lines
   - 2 stat cards (students + earnings) + TopicsList

5. **Sidebar Overhaul**
   - Teacher sub-navigation when on `/teacher` routes
   - Dashboard, My Topics, Add Lesson, Trade Calls, Live Sessions, Settings
   - Active state with prefix matching for nested routes

6. **Backward Compatibility**
   - 7 redirect stubs from old URLs to new equivalents
   - Dual-write to learn_content for student learn pages
   - No database table renames

7. **Security (from code review)**
   - All mutations routed through API routes with server-side auth
   - teacher_id ownership checks on topic detail page
   - Error logging for dual-write failures
   - useMemo fix for Supabase client stability

**Files Created:** 15 new files (4 components, 3 pages, 2 API routes, 7 redirect stubs, 1 migration)
**Files Modified:** 6 files (types, sidebar, teacher layout, teacher dashboard, topic detail, lesson form)
**Migration:** `supabase/migrations/20260128_topic_simplification.sql`

---

### Session: January 21, 2026 (~14:00-18:00 EST)
**Agent:** Claude Opus 4.5
**Task:** Teacher Portal Reimagination

**Major Changes:**
1. **Trade Calls System**
   - Created `trade_calls` and `trade_call_follows` tables
   - Built TradeCallCard and TradeCallForm components
   - Added `/api/trade-calls` and `/api/trade-calls/follow` routes
   - Teacher pages: `/teacher/trade-calls`, `/teacher/trade-calls/new`
   - Student view integrated into learn page

2. **Curriculum Tracks**
   - Created `curriculum_tracks`, `track_modules`, `track_progress` tables
   - Added `/api/curriculum/tracks` and `/api/curriculum/modules` routes
   - Teacher pages: `/teacher/curriculum`, `/teacher/curriculum/tracks/[id]`
   - Student page: `/learn/tracks/[id]`

3. **Live Sessions**
   - Created `live_sessions` and `session_attendees` tables
   - Added `/api/live-sessions` route
   - Teacher page: `/teacher/live`
   - Student page: `/learn/live`

4. **Embed Support**
   - Created YouTubeEmbed, TradingViewEmbed, EmbedPicker components
   - Added embedUtils.ts for URL parsing

5. **Classroom Enhancements**
   - Added tagline, logo_url, banner_url, trading_style, markets columns
   - Added feature flags: trade_calls_enabled, live_sessions_enabled, curriculum_enabled

6. **Student Learn Page Redesign**
   - Tabbed interface: Overview, Tracks, Trade Calls, Live
   - Integrated all new features

**Files Created:** 26 new files
**Files Modified:** 38 files
**Migration:** `supabase/migrations/20260121_teacher_portal_reimagine.sql`

---

### Session: January 20, 2026
**Agent:** GPT-5 (Codex)
**Actions:**
- Added lessons + strategy rules data model, image explanations, and public strategy visibility
- Built guided 3-step strategy setup flow (strategy → lesson + content → publish)
- Updated teacher dashboard and strategy pages, plus public strategy listing in join flow
- Adjusted student learn view to group by lessons and show image explanations
- Updated dashboard reminder label and placement
- Performance refactors: deferred public strategy listing load, hook dependency fixes, memoized derived lists, and `next/image` adoption

---

### Session: January 19, 2026
**Agent:** Claude Opus 4.5
**Actions:**
- Created this reference document (CLAUDE_REFERENCE.md)
- Performed comprehensive codebase exploration

---

**Current State (as of Jan 28, 2026):**
- Project version: 0.1.0
- 100+ TypeScript files
- 55+ React components
- 23 database tables (lessons table expanded with 7 new columns)
- Simplified teacher flow: Topics → Lessons with single-page creation
- All core features + trade calls, live sessions, curriculum tracks

**Recent Development (from git history):**
1. **Teacher Flow Redesign** (Jan 28) — Topics + Lessons model, single-page lesson creation, dashboard rewrite
2. Teacher Portal Reimagination (Jan 21) — trade calls, curriculum, live sessions
3. Phase 1 retention features — daily check-in, streak protection, milestones
4. UX improvements — route-aware chrome, join flow
5. UI redesign — warm gold colors, 3D depth effects
6. Stripe Connect teacher pricing implementation
7. Premium tier features and analytics

---

## Notes for AI Agents

When working on this codebase:

1. **Always check types first** - `src/types/database.ts` has the full schema
2. **Use existing patterns** - Follow the component structure already established
3. **Check constants** - `src/lib/constants.ts` has limits and pricing values
4. **Auth context** - Use `useAuth()` hook for user/profile data
5. **Protected routes** - All `/app/(protected)/` routes require authentication
6. **Supabase RLS** - Database has row-level security; use service role for admin operations
7. **Stripe integration** - Both platform subscriptions and Connect for teachers
8. **New features (Jan 21)** - Trade calls, curriculum tracks, live sessions are fully implemented
9. **Embed support** - Use `src/lib/embedUtils.ts` for YouTube/TradingView URL parsing
10. **Teacher flow (Jan 28)** - Topics + Lessons model. Components in `src/components/teacher/`. API routes at `/api/topics` and `/api/lessons`. Lessons dual-write to `learn_content`.
11. **Old teacher URLs** - `/teacher/classrooms`, `/teacher/strategy/new`, `/teacher/content`, `/teacher/curriculum` all redirect to new equivalents

**Update this document** after significant changes to keep it current.

---

*Last Updated: January 28, 2026*
