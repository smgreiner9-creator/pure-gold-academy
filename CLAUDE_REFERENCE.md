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
│   │   └── steps/            # SteppedEntryForm steps (TradeStep, ReflectionStep, DeepDiveStep)
│   ├── analytics/            # Charts (equity curve, emotions, etc.)
│   ├── onboarding/           # UnlockModal.tsx, LevelProgressBar.tsx, ProgressiveGate.tsx
│   ├── learn/                # Content cards & viewer
│   └── settings/             # Settings components
│
├── hooks/                    # Custom React hooks
│   ├── useAuth.ts            # Authentication management
│   ├── useContentAccess.ts   # Content access control
│   ├── useJournalUsage.ts    # Journal quota tracking
│   ├── useTeacherStripe.ts   # Teacher Stripe integration
│   ├── useProgressiveLevel.ts # Progressive unlock level hook
│   ├── useConsistencyScore.ts # Consistency score hook
│   ├── useWeeklyFocus.ts     # Weekly review focus hook
│   ├── useTradeFilters.ts    # Trade filtering hook
│   └── ...                   # 12+ hooks total
│
├── lib/
│   ├── supabase/             # Supabase clients (browser, server, middleware)
│   ├── constants.ts          # App constants (limits, pricing)
│   ├── streakUtils.ts        # Streak calculation logic
│   ├── progressiveLevels.ts  # Progressive unlock level definitions (6 tiers)
│   ├── consistencyScore.ts   # Consistency score calculation (0-100)
│   ├── nudgeEngine.ts        # Pre-trade nudge/warning engine
│   ├── playbookUtils.ts      # Setup playbook utilities
│   └── tradeImporter.ts      # CSV trade import (MT4/MT5/generic)
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

### 8. Community Forum (Rewritten Jan 29, 2026)
- **Location:** `src/app/(protected)/community/`
- **Components:** `src/components/community/` (ThreadedComment, VoteButton, PostFilters, TradeReviewPost)
- **Features:** Threaded discussions (3 levels), upvote/downvote, categories (Chart Analysis, Strategy, Psychology, Question, Trade Review, General), sort by hot/new/top, search, signal-prevention filtering, classroom-scoped posts
- **Trade Reviews:** Share journal entries with privacy controls, embedded TradingView charts
- **API:** `/api/community/trade-review` (POST)
- **Utilities:** `src/lib/communityUtils.ts` (shared formatDate, getCategoryColor, getCategoryLabel)

### 9. Topics & Lessons (NEW - Jan 28, 2026)
- **Topics Location:** `src/app/(protected)/teacher/topics/`
- **Lesson Form:** `src/components/teacher/LessonForm.tsx`
- **Components:** `src/components/teacher/` (TopicSelector, TopicsList, TeacherFAB)
- **API:** `/api/topics` (GET, POST), `/api/lessons` (POST)
- **Flow:** Teacher selects/creates topic → fills single-page lesson form → publish or save draft
- **Dual-write:** Lessons write to both `lessons` and `learn_content` tables for backward compatibility

### 10. TradingView Charts in Journal (NEW - Jan 29, 2026)
- **Components:** `src/components/charts/` (TradingViewChart, ChartAnnotationToolbar)
- **Utilities:** `src/lib/chartUtils.ts` (serialize/deserialize chart state)
- **Library:** `lightweight-charts` v5 (SSR-safe via `next/dynamic`)
- **Features:** Interactive chart with 7 annotation tools, saved as JSONB, read-only display on detail page

### 11. Pre-Trade Mindset (NEW - Jan 29, 2026)
- **Component:** `src/components/journal/MindsetCapture.tsx`
- **Analytics:** `src/components/analytics/PsychologyAnalysis.tsx`
- **Features:** Readiness score (1-5), quick-tag badges, feeds into Psychology analytics tab

### 12. Teacher Marketplace (NEW - Jan 29, 2026)
- **Public pages:** `/teachers` (directory), `/teachers/[slug]` (profile), `/courses` (catalog), `/courses/[id]` (detail)
- **Components:** `src/components/teacher/` (TeacherProfileCard, TrackRecordBadge), `src/components/marketplace/` (CourseCard, CourseFilters, ReviewCard, ReviewForm)
- **API:** `/api/courses` (GET), `/api/reviews` (GET/POST/PATCH)

