import Link from 'next/link'
import { BookOpen, BarChart3, Users, PenTool, Crown, CheckCircle, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: PenTool,
    title: 'Trade Journaling',
    description: 'Log every trade with structured fields, screenshots, and emotion tracking. Build consistency through reflection.',
  },
  {
    icon: BookOpen,
    title: 'Learn & Grow',
    description: 'Access curated trading content from experienced educators. Videos, PDFs, and actionable strategies.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Track your win rate, R-multiples, and trading patterns. Data-driven improvement at your fingertips.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Connect with fellow traders. Share insights, get feedback, and stay accountable together.',
  },
]

const pricingFeatures = {
  free: [
    'Basic trade journaling',
    'Position size calculator',
    'Session indicator',
    'Community access',
    'Limited content access',
  ],
  premium: [
    'Unlimited journal entries',
    'Advanced analytics',
    'All premium content',
    'Priority teacher feedback',
    'Export journal data',
    'No ads',
  ],
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--background)]/80 border-b border-[var(--card-border)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center">
              <span className="text-black font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-lg">Pure Gold Academy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black font-medium text-sm hover:bg-[var(--gold-light)] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/20 mb-6">
            <Crown size={16} className="text-[var(--gold)]" />
            <span className="text-sm text-[var(--gold)]">Journaling-First Trading Education</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Become a Disciplined Trader Through{' '}
            <span className="text-[var(--gold)]">Consistent Journaling</span>
          </h1>
          <p className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-8">
            Pure Gold Academy helps day and swing traders build lasting habits through structured
            trade journaling, curated education, and a supportive community.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-[var(--gold)] text-black font-semibold text-lg hover:bg-[var(--gold-light)] transition-colors flex items-center justify-center gap-2"
            >
              Start Free Today
              <ArrowRight size={20} />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border border-[var(--card-border)] font-semibold text-lg hover:bg-[var(--card-bg)] transition-colors"
            >
              I Have an Account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-[var(--card-bg)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
            <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
              Built for active traders who want to improve through deliberate practice and reflection.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-[var(--background)] border border-[var(--card-border)] hover:border-[var(--gold)]/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center mb-4">
                  <feature.icon size={24} className="text-[var(--gold)]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-[var(--muted)] text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journal Preview Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Journal Every Trade,{' '}
                <span className="text-[var(--gold)]">Master Your Mind</span>
              </h2>
              <p className="text-[var(--muted)] text-lg mb-6">
                Our structured journaling system captures not just the numbers, but the psychology
                behind every trade. Track emotions, rule adherence, and lessons learned.
              </p>
              <ul className="space-y-3">
                {['Entry & exit with R-multiple tracking', 'Pre, during, and post-trade emotions', 'Custom rule checklists from your teacher', 'Screenshot attachments for review'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-[var(--gold)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--card-border)]">
                  <span className="font-semibold">Trade Journal Entry</span>
                  <span className="text-xs text-[var(--muted)]">Today, 10:32 AM</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[var(--muted)]">Instrument</span>
                    <p className="font-medium">EUR/USD</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Direction</span>
                    <p className="font-medium text-[var(--success)]">Long</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Entry</span>
                    <p className="font-medium">1.0892</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Exit</span>
                    <p className="font-medium">1.0934</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">R-Multiple</span>
                    <p className="font-medium text-[var(--success)]">+2.1R</p>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Emotion</span>
                    <p className="font-medium">Confident</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-[var(--card-border)]">
                  <span className="text-[var(--muted)] text-sm">Notes</span>
                  <p className="text-sm mt-1">Waited for confirmation. Followed rules. Clean setup on engulfing pattern at session open.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-[var(--card-bg)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-[var(--muted)] text-lg">
              Start free and upgrade when you&apos;re ready for more.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="p-8 rounded-xl bg-[var(--background)] border border-[var(--card-border)]">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <p className="text-4xl font-bold mb-6">
                $0<span className="text-sm text-[var(--muted)] font-normal">/month</span>
              </p>
              <ul className="space-y-3 mb-8">
                {pricingFeatures.free.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className="text-[var(--success)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="block w-full py-3 rounded-lg border border-[var(--card-border)] text-center font-medium hover:bg-[var(--card-bg)] transition-colors"
              >
                Get Started
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="p-8 rounded-xl bg-[var(--background)] border-2 border-[var(--gold)] relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 rounded-full bg-[var(--gold)] text-black text-sm font-semibold">
                  Recommended
                </span>
              </div>
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Crown size={20} className="text-[var(--gold)]" />
                Premium
              </h3>
              <p className="text-4xl font-bold mb-6">
                $2.80<span className="text-sm text-[var(--muted)] font-normal">/month</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-[var(--gold)]" />
                  <span>Everything in Free</span>
                </li>
                {pricingFeatures.premium.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className="text-[var(--gold)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="block w-full py-3 rounded-lg bg-[var(--gold)] text-black text-center font-semibold hover:bg-[var(--gold-light)] transition-colors"
              >
                Start Free, Upgrade Later
              </Link>
            </div>
          </div>

          {/* Teacher Pricing Note */}
          <div className="mt-8 p-6 rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20 text-center">
            <h4 className="font-semibold mb-2">Are You a Trading Educator?</h4>
            <p className="text-sm text-[var(--muted)]">
              Teachers: $350 one-time setup fee + $2.80 per active student monthly.{' '}
              <Link href="/auth/signup" className="text-[var(--gold)] hover:underline">
                Create your teacher account
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Trading?
          </h2>
          <p className="text-[var(--muted)] text-lg mb-8">
            Join thousands of traders who are building discipline through consistent journaling.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[var(--gold)] text-black font-semibold text-lg hover:bg-[var(--gold-light)] transition-colors"
          >
            Create Your Free Account
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[var(--card-border)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--gold)] flex items-center justify-center">
                <span className="text-black font-bold text-lg">P</span>
              </div>
              <span className="font-bold">Pure Gold Academy</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              &copy; {new Date().getFullYear()} Pure Gold Trading Academy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
