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
7. [Teacher Backend](#teacher-backend)
8. [Community](#community)
9. [Notifications](#notifications)
10. [Subscriptions](#subscriptions)
11. [Database Schema](#database-schema)
12. [Environment Variables](#environment-variables)
13. [Deployment](#deployment)

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
2. **Student Dashboard** - Market news, session indicator, position calculator
3. **Trade Journaling** - Structured entries with screenshots, emotions, rules
4. **Learning Content** - Video, PDF, image, and text support
5. **Teacher Backend** - Classroom management, analytics, feedback
6. **Public Strategies** - Marketplace listing for discoverable strategies
7. **Community** - Discussion posts and comments
8. **Push Notifications** - Web push for important updates
9. **Subscriptions** - Free and premium tiers via Stripe

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

## Teacher Backend

### Teacher Dashboard (`/teacher`)

- Total students count
- Total journals reviewed
- Active classrooms
- Pending feedback requests

### Classrooms (`/teacher/classrooms`)

- Create new classrooms with name and description
- Auto-generated invite codes
- View student count per classroom
- Delete classroom functionality

### Students (`/teacher/students`)

- List all enrolled students
- Filter by classroom
- View student statistics
- Access student journals

### Journal Review (`/teacher/journals`)

- View all student journal entries
- Filter by classroom
- Inline feedback form
- Notification sent to student on feedback

### Content Management (`/teacher/content`)

- Upload new content (video, PDF, article, image)
- Assign to specific classrooms
- Set premium/free access
- Reorder content

---

## Community

### Posts

- Create new discussion posts
- Title and content fields
- Like/unlike functionality
- Comment threads

### Comments

- Nested comments on posts
- Edit own comments
- Delete own comments

### Features

- Sorted by most recent
- Like count display
- Author display names

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
- title (text)
- summary (text)
- order_index (integer)
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

### Additional Tables

- `classroom_rules` - Strategy-level rules
- `daily_checkins` - Activity tracking and streaks
- `teacher_stripe_accounts` - Stripe Connect accounts for teachers
- `classroom_pricing` - Classroom subscription pricing
- `content_purchases` - Individual content sales
- `learn_progress` - Student progress on content
- `journal_feedback` - Teacher feedback on journal entries
- `community_comments` - Comments on community posts
- `watched_instruments` - User tracked symbols

---

## Update Log

- 2026-01-20 18:29 EST - Added lessons + strategy rules, public strategy visibility, guided strategy setup flow, and image explanations.
- 2026-01-20 19:26 EST - Performance refactors: deferred public strategy listing load, hook dependency fixes, memoized derived lists, and `next/image` adoption with Supabase patterns.

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