### 13. Teacher Analytics Dashboard (NEW - Jan 29, 2026)
- **Location:** `src/app/(protected)/teacher/students/`
- **Components:** `src/components/teacher/` (ClassAnalytics, StudentAlerts)
- **Features:** Aggregate class analytics, student alerts, individual deep-dive with 6 tabs reusing analytics components

### 14. Progress Reports (NEW - Jan 29, 2026)
- **Component:** `src/components/reports/ProgressReport.tsx`
- **Student page:** `src/app/(protected)/journal/reports/page.tsx`
- **API:** `/api/reports/generate` (POST/GET/PATCH)
- **Features:** Auto-computed analytics, teacher notes, period comparison

### 15. Payments (Stripe)
- **Platform subscription:** $2.80/month premium
- **Classroom subscriptions:** Teacher-set pricing
- **Content purchases:** Individual content sales
- **Teacher payouts:** Stripe Connect

### 16. Journal Enhancement System (NEW - Jan 30, 2026)
- **Stepped Entry Form**: 3-step guided flow replacing collapsible sections. Components in `src/components/journal/steps/`.
- **Progressive Unlock System**: 6 levels gating features. `src/lib/progressiveLevels.ts` for definitions, `useProgressiveLevel` hook, `LevelProgressBar` + `UnlockModal` components.
- **Consistency Score**: Process quality metric (0-100). `src/lib/consistencyScore.ts`, `ConsistencyScoreWidget`, `useConsistencyScore` hook.
- **Post-Trade Reflection**: Inline after submit. `PostTradeReflection.tsx`.
- **Pre-Trade Nudges**: Contextual warnings. `src/lib/nudgeEngine.ts`, `PreTradeNudges.tsx`.
- **Setup Tagging & Playbook**: `SetupTypePicker.tsx`, `PlaybookView.tsx`, `src/lib/playbookUtils.ts`.
- **Weekly Review**: Guided reflection. `WeeklyReview.tsx`, `useWeeklyFocus.ts`.
- **Trade Import**: CSV import. `src/lib/tradeImporter.ts`, `TradeImport.tsx`, `ImportReflectionSwiper.tsx`, `/journal/import` page.
- **Filtering**: `TradeFilters.tsx`, `useTradeFilters.ts`.

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User accounts | user_id, email, role (student/teacher/admin), subscription_tier, current_track_id, bio, social_links (JSONB), slug |
| `classrooms` | Teacher topics (UI: "Topics") | teacher_id, name, invite_code, is_paid, tagline, logo_url, banner_url |
| `journal_entries` | Trade logs | instrument, direction, prices, emotions, rules_followed, screenshots, chart_data (JSONB), pre_trade_mindset (JSONB) |
| `journal_feedback` | Teacher comments | journal_entry_id, teacher_id, content |
| `lessons` | Topic lessons | classroom_id, teacher_id, title, summary, content_type, content_url, content_text, explanation, status, attachment_urls, order_index |
| `classroom_rules` | Strategy rules | classroom_id, rule_text, description |
| `learn_content` | Educational materials | classroom_id, lesson_id, module_id, content_type, content_url |
| `learn_progress` | Student progress | user_id, content_id, completed |
| `community_posts` | Forum posts | classroom_id, user_id, title, content, category, tags, post_type, shared_journal_data, journal_entry_id |
| `community_votes` | Post/comment votes (NEW Jan 29) | user_id, post_id, comment_id, vote_type (+1/-1) |
| `topic_reviews` | Classroom ratings/reviews (NEW Jan 29) | student_id, classroom_id, rating (1-5), review_text, teacher_response |
| `progress_reports` | Student analytics reports (NEW Jan 29) | user_id, classroom_id, period_start, period_end, report_data (JSONB), teacher_notes |
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

### Marketplace (NEW - Jan 29, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/courses` | GET | Public course catalog listing |
| `/api/reviews` | GET | Fetch reviews for a classroom |
| `/api/reviews` | POST | Create review (auth, one per student per classroom) |
| `/api/reviews` | PATCH | Update own review |

### Community (NEW - Jan 29, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/community/trade-review` | POST | Create trade review post from journal entry |

