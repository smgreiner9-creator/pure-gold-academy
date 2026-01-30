# Pure Gold Trading Academy

A journaling-first trading education platform for active day and swing traders. Built with Next.js 16, Supabase, Stripe, and Tailwind CSS 4.

## Features

### For Students
- **Trade Journaling** - Log every trade with structured fields including entry/exit prices, position size, R-multiple, emotions (before, during, after), rule adherence checklist, and screenshot uploads
- **Home Dashboard** - Market news feed, trading session indicator showing active sessions and prime time, position size calculator, tracked instruments, and recent trades with quick-close navigation
- **Calendar Heatmap** - Monthly calendar view of trading activity with behavioral insight panel showing emotion patterns, streaks, and performance analytics
- **Learn Section** - Structured curriculum tracks with modules, progress tracking, and embedded YouTube/TradingView content
- **Trade Calls Feed** - View teacher's real-time trade calls with entry/exit levels, copy to journal
- **Live Sessions** - Join scheduled live trading streams from teachers
- **Community** - Threaded discussions with upvote/downvote, categories (Chart Analysis, Strategy, Psychology, Question, Trade Review), sort by hot/new/top, and trade review sharing with privacy controls
- **Interactive Charts** - TradingView `lightweight-charts` widget in journal with 7 annotation tools (entry, exit, SL, TP, trend lines, text)
- **Pre-Trade Psychology** - Readiness score (1-5) and quick-tag capture (FOMO, Revenge, Confident, etc.) before each trade
- **Psychology Analytics** - Insights into how mental state correlates with trade outcomes
- **Progress Reports** - Teacher-generated analytics reports with strengths, improvements, emotion breakdown, and personalized notes
- **Notifications** - Real-time alerts for teacher feedback, community responses, and system updates
- **Public Strategies** - Discover and join public strategies from the marketplace listing

### For Teachers
- **Topics & Lessons** - Create topics (e.g. "Forex Basics"), add lessons with video/chart/PDF/text content, explanation, and attachments. Single-page lesson creation with inline topic management
- **Topic Pricing** - Set topics as free or paid (per-topic monthly subscription via Stripe Connect)
- **Trade Calls** - Post real-time trade ideas with instrument, direction, entry, SL, TPs, analysis, and TradingView charts
- **Live Sessions** - Schedule and manage live trading streams with YouTube/Twitch/Zoom integration
- **Minimal Dashboard** - Student count, earnings overview, and topic list with floating "Add Lesson" button
- **Student Analytics Dashboard** - Class-wide win rate trends, R-multiple charts, emotion patterns, rule adherence, student alerts (inactive, losing streaks), individual student deep-dive with 6 analytics tabs
- **Progress Reports** - Generate weekly/monthly reports per student with computed analytics, strengths/weaknesses, and teacher notes
- **Public Profile** - Customizable teacher profile with bio, social links, and URL slug at `/teachers/[slug]`
- **Track Record Badge** - Verified win rate and stats from trade call history (auto-computed, 10+ calls required)
- **Course Marketplace** - Public course catalog at `/courses` with ratings, reviews, and SEO
- **Journal Review** - Browse and provide feedback on student trade journals

