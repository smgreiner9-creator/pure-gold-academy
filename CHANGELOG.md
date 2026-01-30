# Changelog

All notable changes to Pure Gold Academy are documented in this file.

---

## [Unreleased]

---

## 2026-01-29 — Calendar Heatmap Redesign + Recent Trades UX

### Changed
- **Calendar Heatmap** — replaced 26-week horizontal GitHub-style heatmap strip with a **single-month calendar grid** (7-column Mon–Sun layout) and month navigation (`<` / `>` buttons). Two-column layout: calendar (60%) + behavioral insight panel (40%), stacking vertically on mobile.
- **Behavioral insight panel** — right-side `glass-elevated` card showing the most relevant monthly insight (negative emotion patterns, streaks, best day of week, instrument focus, win rate, or low activity fallback) plus month stats row (trades count, win rate, total R).
- **Recent Trades close button** — open trades now show a close button (`check_circle` icon) that navigates to the trade detail page (`/journal/[id]`) instead of opening the `QuickCloseModal`. Removed `QuickCloseModal` import, state, and render block from `RecentTrades.tsx`.

### Removed
- **26-week heatmap grid** — `WEEKS` constant, `gridDates` memo, `monthLabels` memo, and broken `absolute-ish` month header row all removed from `CalendarHeatmap.tsx`
- **`QuickCloseModal`** reference in `RecentTrades.tsx` — component import and associated state removed

---

## 2026-01-29 — Glass Command Center: Frontend Redesign

### Added
- **3-tier glass elevation system** — Surface (16px blur), Elevated (24px blur), Floating (36px blur) with CSS utility classes `.glass-surface`, `.glass-elevated`, `.glass-floating`
- **SVG frosted noise texture** on all glass panels via `::before` pseudo-element with `mix-blend-mode: overlay` — creates Apple-style tactile frosted glass feel
- **`saturate()` filter** on all `backdrop-filter` declarations (1.2x surface, 1.3x elevated, 1.4x floating) for color amplification through glass
- **Warm ambient background gradients** — gold radials at 20%/10%/8% opacity + subtle indigo accent gradient, with `background-attachment: fixed` so blur always has color to catch
- **New CSS utility classes:** `.glass-interactive` (hover glow + lift), `.glass-shimmer` (light sweep), `.btn-gold` (primary CTA), `.btn-glass` (secondary), `.btn-outline` (tertiary), `.input-field` (glass input with focus ring), `.skeleton-glass` (loading shimmer), `.nav-active` (navigation highlight)
- **`Icon.tsx` component** — Material Symbols wrapper with size scale (sm/md/lg/xl)
- **`GlassModal.tsx` component** — Reusable modal with `glass-floating` tier, backdrop blur, AnimatePresence, Escape handler
- **Indigo secondary accent** (`--accent: #6366F1`) for informational badges and secondary CTAs
- **Gold usage rules** — gold restricted to primary CTAs, active nav text, achievements, positive numbers, and logo only

### Changed
- **Gold palette warmed** — `--gold` changed from `#FFB800` to `#F5A623`, all gold variants updated
- **Glass border opacity increased** — Surface 6%→9%, Elevated 10%→13%, Floating 14%→18% for sharper panel edges
- **Glass backgrounds more translucent** — Surface opacity 0.65→0.55, Elevated 0.72→0.62, Floating 0.80→0.72 to let ambient gradients show through
- **Body background** — gradient intensity increased from 12%→20% gold opacity, added indigo accent gradient
- **All Lucide React icons replaced** with Material Symbols Outlined across 30+ component files
- **70+ files swept** — all inline `bg-[var(--card-bg)] border border-[var(--card-border)]` replaced with glass utility classes
- **Active pills/tabs** — changed from `bg-[var(--gold)] text-black` to `glass-elevated text-[var(--gold)]`
- **Inputs** — standardized to `.input-field` class with backdrop blur and gold focus ring
- **Modals** — standardized to `.glass-floating` tier
- **Buttons** — cancel/secondary buttons standardized to `.btn-glass`
- **Card.tsx** — added `tier` prop (`'surface' | 'elevated' | 'floating'`), `interactive` boolean, `shimmer` boolean
- **Button.tsx** — added `'glass'` variant
- **Sidebar** — `sidebar-3d` replaced with `glass-surface`, active nav uses glass pill
- **StatsHeader** — simplified, glass-surface styling
- **MobileNav** — `mobile-nav-3d` replaced with `glass-surface`, glass-floating menu sheet

### Removed
- **`lucide-react` dependency** — fully removed from `package.json` and `node_modules`
- **Old CSS classes** — `.sidebar-3d`, `.mobile-nav-3d`, broad `[class*="border-[var(--card-border)]"]` attribute selectors
- **Old card system** — inline `bg-[var(--card-bg)]` / `border-[var(--card-border)]` patterns replaced with glass tiers

