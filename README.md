# Pure Gold Trading Academy

A journaling-first trading education platform for active day and swing traders. Built with Next.js 16, Supabase, Stripe, and Tailwind CSS 4.

## Features

### For Students
- **Trade Journaling** - Log every trade with structured fields including entry/exit prices, position size, R-multiple, emotions (before, during, after), rule adherence checklist, and screenshot uploads
- **Home Dashboard** - Market news feed, trading session indicator showing active sessions and prime time, position size calculator, and tracked instruments
- **Learn Section** - Access educational content (videos, PDFs, images, text) with progress tracking
- **Community** - Discussion area with signal-prevention system to maintain educational focus
- **Notifications** - Real-time alerts for teacher feedback, community responses, and system updates
- **Public Strategies** - Discover and join public strategies from the marketplace listing

### For Teachers
- **Classroom Management** - Create classrooms with unique invite codes for student enrollment
- **Student Analytics** - View student performance, journal activity, and progress metrics
- **Content Uploads** - Upload educational materials (video, PDF, image, text) for students
- **Journal Review** - Browse and provide feedback on student trade journals
- **Guided Strategy Setup** - Step-by-step flow: strategy, lesson + content, publish with pricing

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
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

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
│   │   ├── community/     # Discussion area
│   │   ├── classroom/     # Classroom join flow
│   │   ├── notifications/ # Notifications
│   │   ├── settings/      # User settings
│   │   └── teacher/       # Teacher backend
│   │       └── strategy/  # Guided strategy setup
│   └── api/               # API routes
│       └── stripe/        # Stripe integration endpoints
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components (Sidebar, Header)
│   ├── dashboard/         # Dashboard widgets
│   ├── journal/           # Journal components
│   ├── analytics/         # Analytics charts
│   └── learn/             # Learn section components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and clients
│   └── supabase/          # Supabase client setup
├── store/                 # Zustand state stores
└── types/                 # TypeScript type definitions
```

## Database Schema

The application uses the following main tables:
- `profiles` - User profiles with role (student/teacher) and subscription info
- `classrooms` - Teacher-created classrooms with invite codes
- `lessons` - Lessons inside a strategy (classroom)
- `journal_entries` - Trade journal entries with all trade data
- `journal_feedback` - Teacher feedback on journal entries
- `learn_content` - Educational content uploaded by teachers
- `learn_progress` - Student progress on content
- `community_posts` - Discussion posts
- `community_comments` - Comments on posts
- `notifications` - User notifications
- `subscriptions` - Stripe subscription data
- `watched_instruments` - User's watched trading instruments
- `daily_checkins` - Activity tracking and streaks
- `teacher_stripe_accounts` - Teacher Stripe Connect accounts
- `classroom_pricing` - Classroom subscription pricing
- `content_purchases` - Individual content sales
- `classroom_rules` - Strategy-level rules

See `supabase/schema.sql` for the complete schema with RLS policies.

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

The app uses a Black & Gold color scheme:
- Background: `#050505`
- Gold primary: `#FFB800`
- Gold light: `#FFD54F`
- Gold dark: `#E5A500`
- Card background: `#0F0F0F`
- Success: `#22c55e`
- Danger: `#ef4444`

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

- 2026-01-20 18:29 EST - Added lessons + strategy rules, guided strategy setup flow, public strategies, and image explanations.
- 2026-01-20 19:26 EST - Applied performance-focused refactors: deferred public strategy loading, tightened hook deps, memoized derived data, and switched to `next/image` with Supabase remote patterns.

## License

MIT
# pure-gold-