### Subscription Tiers
- **Free** - Basic journaling, position calculator, session indicator, community access, limited content
- **Premium ($2.80/month)** - Unlimited journals, advanced analytics, all content, priority feedback, data export

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (screenshots, content files)
- **Styling**: Tailwind CSS 4 with 3-tier glassmorphism design system
- **Animation**: Framer Motion (scroll-triggered reveals, parallax, stagger)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Material Symbols Outlined (Google)
- **Fonts**: Urbanist (primary), JetBrains Mono (monospace)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd pure-gold-academy
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your Supabase credentials to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the contents of `supabase/schema.sql`

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Auth pages (login, signup)
│   ├── (protected)/       # Protected routes requiring auth
│   │   ├── dashboard/     # Student dashboard
│   │   ├── journal/       # Trade journaling
│   │   ├── learn/         # Educational content
│   │   │   ├── live/      # Live sessions view
│   │   │   └── tracks/    # Curriculum track detail
│   │   ├── community/     # Threaded discussions + voting
│   │   ├── classroom/     # Classroom join flow
│   │   ├── notifications/ # Notifications
│   │   ├── settings/      # User settings
│   │   └── teacher/       # Teacher backend
│   │       ├── topics/        # Topic management & detail
│   │       ├── lessons/new/   # Single-page lesson creation
│   │       ├── trade-calls/   # Trade calls management
│   │       ├── live/          # Live sessions scheduling
│   │       └── settings/      # Teacher settings
│   └── api/               # API routes
│       ├── stripe/        # Stripe integration endpoints
│       ├── topics/        # Topic CRUD
│       ├── lessons/       # Lesson CRUD (dual-writes to learn_content)
│       ├── trade-calls/   # Trade calls CRUD + follow
│       ├── curriculum/    # Tracks & modules CRUD
│       └── live-sessions/ # Live sessions CRUD
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components (Sidebar, Header)
│   ├── dashboard/         # Dashboard widgets
│   ├── journal/           # Journal components
│   ├── analytics/         # Analytics charts (EquityCurve, EmotionCorrelation, EmotionFlow, PsychologyAnalysis, etc.)
│   ├── charts/            # TradingView chart widget + annotation toolbar
│   ├── community/         # ThreadedComment, VoteButton, PostFilters, TradeReviewPost
│   ├── learn/             # Learn section components
│   ├── marketplace/       # CourseCard, CourseFilters, ReviewCard, ReviewForm
│   ├── reports/           # ProgressReport renderer
│   ├── teacher/           # LessonForm, TopicSelector, TopicsList, TeacherFAB, ClassAnalytics, StudentAlerts, TeacherProfileCard, TrackRecordBadge
│   ├── trade-calls/       # Trade call card & form
│   └── embeds/            # YouTube & TradingView embeds
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and clients
│   ├── supabase/          # Supabase client setup
│   └── embedUtils.ts      # YouTube/TradingView URL parsing
├── store/                 # Zustand state stores
└── types/                 # TypeScript type definitions
```

## Database Schema

The application uses the following main tables:

### Core Tables
- `profiles` - User profiles with role (student/teacher) and subscription info
- `classrooms` - Teacher-created classrooms with invite codes, branding, and feature flags
- `lessons` - Lessons inside a topic (classroom), with content_type, content_url, content_text, explanation, status, attachment_urls
- `journal_entries` - Trade journal entries with all trade data
- `journal_feedback` - Teacher feedback on journal entries
- `learn_content` - Educational content (video, PDF, image, text, YouTube, TradingView)
- `learn_progress` - Student progress on content

### Trade Calls (NEW - Jan 21, 2026)
- `trade_calls` - Teacher trade ideas with instrument, direction, entry/SL/TPs, analysis
- `trade_call_follows` - Tracks which students followed/copied trade calls

### Curriculum System (NEW - Jan 21, 2026)
- `curriculum_tracks` - Learning paths (beginner/intermediate/advanced) with prerequisites
- `track_modules` - Modules within tracks grouping content
- `track_progress` - Student progress through curriculum tracks

### Live Sessions (NEW - Jan 21, 2026)
- `live_sessions` - Scheduled live streams with status (scheduled/live/ended)
- `session_attendees` - Tracks student attendance at live sessions

### Community & Notifications
- `community_posts` - Discussion posts with categories, tags, post types, trade review data
- `community_comments` - Threaded comments (parent_comment_id for replies)
- `community_votes` - Upvote/downvote on posts and comments (NEW Jan 29)
- `notifications` - User notifications

### Marketplace (NEW - Jan 29, 2026)
- `topic_reviews` - Student ratings and reviews for classrooms (1-5 stars + text)

### Progress Reports (NEW - Jan 29, 2026)
- `progress_reports` - Teacher-generated student analytics reports with computed data

### Payments & Subscriptions
- `subscriptions` - Stripe subscription data
- `teacher_stripe_accounts` - Teacher Stripe Connect accounts
- `classroom_pricing` - Classroom subscription pricing
- `content_purchases` - Individual content sales

### Other
- `watched_instruments` - User's watched trading instruments
- `daily_checkins` - Activity tracking and streaks
- `classroom_rules` - Strategy-level rules

See `supabase/schema.sql` and `supabase/migrations/` for the complete schema with RLS policies.

## Stripe Integration

Stripe powers premium subscriptions, classroom subscriptions, and teacher payouts via Connect.

1. Add Stripe keys to `.env.local`:
```
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