---


## 2026-01-29 ~02:00 UTC — Strategic Enhancement Plan: 4-Phase Implementation

### Added

**Phase 1: TradingView Charts + Psychology Deepening**
- **TradingView chart widget** in journal entry form — interactive `lightweight-charts` v5 chart with annotation toolbar (horizontal line, trend line, entry, exit, SL, TP, text). Chart state serialized as JSON and saved with entry. Displayed read-only on journal detail page.
- **Pre-trade mindset capture** — inline readiness slider (5 tappable gold dots) and quick-tag badges (Revenge, FOMO, Confident, Uncertain, Tired) at top of journal form Step 1. Data stored as `pre_trade_mindset JSONB`.
- **Psychology analytics tab** — new "Psychology" tab in Advanced Analytics showing readiness score impact, mindset tag impact, readiness trend SVG line chart, and combined patterns.
- **Emotion flow Sankey diagram** — SVG-based Before → During → After emotion transition visualization with cubic bezier paths colored by outcome. Insight cards for worst loss-rate and best win-rate paths.
- **New files:** `TradingViewChart.tsx`, `ChartAnnotationToolbar.tsx`, `chartUtils.ts`, `MindsetCapture.tsx`, `PsychologyAnalysis.tsx`, `EmotionFlow.tsx`
- **New dependency:** `lightweight-charts` (TradingView's free charting library)
- **Migration:** `20260128_phase1a_chart_data.sql`, `20260128_phase1b_mindset.sql`

**Phase 2: Teacher Marketplace Completion**
- **Public teacher directory** at `/teachers` — server-rendered with SEO metadata, search/filter, teacher cards with avatar, bio, star rating, verification badge, and topic counts.
- **Public teacher profiles** at `/teachers/[slug]` — bio, social links (Twitter/YouTube/Discord), track record badge (verified win rate from trade call data), classrooms grid, reviews section.
- **Teacher profile editing** in `/teacher/settings` — bio textarea (500 chars), URL slug with preview, social links inputs, save to Supabase.
- **Course catalog** at `/courses` — server-rendered public page with client-side filtering (market, price, sort). Course cards with logo, teacher info, lesson count, rating, price badge.
- **Course detail** at `/courses/[id]` — lesson list with content-type icons, pricing sidebar with CTA, teacher section, student reviews.
- **Ratings & reviews system** — `ReviewForm` (star selector + text), `ReviewCard` (avatar, stars, teacher response), `/api/reviews` (GET/POST/PATCH with auth and duplicate handling).
- **Track record verification badge** — displays verified trade call stats (total calls, win rate, avg return) when teacher has 10+ closed calls.
- **New files:** `TeacherProfileCard.tsx`, `TrackRecordBadge.tsx`, `TeacherDirectoryClient.tsx`, `TeacherProfileClient.tsx`, `CourseCard.tsx`, `CourseFilters.tsx`, `CourseCatalogClient.tsx`, `ReviewCard.tsx`, `ReviewForm.tsx`, `/api/courses/route.ts`, `/api/reviews/route.ts`
- **New table:** `topic_reviews` with RLS policies
- **Migration:** `20260128_phase2a_teacher_profiles.sql`

**Phase 3: Community Enhancement**
- **Threaded discussions** — recursive `ThreadedComment` component (max 3 levels deep) with indentation and left border. Inline reply forms. `parent_comment_id` on `community_comments`.
- **Voting system** — `VoteButton` component with upvote/downvote arrows, gold/red active states. New `community_votes` table with unique constraints. Optimistic vote updates with rollback.
- **Post categories & filtering** — `PostFilters` component with category pills (Chart Analysis, Strategy, Psychology, Question, Trade Review, General), sort by Hot/New/Top, search input.
- **Trade review post type** — share journal entries to community with privacy controls (show P&L, emotions, chart). `TradeReviewPost` component renders trade details with embedded TradingView chart in read-only mode.
- **"Share to Community" button** on journal detail page — modal with privacy toggles, title, analysis textarea. Creates post with `post_type: 'trade_review'`.
- **New files:** `ThreadedComment.tsx`, `VoteButton.tsx`, `PostFilters.tsx`, `TradeReviewPost.tsx`, `communityUtils.ts`, `/api/community/trade-review/route.ts`
- **New table:** `community_votes`
- **Migrations:** `20260128_phase3a_community.sql`, `20260128_phase3b_trade_reviews.sql`

**Phase 4: Teacher Analytics & Student Insights**
- **Teacher student analytics dashboard** — expanded `/teacher/students` with overview cards (total students, avg win rate, avg R, active journalers), ClassAnalytics component (SVG win rate trend, R-multiple trend, emotion patterns, rule adherence), StudentAlerts (inactive 7+ days, losing streaks, low rule adherence).
- **Individual student deep-dive** at `/teacher/students/[id]` — 6 tabs (Overview with equity curve + recent trades, Emotions, Rules, Psychology, Journals, Feedback). Reuses all Phase 1 analytics components.
- **Automated progress reports** — `/api/reports/generate` (POST to generate, GET to fetch, PATCH for teacher notes). Computes win rate, avg R, streaks, emotion breakdown, rule adherence, strengths/weaknesses, comparison to previous period. Upserts into `progress_reports` table.
- **Progress report renderer** — `ProgressReport` component with summary cards, strengths (green), improvement areas (amber), emotion breakdown bars, rule adherence progress bars, best/worst trade summaries, editable teacher notes.
- **Student reports page** at `/journal/reports` — grouped by classroom, expandable report cards with period stats.
- **New files:** `ClassAnalytics.tsx`, `StudentAlerts.tsx`, `ProgressReport.tsx`, `/api/reports/generate/route.ts`, `/journal/reports/page.tsx`
- **New table:** `progress_reports` with RLS policies
- **Migration:** `20260128_phase4b_progress_reports.sql`

### Changed
- **Journal entry form** — expanded from 3-step to 4-step flow (Step 1: Trade Details + Mindset, Step 2: Chart Your Trade, Step 3: Review, Step 4: Notes)
- **Journal detail page** — added Trade Chart section (read-only TradingView), Pre-Trade Mindset section (readiness dots + tag pills), Share to Community button
- **Analytics page** — added Psychology tab with `PsychologyAnalysis` component
- **Emotion correlation** — replaced placeholder with `EmotionFlow` Sankey diagram in expanded view
- **Community pages** — complete rewrite with threaded comments, voting, categories, classroom-scoped posts
- **Teacher students page** — major rewrite into full analytics dashboard with tabs
- **Teacher student detail** — expanded from basic overview to 6-tab deep-dive
- **Teacher settings** — added Public Profile editing section (bio, slug, social links)
- **Database types** — added `chart_data`, `pre_trade_mindset` on journal_entries; `bio`, `social_links`, `slug` on profiles; `category`, `tags`, `post_type`, `shared_journal_data`, `journal_entry_id` on community_posts; `parent_comment_id` on community_comments; new tables: `community_votes`, `topic_reviews`, `progress_reports`

### Fixed (Code Review — 2026-01-29 ~03:30 UTC)
- **N+1 query** in community feed — replaced per-post comment count queries with single batch fetch
- **Missing auth check** on teacher student detail — added classroom ownership verification before loading student data
- **Chart annotation duplication** — track price line refs and remove before re-adding in useEffect
- **Community tenant isolation** — posts now filtered by user's subscribed classroom IDs
- **Reports API auth** — added classroom ownership validation in GET handler
- **FK constraints** — added `REFERENCES ... ON DELETE CASCADE` to `progress_reports` migration
- **Unsafe vote_type cast** — replaced `as 1 | -1` with runtime validation
- **Delete ownership** — added `.eq('user_id', profile.id)` defense-in-depth on comment/post deletes
- **Duplicate utilities** — extracted `formatDate`, `getCategoryColor`, `getCategoryLabel` to `communityUtils.ts`

---

## 2026-01-28 — Landing Page Redesign: "Liquid Gold"

### Added
- **Framer Motion** dependency for scroll-triggered animations, parallax, and stagger reveals
- **Glassmorphic header** with `useScroll`/`useTransform` for dynamic blur and opacity on scroll
- **Mobile hamburger menu** with `AnimatePresence` overlay below `md` breakpoint
- **Full-viewport hero** with mesh gradient background, floating gold particles, parallax drift, and gold shimmer text
- **6-card features grid**: Trade Journal, Topics & Lessons, Trade Calls, Live Sessions, Community, Teacher Classrooms
- **Journal demo section**: split layout with auto-typing terminal mock (`useAutoType` hook) and feature checklist
- **"For Educators" section**: badge pill, 3-card value prop (Create & Publish, Go Live, Earn), dedicated CTA
- **Pricing section**: glassmorphic Free card, animated rotating conic-gradient border on Premium card (`@property --border-angle`)
- **Final CTA section**: mesh background, particle field, pulsing gold glow button
- **CSS keyframes**: `particle-float`, `mesh-drift`, `gold-shimmer`, `pulse-glow`, `border-rotate`, `blink-cursor`
- **CSS utilities**: `.glass`, `.glass-hover`, `.gold-shimmer-text`, `.mesh-bg`, `.particle-field`/`.particle`, `.typing-cursor`, `.animated-border`
- **CSS variables**: `--glass-bg`, `--glass-border`, `--glass-border-hover`
- **Inline hooks**: `useReducedMotion` (via `useSyncExternalStore`), `useAutoType` (character-by-character typing)
- **Inline components**: `CountUp` (animated number counter with ease-out cubic), `ParticleField` (DOM-based gold particles, reduced on mobile)
- **Motion variants**: `fadeInUp`, `staggerContainer`, `scaleIn`, `slideInLeft`, `slideInRight`
- **Accessibility**: `prefers-reduced-motion: reduce` disables all animations and hides particles; `aria-hidden` on decorative elements; `focus-visible` ring styles
- **Custom logo** (`public/logo.jpg`) in header and footer replacing generic "P" placeholder
- **CHANGELOG.md** (this file)

### Changed
- **Font**: Inter replaced with **Urbanist** across all files (`layout.tsx`, `globals.css` `--font-sans`, `body`, `.input-field::placeholder`)
- **page.tsx**: converted from server component to `"use client"` (~550 lines)
- **Hero copy**: "Journaling-First Trading Education" → "The Trading Education Platform"; headline → "Master the Markets. Teach the World."
- **Subheadline**: broadened from journaling-only to mentioning journaling, lessons, live sessions, and classroom building
- **Features**: expanded from 4 cards (journal, learn, analytics, community) to 6 (added Trade Calls, Live Sessions, Teacher Classrooms)
- **Feature grid**: `lg:grid-cols-4` → `lg:grid-cols-3` (3x2 layout)
- **Journal section**: static card → interactive terminal with auto-type animation; checklist expanded to 5 items
- **CTA copy**: "Ready to Transform Your Trading?" → "Your Next Trade Starts Here"
- **Dual CTAs**: single audience → student ("Start Trading Free") + teacher ("Launch Your Classroom")
- **Footer**: added "Built for traders, by traders." tagline
- **Logo size**: 32px → 40px in header and footer
- **README.md**: updated tech stack, visual theme section, and added latest update entry

### Removed
- Generic gold "P" box logo (replaced with actual logo image)
- `BarChart3` icon import (unused after feature grid redesign)

---

## 2026-01-28 — Teacher Flow Redesign: Topics + Lessons

### Added
- **Simplified teacher model**: Topics + Lessons replacing multi-page classroom/strategy flow
- **Single-page lesson creation** at `/teacher/lessons/new` with icon-based content type picker
- **New components**: `LessonForm`, `TopicSelector` (inline creation), `TopicsList`, `TeacherFAB`
- **New pages**: `/teacher/topics`, `/teacher/topics/[id]`, `/teacher/lessons/new`
- **New API routes**: `/api/topics` (GET, POST), `/api/lessons` (POST with dual-write to `learn_content`)
- **Database migration**: `supabase/migrations/20260128_topic_simplification.sql`

### Changed
- Teacher dashboard reduced from 609 to ~160 lines
- Sidebar updated with teacher sub-navigation
- Dual-write to `learn_content` for backward compatibility

---

## 2026-01-21 — Teacher Portal Reimagination

### Added
- **Trade Calls system**: teachers post real-time trade ideas with instrument, direction, entry, SL, TPs, analysis, and TradingView charts
- **Curriculum Tracks**: structured learning paths with difficulty levels and prerequisite unlocking
- **Live Sessions**: schedule, go live, and end sessions with countdown timers
- **Embed support**: YouTube video embeds with thumbnails, TradingView chart embeds, auto-detection from URLs
- **Classroom enhancements**: tagline, logo_url, banner_url, trading_style, markets array, feature flags
- **New components**: `TradeCallCard`, `TradeCallForm`, `YouTubeEmbed`, `TradingViewEmbed`, `EmbedPicker`
- **New API routes**: `/api/trade-calls`, `/api/trade-calls/follow`, `/api/curriculum/tracks`, `/api/curriculum/modules`, `/api/live-sessions`
- **Database**: 7 new tables (`trade_calls`, `trade_call_follows`, `curriculum_tracks`, `track_modules`, `track_progress`, `live_sessions`, `session_attendees`) with full RLS policies
- **Migration**: `supabase/migrations/20260121_teacher_portal_reimagine.sql`

---

## 2026-01-20 — Performance Refactors

### Changed
- Deferred public strategy loading
- Tightened hook dependency arrays
- Memoized derived data
- Switched to `next/image` with Supabase remote patterns

---

## 2026-01-20 — Lessons, Strategies & Rules

### Added
- Lessons and strategy rules
- Guided strategy setup flow
- Public strategies marketplace
- Image explanations in content