### Progress Reports (NEW - Jan 29, 2026)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reports/generate` | POST | Generate progress report (teacher auth) |
| `/api/reports/generate` | GET | Fetch reports (teacher or student) |
| `/api/reports/generate` | PATCH | Update teacher notes on report |

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

### Glass Command Center (Redesigned Jan 29, 2026)

The UI uses a 3-tier Apple-inspired frosted glassmorphism system with selective gold accents.

#### Glass Tiers
| Tier | Class | Blur | Saturate | Use |
|------|-------|------|----------|-----|
| Surface | `.glass-surface` | 16px | 1.2 | Base panels, sidebar, cards |
| Elevated | `.glass-elevated` | 24px | 1.3 | Active nav, interactive cards |
| Floating | `.glass-floating` | 36px | 1.4 | Modals, dropdowns, popovers |

All tiers include SVG frosted noise texture via `::before` pseudo-element (`mix-blend-mode: overlay`).

#### Colors
- **Background:** #050505 (warm dark with ambient gold/indigo gradients, `background-attachment: fixed`)
- **Gold Primary:** #F5A623 (warmer than original #FFB800)
- **Gold Light:** #FFCC4D
- **Gold Dark:** #D4911E
- **Gold Muted:** #A07818
- **Indigo Accent:** #6366F1 (secondary CTAs, info badges)
- **Success:** #22C55E
- **Danger:** #EF4444

#### Gold Usage Rules
- **Gold IS for:** `btn-gold` CTAs, active nav text, achievements, positive numbers, logo
- **Gold is NOT for:** Card backgrounds, every hover state, tab fills, section headers

#### Key CSS Classes
- `.glass-surface` / `.glass-elevated` / `.glass-floating` — panel tiers
- `.glass-interactive` — hover glow + lift
- `.glass-shimmer` — light sweep on hover
- `.btn-gold` / `.btn-glass` / `.btn-outline` — button hierarchy
- `.input-field` — glass input with gold focus ring
- `.skeleton-glass` — loading shimmer
- `.nav-active` — navigation active state

#### Typography
- Sans: Urbanist (primary)
- Mono: JetBrains Mono

#### Icons
- **Material Symbols Outlined** (Google) — all icons use `<span className="material-symbols-outlined">icon_name</span>`
- Icon wrapper: `src/components/ui/Icon.tsx` with size scale (sm=14px, md=20px, lg=24px, xl=30px)

---

## Session History

### Session: January 30, 2026 — Journal Enhancement System + Bug Fixes
**Agent:** Claude Opus 4.5
**Task:** Implement 9-enhancement journal system + fix loading/navigation bugs

**Journal Enhancement Plan (9 Enhancements):**
- **E1: Stepped Entry Form** — 3-step guided flow (Trade → Reflection → Go Deeper) replacing collapsible sections. Steps animate in with framer-motion.
- **E2: Progressive Unlock System** — 6 levels (1/3/7/15/30/50 trades). UnlockModal, LevelProgressBar. Level definitions in `progressiveLevels.ts`.
- **E3: Consistency Score** — 0-100 process quality score (rule adherence 40%, risk mgmt 25%, emotional discipline 20%, journaling consistency 15%). Circular gauge widget. Gated at Level 3.
- **E4: Post-Trade Reflection** — Inline card after submit with "what would you do differently?" + R-multiple comparison.
- **E5: Pre-Trade Nudges** — Contextual warnings (loss streaks, instrument win rates, day-of-week, emotion patterns). Gated at Level 5.
- **E6: Setup Tagging & Playbook** — Setup type picker + Playbook tab showing win rate per setup. "Your Edge" detection after 5+ trades.
- **E7: Weekly Review** — Guided reflection: week stats, #1 pattern, focus suggestion, last focus progress. Uses `weekly_focus` table.
- **E8: Trade Import** — CSV import (MT4/MT5/generic) + reflection swiper at `/journal/import`.
- **E9: Improved Filtering** — Filter journal by emotion, setup, instrument, outcome, R-multiple, date, tags, notes.

**Calendar Heatmap Update:**
- Day click now shows centered popout modal with backdrop instead of inline panel