2. Create products and prices in Stripe Dashboard

3. Set up webhook endpoint in Stripe pointing to `/api/webhooks/stripe`

## User Roles

### Student
- Default role on signup
- Access to journaling, learn, community, dashboard
- Can join classrooms via invite codes
- Free or premium subscription

### Teacher
- Selected during signup
- Full access to teacher backend
- Can create classrooms and upload content
- Can review student journals and provide feedback
- Classroom pricing is configurable; payouts use Stripe Connect

## Visual Theme

The app uses a **Glass Command Center** aesthetic — Apple-inspired frosted glassmorphism with a 3-tier elevation system, selective gold accents, and a warm dark background with ambient color gradients.

### Design System

#### 3-Tier Glass Elevation
| Tier | Class | Blur | Use Case |
|------|-------|------|----------|
| Surface | `.glass-surface` | 16px + saturate | Base panels, sidebar, cards at rest |
| Elevated | `.glass-elevated` | 24px + saturate | Active nav, interactive cards, hovered items |
| Floating | `.glass-floating` | 36px + saturate | Modals, dropdowns, popovers |

All glass panels include an SVG frosted noise texture overlay (`mix-blend-mode: overlay`) for a tactile, Apple-style frosted feel.

#### Colors
| Variable | Value | Purpose |
|----------|-------|---------|
| `--background` | `#050505` | Page background |
| `--foreground` | `#F8FAFC` | Primary text |
| `--gold` | `#F5A623` | Brand accent (warmer gold) |
| `--gold-light` | `#FFCC4D` | Gold hover/highlight |
| `--gold-dark` | `#D4911E` | Gold pressed state |
| `--gold-muted` | `#A07818` | Subtle gold accents |
| `--accent` | `#6366F1` | Indigo secondary accent |
| `--success` | `#22C55E` | Positive/win |
| `--danger` | `#EF4444` | Negative/loss |

#### Gold Usage Rules
- **Gold IS for:** Primary CTA buttons (`btn-gold`), active nav text, achievements, positive numbers, logo
- **Gold is NOT for:** Card backgrounds, every hover state, tab backgrounds, section headers

#### CSS Utility Classes
- `.glass-surface` / `.glass-elevated` / `.glass-floating` — 3-tier glassmorphism panels with frosted noise
- `.glass-interactive` — Hover border glow + lift animation
- `.glass-shimmer` — Light sweep effect on hover
- `.btn-gold` — Primary gold gradient CTA button
- `.btn-glass` — Secondary glass button with blur
- `.btn-outline` — Tertiary outline button
- `.input-field` — Glass input with blur and gold focus ring
- `.gold-shimmer-text` — Animated gold gradient sweep on text (landing page)
- `.mesh-bg` — Drifting radial gradient background (landing page)
- `.particle` / `.particle-field` — Floating gold particle effect (landing page)
- `.animated-border` — Rotating conic-gradient border (landing page)

### Accessibility
- `prefers-reduced-motion: reduce` disables all animations and hides particles
- Semantic HTML (`<header>`, `<main>`, `<section>`, `<footer>`)
- `focus-visible` ring styles on all interactive elements
- Gold on black contrast ratio ~15:1 (AAA)

## Development

