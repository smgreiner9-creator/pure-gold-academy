# Pure Gold Trading Academy

A journaling-first trading education platform for active day and swing traders. Built with Next.js 16, Supabase, Stripe, and Tailwind CSS 4.

## Features

### For Students
- **Trade Journaling** - Log every trade with structured fields including entry/exit prices, position size, R-multiple, emotions (before, during, after), rule adherence checklist, and screenshot uploads
- **Home Dashboard** - Market news feed, trading session indicator showing active sessions and prime time, position size calculator, and tracked instruments
- **Learn Section** - Structured curriculum tracks with modules, progress tracking, and embedded YouTube/TradingView content
- **Trade Calls Feed** - View teacher's real-time trade calls with entry/exit levels, copy to journal
- **Live Sessions** - Join scheduled live trading streams from teachers
- **Community** - Discussion area with signal-prevention system to maintain educational focus
- **Notifications** - Real-time alerts for teacher feedback, community responses, and system updates
- **Public Strategies** - Discover and join public strategies from the marketplace listing

### For Teachers
- **Topics & Lessons** - Create topics (e.g. "Forex Basics"), add lessons with video/chart/PDF/text content, explanation, and attachments. Single-page lesson creation with inline topic management
- **Topic Pricing** - Set topics as free or paid (per-topic monthly subscription via Stripe Connect)
- **Trade Calls** - Post real-time trade ideas with instrument, direction, entry, SL, TPs, analysis, and TradingView charts
- **Live Sessions** - Schedule and manage live trading streams with YouTube/Twitch/Zoom integration
- **Minimal Dashboard** - Student count, earnings overview, and topic list with floating "Add Lesson" button
- **Student Analytics** - View student performance, journal activity, and progress metrics
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
- **Styling**: Tailwind CSS 4 with custom Black & Gold theme
- **Animation**: Framer Motion (scroll-triggered reveals, parallax, stagger)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
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
│   │   ├── community/     # Discussion area
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
│   ├── analytics/         # Analytics charts
│   ├── learn/             # Learn section components
│   ├── teacher/           # Teacher components (LessonForm, TopicSelector, TopicsList, TeacherFAB)
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
- `community_posts` - Discussion posts
- `community_comments` - Comments on posts
- `notifications` - User notifications

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

The app uses a "Liquid Gold" aesthetic — deep glassmorphism, animated gold particles, and a dark obsidian background.

### Colors
| Variable | Value | Purpose |
|----------|-------|---------|
| `--background` | `#050505` | Page background |
| `--foreground` | `#F8FAFC` | Primary text |
| `--gold` | `#FFB800` | Brand accent |
| `--gold-light` | `#FFD54F` | Gold hover state |
| `--gold-dark` | `#E5A500` | Gold pressed state |
| `--card-bg` | `#0F0F0F` | Card backgrounds |
| `--glass-bg` | `rgba(15,15,15,0.6)` | Glassmorphism fill |
| `--glass-border` | `rgba(255,184,0,0.12)` | Glass border |
| `--success` | `#22C55E` | Positive/win |
| `--danger` | `#EF4444` | Negative/loss |

### CSS Utilities
- `.glass` / `.glass-hover` — Glassmorphism panels with backdrop blur
- `.gold-shimmer-text` — Animated gold gradient sweep on text
- `.mesh-bg` — Drifting radial gradient background
- `.particle` / `.particle-field` — Floating gold particle effect
- `.animated-border` — Rotating conic-gradient border (premium card)
- `.typing-cursor` — Blinking gold cursor for auto-type effect

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