**Bug Fixes:**
- Notifications: `createClient()` not memoized → infinite re-render loop
- Learn page: early return without `setIsLoading(false)` when no classroom_id
- `trades_logged` never incremented in SteppedEntryForm or QuickEntryBar
- Auth stale window too short (5s → 5min AUTH_STALE_MS)
- Auth loading could get stuck in finally block
- Playbook/LevelProgressBar: used `Math.max(onboarding.trades_logged, cachedStats.totalTrades)` for accurate counts
- Removed redundant Win/Loss Stats Card (duplicated MiniStatsBar data)
- PreviousTradeCard limit increased from 3 to 5

**New Files:** 25 (see CHANGELOG.md for full list)
**Modified Files:** 12+
**Build:** 0 errors

---

### Session: January 29, 2026 — Calendar Heatmap Redesign + Recent Trades UX
**Agent:** Claude Opus 4.5
**Task:** Replace 26-week heatmap with monthly calendar + insight panel; update RecentTrades close button

**Calendar Heatmap (`CalendarHeatmap.tsx`) — Complete Rewrite:**
- Replaced 26-week horizontal GitHub-style heatmap strip with single-month calendar grid
- 7-column Mon–Sun layout with `w-10 h-10 rounded-lg` cells, showing day number + trade count
- Month navigation (`<` / `>` buttons) around "January 2026" header
- Two-column layout: calendar (`lg:w-[60%]`) + insight panel (`lg:w-[40%]`), stacks on mobile
- `loadHeatmapData` uses `Promise.all` for two parallel Supabase queries: heatmap data + insight data (with `emotion_before`)
- Self-contained `generateInsight()` function with priority: negative emotion pattern > streak > best day of week > instrument focus > win rate fallback > low activity > no trades
- Insight panel: `glass-elevated` card with lightbulb icon + insight text, plus 3-column month stats (trades count, win rate, total R)
- Removed: `WEEKS` constant, `gridDates` memo, `monthLabels` memo, broken `absolute-ish` month header row
- Preserved: `DayData`/`DayEntry` interfaces, `getCellColor`/`getCellTextColor`, day click detail panel with `AnimatePresence`, today/selected ring highlights, future day disabling

**Recent Trades (`RecentTrades.tsx`):**
- Changed open trade close button from `<button>` opening `QuickCloseModal` to `<Link>` navigating to `/journal/${trade.id}`
- Removed `QuickCloseModal` import, `closingTrade` state, and modal render block

**Files Modified:** 2 (`CalendarHeatmap.tsx`, `RecentTrades.tsx`)
**Build:** 0 errors

---

### Session: January 29, 2026 — Glass Command Center Redesign
**Agent:** Claude Opus 4.5
**Task:** Frontend Redesign — Apple-inspired frosted glassmorphism

Complete visual overhaul following an 8-batch implementation plan:
- **Batch 1:** Design system foundation — new CSS variables, glass utility classes, updated Card/Button components
- **Batch 2:** Shared components — Icon.tsx (Material Symbols wrapper), GlassModal.tsx, updated Skeleton.tsx
- **Batch 3:** Layout shell — Sidebar, StatsHeader, MobileNav, Header converted to glass system
- **Batch 4:** Journal pages — restructured with glass panels
- **Batch 5:** Analytics redesign — hybrid overview grid + 3 deep-dive tabs
- **Batch 6:** Learn + Community — glass styling, Lucide→Material Symbols migration
- **Batch 7:** Remaining Lucide cleanup — all files converted
- **Batch 8:** Final polish — swept 70+ files replacing `card-bg`/`card-border` with glass classes, removed `lucide-react` dependency, cleaned dead CSS
- **Frosted finish:** Added SVG noise texture, increased background gradient warmth, added `saturate()` to backdrop-filter, increased border opacity