```bash
# Run development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Updates

See [CHANGELOG.md](./CHANGELOG.md) for full history.

- **2026-01-29** - **Calendar Heatmap Redesign + Recent Trades UX** (Claude Opus 4.5)
  - Replaced 26-week horizontal GitHub-style heatmap with single-month calendar grid (Mon–Sun, 7 columns) with `<`/`>` month navigation
  - Two-column layout: calendar (60%) + behavioral insight panel (40%) showing monthly emotion patterns, streaks, best day, instrument focus
  - Insight panel includes month stats row (trades count, win rate, total R)
  - Open trades in Recent Trades card now navigate to detail page instead of opening a close modal
  - Removed broken month header row, unused `QuickCloseModal` references

- **2026-01-29** - **Glass Command Center: Frontend Redesign** (Claude Opus 4.5)
  - Complete visual overhaul from flat dark cards to Apple-inspired frosted glassmorphism
  - 3-tier glass elevation system: Surface (16px blur), Elevated (24px blur), Floating (36px blur)
  - SVG frosted noise texture on all glass panels with `mix-blend-mode: overlay`
  - Warmer gold palette (#F5A623 replacing #FFB800) with restrained usage rules
  - Indigo secondary accent (#6366F1) for informational badges and secondary CTAs
  - `saturate()` filter on all backdrop-filter for Apple-style color amplification
  - Warm ambient background gradients (gold + indigo radials) with `background-attachment: fixed`
  - New CSS classes: `.glass-surface`, `.glass-elevated`, `.glass-floating`, `.glass-interactive`, `.glass-shimmer`, `.btn-gold`, `.btn-glass`, `.btn-outline`, `.input-field`, `.skeleton-glass`, `.nav-active`
  - New components: `Icon.tsx` (Material Symbols wrapper), `GlassModal.tsx` (reusable modal)
  - Replaced ALL Lucide React icons with Material Symbols Outlined across 30+ files
  - Swept 70+ files replacing inline `card-bg`/`card-border` with glass utility classes
  - Removed `lucide-react` dependency entirely from project
  - Build passes clean with zero Lucide imports and zero card-bg/card-border outside variable definitions

- **2026-01-29 ~02:00-03:30 UTC** - **Strategic Enhancement Plan: 4-Phase Implementation** (Claude Opus 4.5)
  - **Phase 1**: Interactive TradingView charts in journal (annotation tools, chart state as JSON), pre-trade mindset capture (readiness 1-5 + psychology tags), Psychology analytics tab, emotion flow Sankey diagram
  - **Phase 2**: Public teacher directory + profiles (`/teachers`, `/teachers/[slug]`), course catalog + detail (`/courses`, `/courses/[id]`), ratings & reviews system, track record verification badge, teacher profile editing
  - **Phase 3**: Threaded discussions (3 levels deep), upvote/downvote system, post categories + sort + search, trade review post type with privacy-controlled journal sharing, "Share to Community" button
  - **Phase 4**: Teacher student analytics dashboard (class-wide trends, alerts), individual student deep-dive (6 tabs), automated progress reports (`/api/reports/generate`), student reports page (`/journal/reports`)
  - **Code review fixes**: N+1 queries, auth checks, annotation duplication, classroom isolation, FK constraints, vote validation, delete ownership, shared utilities
  - **New tables**: `topic_reviews`, `community_votes`, `progress_reports`
  - **6 new migrations**, ~40 new files, ~15 modified files

- **2026-01-28** - **Landing Page Redesign: "Liquid Gold"** (Claude Opus 4.5)
  - Complete rewrite of `page.tsx` as `"use client"` with Framer Motion animations
  - Glassmorphic header with scroll-based blur, mobile hamburger menu
  - Full-viewport hero with mesh gradient, floating gold particles, parallax, gold shimmer text
  - 6-card features grid (Trade Journal, Topics & Lessons, Trade Calls, Live Sessions, Community, Teacher Classrooms)
  - Interactive journal demo with auto-typing terminal mock and feature checklist
  - Dedicated "For Educators" section with 3-card value prop
  - Pricing section with animated rotating conic-gradient border on premium card
  - Final CTA with pulsing gold glow button
  - ~130 lines of new CSS: 6 keyframes, glassmorphism utilities, particle system, `@property` border animation
  - `prefers-reduced-motion` support: disables all animations, hides particles, shows full text
  - Font changed from Inter to **Urbanist** (sleek, geometric, modern luxury)
  - Custom logo (`public/logo.jpg`) replacing generic "P" placeholder in header and footer
  - Added `framer-motion` dependency
  - Dual CTAs targeting both students and teachers

- **2026-01-28** - **Teacher Flow Redesign: Topics + Lessons** (Claude Opus 4.5)
  - **Simplified Teacher Model**: Replaced scattered multi-page flow (Classroom → Strategy Wizard → Content Management → Pricing → Curriculum) with streamlined Topics + Lessons model. Teachers login, add lesson, set price, done.
  - **Topics**: `classrooms` table reused as topics. Per-topic pricing (free or paid). Inline topic creation from lesson form.
  - **Single-Page Lesson Creation**: `/teacher/lessons/new` with icon-based content type picker (Video/Chart/PDF/Text), primary content + optional attachments, always-present explanation field, draft/publish states.
  - **New Components**: `LessonForm`, `TopicSelector` (with inline creation), `TopicsList`, `TeacherFAB` (floating Add Lesson button)
  - **New Pages**: `/teacher/topics` (listing), `/teacher/topics/[id]` (detail with inline edit), `/teacher/lessons/new`
  - **New API Routes**: `/api/topics` (GET, POST), `/api/lessons` (POST with dual-write to `learn_content`)
  - **Dashboard Rewrite**: Teacher dashboard reduced from 609 to ~160 lines. 2 stats (students + earnings) + topic list.
  - **Sidebar Update**: Teacher sub-navigation (Dashboard, My Topics, Add Lesson, Trade Calls, Live Sessions, Settings) when on `/teacher` routes
  - **Backward Compatibility**: Dual-write to `learn_content` table for student learn pages. Old URLs redirect to new equivalents.
  - **Security**: All mutations routed through API routes with server-side auth + ownership checks. Client components read-only via Supabase.
  - **Database Migration**: `supabase/migrations/20260128_topic_simplification.sql` (new columns on `lessons` + storage bucket)

- **2026-01-21 ~14:00-18:00 EST** - **Teacher Portal Reimagination** (Claude Opus 4.5)
  - **Trade Calls System**: Teachers can post real-time trade ideas with instrument, direction, entry, SL, TPs (1-3), timeframe, analysis text, and TradingView chart URLs. Students see calls in feed and can copy to journal.
  - **Curriculum Tracks**: Structured learning paths with difficulty levels (beginner/intermediate/advanced), prerequisite unlocking, and modules for organizing content.
  - **Live Sessions**: Teachers can schedule live streams, go live, and end sessions. Students see upcoming/live sessions with countdown timers.
  - **Embed Support**: YouTube video embeds with thumbnail preview, TradingView chart embeds, auto-detection from pasted URLs.
  - **Classroom Enhancements**: Added tagline, logo_url, banner_url, trading_style, markets array, and feature flags for trade_calls, live_sessions, curriculum.
  - **New Components**: TradeCallCard, TradeCallForm, YouTubeEmbed, TradingViewEmbed, EmbedPicker
  - **New API Routes**: /api/trade-calls, /api/trade-calls/follow, /api/curriculum/tracks, /api/curriculum/modules, /api/live-sessions
  - **Database**: 7 new tables with full RLS policies, updated classrooms and profiles tables
  - **Migration**: `supabase/migrations/20260121_teacher_portal_reimagine.sql`

- **2026-01-20 19:26 EST** - Applied performance-focused refactors: deferred public strategy loading, tightened hook deps, memoized derived data, and switched to `next/image` with Supabase remote patterns.

- **2026-01-20 18:29 EST** - Added lessons + strategy rules, guided strategy setup flow, public strategies, and image explanations.

## License

MIT
