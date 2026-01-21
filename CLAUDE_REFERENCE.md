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
│   │   ├── teacher/          # Teacher portal (10+ pages)
│   │   │   └── strategy/      # Guided strategy setup
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
- **Features:** Classroom creation, student management, content upload, analytics review, pricing configuration, Stripe Connect

### 4. Learning System
- **Location:** `src/app/(protected)/learn/`
- **Content types:** Video, PDF, image, text
- **Access control:** Free, premium, individually priced

### 5. Community Forum
- **Location:** `src/app/(protected)/community/`
- **Features:** Posts, comments, signal-prevention filtering

### 6. Strategy Publishing
- **Visibility:** Public or private strategies
- **Flow:** Guided setup (strategy → lesson + content → publish)

### 7. Payments (Stripe)
- **Platform subscription:** $2.80/month premium
- **Classroom subscriptions:** Teacher-set pricing
- **Content purchases:** Individual content sales
- **Teacher payouts:** Stripe Connect

---

## Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User accounts | user_id, email, role (student/teacher/admin), subscription_tier |
| `classrooms` | Teacher classrooms | teacher_id, name, invite_code, is_paid |
| `journal_entries` | Trade logs | instrument, direction, prices, emotions, rules_followed, screenshots |
| `journal_feedback` | Teacher comments | journal_entry_id, teacher_id, content |
| `lessons` | Strategy lessons | classroom_id, title, summary, order_index |
| `classroom_rules` | Strategy rules | classroom_id, rule_text, description |
| `learn_content` | Educational materials | classroom_id, lesson_id, content_type, content_url, explanation |
| `learn_progress` | Student progress | user_id, content_id, completed |
| `community_posts` | Forum posts | classroom_id, user_id, title, content |
| `subscriptions` | Stripe subscription data | user_id, stripe_customer_id, tier, status |
| `watched_instruments` | Tracked symbols | user_id, symbol, name |
| `daily_checkins` | Activity tracking | user_id, check_date, has_traded |
| `teacher_stripe_accounts` | Teacher Connect accounts | teacher_id, stripe_account_id |
| `classroom_pricing` | Classroom subscription pricing | classroom_id, monthly_price |
| `content_purchases` | Individual content sales | student_id, content_id, amount |

### Custom Types
- `user_role`: student | teacher | admin
- `subscription_tier`: free | premium
- `emotion_type`: confident | anxious | fearful | greedy | calm | frustrated | neutral
- `trade_direction`: long | short
- `trade_outcome`: win | loss | breakeven
- `content_type`: video | pdf | image | text

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/checkout` | POST | Create premium subscription checkout |
| `/api/stripe/portal` | POST | Customer subscription management |
| `/api/stripe/connect/onboard` | POST | Teacher Stripe Connect setup |
| `/api/stripe/connect/status` | GET | Check teacher Stripe status |
| `/api/stripe/connect/checkout/classroom` | POST | Classroom subscription checkout |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/prices` | GET | Live forex/crypto/gold prices (15min cache) |
| `/api/forex-factory` | GET | Economic calendar events |

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
| Teacher | `src/app/(protected)/teacher/page.tsx` |
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

### Session: January 19, 2026
**Agent:** Claude Opus 4.5
**Actions:**
- Created this reference document (CLAUDE_REFERENCE.md)
- Performed comprehensive codebase exploration

### Session: January 20, 2026
**Agent:** GPT-5 (Codex)
**Actions:**
- Added lessons + strategy rules data model, image explanations, and public strategy visibility
- Built guided 3-step strategy setup flow (strategy → lesson + content → publish)
- Updated teacher dashboard and strategy pages, plus public strategy listing in join flow
- Adjusted student learn view to group by lessons and show image explanations
- Updated dashboard reminder label and placement
- Performance refactors: deferred public strategy listing load, hook dependency fixes, memoized derived lists, and `next/image` adoption

**Current State:**
- Project version: 0.1.0
- 70+ TypeScript files
- 40+ React components
- 16 database tables
- All core features implemented

**Recent Development (from git history):**
1. Phase 1 retention features (daily check-in, streak protection, milestones)
2. UX improvements (route-aware chrome, join flow)
3. UI redesign (warm gold colors, 3D depth effects)
4. Fix double login issue
5. Stripe Connect teacher pricing implementation
6. Teacher portal overhaul
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

**Update this document** after significant changes to keep it current.

---

*Last Updated: January 20, 2026 (19:26 EST)*
