# Changelog

All notable changes to Pure Gold Academy are documented in this file.

---

## [Unreleased]

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