**Key Design Decisions:**
- Gold restricted to CTAs, active nav text, achievements, positive numbers only
- Indigo (#6366F1) as secondary accent for badges and secondary CTAs
- All glass panels have frosted noise overlay for Apple-style tactile feel
- Background gradients fixed-position so blur always has color to catch

**Files Created:** 2 (Icon.tsx, GlassModal.tsx)
**Files Modified:** 70+ (glass sweep + icon migration)
**Dependencies Removed:** `lucide-react`

---

### Session: January 29, 2026 ~02:00-03:30 UTC
**Agent:** Claude Opus 4.5
**Task:** Strategic Enhancement Plan — 4-Phase Implementation

Implemented the full competitive moat strategy across 4 phases using parallel subagent dispatching.

**Phase 1: TradingView Charts + Psychology Deepening**
- `lightweight-charts` v5 interactive chart in journal form (7 annotation tools)
- Pre-trade mindset capture (readiness 1-5 + tag badges)
- Psychology analytics tab + emotion flow Sankey diagram
- Files: TradingViewChart, ChartAnnotationToolbar, chartUtils, MindsetCapture, PsychologyAnalysis, EmotionFlow

**Phase 2: Teacher Marketplace Completion**
- Public teacher directory + profiles with SEO metadata
- Course catalog + detail pages (server-rendered)
- Ratings & reviews system (topic_reviews table, ReviewForm, ReviewCard, /api/reviews)
- Track record badge from trade call data
- Teacher profile editing (bio, slug, social links)

**Phase 3: Community Enhancement**
- Threaded discussions (3 levels) replacing flat comments
- Upvote/downvote with community_votes table
- Post categories, sort (hot/new/top), search
- Trade review post type with privacy controls + embedded charts
- Share to Community button on journal detail

**Phase 4: Teacher Analytics & Student Insights**
- Teacher student analytics dashboard (ClassAnalytics, StudentAlerts)
- Individual student deep-dive (6 tabs reusing analytics components)
- Automated progress reports (API + ProgressReport renderer)
- Student reports page at /journal/reports

**Code Review & Fixes:**
- Fixed N+1 query, missing auth checks, annotation duplication, classroom isolation, FK constraints, vote_type validation, delete ownership, shared utilities

**New Tables:** topic_reviews, community_votes, progress_reports
**Migrations:** 6 new SQL files (phase1a, 1b, 2a, 3a, 3b, 4b)
**Files Created:** ~40 new files
**Files Modified:** ~15 existing files

---

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

**Current State (as of Jan 30, 2026):**
- Project version: 0.1.0
- 165+ TypeScript files
- 120+ React components
- 26+ database tables (+ weekly_focus table)
- 9-enhancement journal system (stepped form, progressive levels, consistency score, reflection, nudges, playbook, weekly review, import, filtering)
- Interactive TradingView charts in journal with annotation tools
- Pre-trade psychology tracking (readiness + tags) with analytics
- Public teacher marketplace with profiles, course catalog, and reviews
- Threaded community discussions with voting and trade review sharing
- Teacher analytics dashboard with student deep-dive and progress reports
- All core features + trade calls, live sessions, curriculum tracks
- Apple-inspired frosted glassmorphism with 3-tier elevation system
- Material Symbols Outlined (no Lucide React)
- Monthly calendar heatmap with popout modal and behavioral insight panel

**Recent Development:**
1. **Journal Enhancement System + Bug Fixes** (Jan 30) — 9-enhancement journal system (stepped form, progressive levels, consistency score, reflection, nudges, playbook, weekly review, import, filtering), calendar popout modal, loading/navigation bug fixes
2. **Calendar Heatmap Redesign + Recent Trades UX** (Jan 29) — single-month calendar grid replacing 26-week strip, behavioral insight panel, RecentTrades close button navigates to detail page
3. **Glass Command Center Redesign** (Jan 29) — 3-tier frosted glassmorphism, SVG noise texture, icon migration to Material Symbols, 70+ file sweep
4. **Strategic Enhancement Plan** (Jan 29) — 4-phase implementation: charts, psychology, marketplace, community, teacher analytics, progress reports
5. **Teacher Flow Redesign** (Jan 28) — Topics + Lessons model, single-page lesson creation, dashboard rewrite
6. Teacher Portal Reimagination (Jan 21) — trade calls, curriculum, live sessions
7. Phase 1 retention features — daily check-in, streak protection, milestones
8. UX improvements — route-aware chrome, join flow
9. UI redesign — warm gold colors, 3D depth effects
10. Stripe Connect teacher pricing implementation
11. Premium tier features and analytics

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
12. **Charts (Jan 29)** - `lightweight-charts` v5 via `next/dynamic`. Components in `src/components/charts/`. Utilities in `src/lib/chartUtils.ts`. Chart data stored as JSONB on `journal_entries.chart_data`.
13. **Psychology (Jan 29)** - Mindset capture in `src/components/journal/MindsetCapture.tsx`. Analytics in `src/components/analytics/PsychologyAnalysis.tsx`. Data stored as JSONB on `journal_entries.pre_trade_mindset`.
14. **Marketplace (Jan 29)** - Public pages outside `(protected)` route group at `/teachers` and `/courses`. Components in `src/components/marketplace/` and `src/components/teacher/`. Server-rendered for SEO.
15. **Community (Jan 29)** - Threaded comments, voting, categories. Components in `src/components/community/`. Shared utils in `src/lib/communityUtils.ts`. Posts scoped to user's classrooms.
16. **Teacher Analytics (Jan 29)** - Dashboard at `/teacher/students`. Components in `src/components/teacher/` (ClassAnalytics, StudentAlerts). Student deep-dive reuses all analytics components.
17. **Progress Reports (Jan 29)** - API at `/api/reports/generate`. Component at `src/components/reports/ProgressReport.tsx`. Student page at `/journal/reports`.
18. **Supabase joins** - All `Relationships` arrays are empty in generated types. NEVER use join syntax like `profiles!user_id(...)`. Fetch related data in separate queries and merge with a Map.
19. **Glass system (Jan 29)** - Use `.glass-surface`, `.glass-elevated`, `.glass-floating` for panels. Never use inline `bg-[var(--card-bg)] border border-[var(--card-border)]`. Use `.btn-gold`, `.btn-glass`, `.input-field` for standard elements.
20. **Icons (Jan 29)** - Use `<span className="material-symbols-outlined">icon_name</span>` or the `Icon` component from `src/components/ui/Icon.tsx`. Do NOT import from `lucide-react` (removed).
21. **Gold restraint (Jan 29)** - Gold only on: `btn-gold` CTAs, active nav text color, achievement badges, positive stat numbers, logo. Use `glass-elevated` for active tabs/pills instead of gold background.
22. **Calendar Heatmap (Jan 29)** - `CalendarHeatmap.tsx` uses a single-month calendar grid (Mon–Sun, 7 columns) with `<`/`>` month navigation. Two-column layout: calendar (60%) + behavioral insight panel (40%). Insight panel generates one prioritized insight per month using emotion, streak, day-of-week, and instrument data. Stacks vertically on mobile.
23. **Recent Trades close button (Jan 29)** - Open trades in `RecentTrades.tsx` show a close button that navigates to `/journal/[id]` (the trade detail page) instead of opening a modal. The `QuickCloseModal` is no longer used by this component.
24. **Journal Enhancement System (Jan 30)** — 9 enhancements: E1 SteppedEntryForm (3-step), E2 Progressive Levels (6 tiers in `progressiveLevels.ts`), E3 Consistency Score (`consistencyScore.ts`), E4 PostTradeReflection, E5 PreTradeNudges (`nudgeEngine.ts`), E6 SetupTypePicker + PlaybookView, E7 WeeklyReview (`useWeeklyFocus.ts`), E8 TradeImport (`tradeImporter.ts`), E9 TradeFilters.
25. **Progressive Level hooks (Jan 30)** — `useProgressiveLevel` uses `Math.max(onboarding.trades_logged, cachedStats.totalTrades)` for accurate trade count. Both `SteppedEntryForm` and `QuickEntryBar` increment `onboarding_state.trades_logged` after successful insert.
26. **Calendar Heatmap popout (Jan 30)** — Day click shows centered fixed-position modal with `bg-black/40` backdrop overlay instead of inline panel. Click backdrop or X to dismiss.
27. **Auth stale window (Jan 30)** — `AUTH_STALE_MS` is 5 minutes (not 5 seconds). Controls how often auth re-initializes on navigation.
28. **Supabase client memoization** — Always wrap `createClient()` in `useMemo(() => createClient(), [])` in components. Unmemoized calls cause infinite re-render loops via useEffect dependency changes.

**Update this document** after significant changes to keep it current.

---

*Last Updated: January 30, 2026 — Journal Enhancement System + Bug Fixes*
