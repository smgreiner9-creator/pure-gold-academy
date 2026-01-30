"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
} from "framer-motion";

/* ─── Hooks ──────────────────────────────────────────────── */

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

function useAutoType(
  lines: string[],
  isActive: boolean,
  speed = 30
): { text: string; done: boolean } {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!isActive) return;
    if (reduced) {
      setText(lines.join("\n"));
      setDone(true);
      return;
    }

    const full = lines.join("\n");
    let i = 0;
    setDone(false);
    setText("");

    const interval = setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [isActive, lines, speed, reduced]);

  return { text, done };
}

/* ─── Inline Components ──────────────────────────────────── */

function CountUp({
  target,
  prefix = "",
  suffix = "",
  duration = 2000,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

function ParticleField({ count = 24 }: { count?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isMobile = window.innerWidth < 768;
    const n = isMobile ? Math.floor(count / 2) : count;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "particle";
      el.style.left = `${Math.random() * 100}%`;
      el.style.bottom = "-10px";
      const size = 1.5 + Math.random() * 2;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.animationDelay = `${Math.random() * 8}s`;
      el.style.animationDuration = `${6 + Math.random() * 8}s`;
      fragment.appendChild(el);
    }
    container.appendChild(fragment);
    return () => {
      container.innerHTML = "";
    };
  }, [count]);

  return <div ref={containerRef} className="particle-field" aria-hidden="true" />;
}

/* ─── Motion Variants ────────────────────────────────────── */

import type { Variants } from "framer-motion";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

/* ─── Data ───────────────────────────────────────────────── */

const features = [
  {
    icon: "edit",
    title: "Trade Journal",
    description:
      "Structured logging with screenshots, emotions, and R-multiples. Build consistency through reflection.",
  },
  {
    icon: "auto_stories",
    title: "Topics & Lessons",
    description:
      "Video, text, and PDF courses from beginner to advanced. Learn strategies that actually work.",
  },
  {
    icon: "campaign",
    title: "Trade Calls",
    description:
      "Real-time setups from verified educators. See the trade before it happens.",
  },
  {
    icon: "videocam",
    title: "Live Sessions",
    description:
      "Live market analysis and Q&A streams. Learn by watching experts trade in real time.",
  },
  {
    icon: "group",
    title: "Community",
    description:
      "Connect with fellow traders. Share insights, get feedback, and stay accountable.",
  },
  {
    icon: "school",
    title: "Teacher Classrooms",
    description:
      "Build your brand, publish content, host live sessions, and earn recurring revenue.",
  },
];

const journalLines = [
  "Instrument:  EUR/USD",
  "Direction:   Long",
  "Entry:       1.0892",
  "Exit:        1.0934",
  "R-Multiple:  +2.1R",
  "Setup:       Engulfing at session open",
  "Emotion:     Calm, focused",
  "Result:      Win — followed rules",
  "",
  "// Reflection:",
  "// Waited for confirmation candle.",
  "// Stuck to plan. No revenge trades.",
];

const pricingFeatures = {
  free: [
    "Basic trade journaling",
    "Position size calculator",
    "Session indicator",
    "Community access",
    "Limited content access",
  ],
  premium: [
    "Unlimited journal entries",
    "Advanced analytics",
    "All premium content",
    "Priority teacher feedback",
    "Export journal data",
    "No ads",
  ],
};

const journalChecklist = [
  "Entry & exit with R-multiple tracking",
  "Pre, during, and post-trade emotion logging",
  "Custom rule checklists from your educator",
  "Screenshot attachments for self-review",
  "Analytics on win rate, patterns, and streaks",
];

/* ─── Page ───────────────────────────────────────────────── */

export default function Home() {
  const reduced = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Scroll-based header effects
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [0.6, 0.95]);
  const headerBlur = useTransform(scrollY, [0, 100], [8, 20]);

  // Hero parallax
  const heroY = useTransform(scrollY, [0, 600], [0, -50]);

  // Journal demo auto-type
  const journalRef = useRef<HTMLDivElement>(null);
  const journalInView = useInView(journalRef, { once: true, margin: "-100px" });
  const { text: journalText, done: journalDone } = useAutoType(
    journalLines,
    journalInView
  );

  const motionProps = useCallback(
    (variants: Variants) =>
      reduced
        ? {}
        : {
            variants,
            initial: "hidden" as const,
            whileInView: "visible" as const,
            viewport: { once: true, margin: "-80px" },
          },
    [reduced]
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* ── Header ─────────────────────────────────────── */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/[0.04]"
        style={
          reduced
            ? {}
            : {
                backgroundColor: `rgba(15, 15, 15, ${headerOpacity.get()})`,
                backdropFilter: `blur(${headerBlur.get()}px)`,
              }
        }
      >
        <div className="max-w-6xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.jpg"
              alt="Pure Gold Academy"
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <span className="font-bold text-lg tracking-tight">Pure Gold Academy</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/auth/login"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black font-medium text-sm hover:bg-[var(--gold-light)] transition-colors"
            >
              Get Started
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <span className="material-symbols-outlined text-2xl">close</span> : <span className="material-symbols-outlined text-2xl">menu</span>}
          </button>
        </div>

        {/* Mobile overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden absolute top-[72px] inset-x-0 glass border-t border-[var(--glass-border)] p-6 flex flex-col gap-4"
            >
              <a
                href="#features"
                className="text-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <Link
                href="/auth/login"
                className="text-lg text-[var(--muted)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="mt-2 px-6 py-3 rounded-lg bg-[var(--gold)] text-black font-semibold text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main>
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
          {/* Mesh background */}
          <div className="mesh-bg absolute inset-0 pointer-events-none" />
          <ParticleField count={24} />

          <motion.div
            className="relative z-10 max-w-3xl mx-auto text-center pt-16"
            style={reduced ? {} : { y: heroY }}
          >
            <motion.div {...motionProps(fadeInUp)}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
                <span className="material-symbols-outlined text-base text-[var(--gold)]">workspace_premium</span>
                <span className="text-sm text-[var(--gold)]">
                  The Trading Education Platform
                </span>
              </div>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight"
              {...motionProps(fadeInUp)}
            >
              Master the Markets.
              <br />
              <span className="gold-shimmer-text">Teach the World.</span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto mb-10"
              {...motionProps(fadeInUp)}
            >
              Journal every trade. Learn from expert-led lessons and live
              sessions. Or build your own classroom and monetize your edge.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              {...motionProps(fadeInUp)}
            >
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-lg bg-[var(--gold)] text-black font-semibold text-lg hover:bg-[var(--gold-light)] transition-colors flex items-center justify-center gap-2"
              >
                Start Trading Free
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
              <Link
                href="/auth/signup"
                className="w-full sm:w-auto px-8 py-4 rounded-lg glass glass-hover font-semibold text-lg text-[var(--gold)] flex items-center justify-center gap-2"
              >
                Launch Your Classroom
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Features Grid ──────────────────────────────── */}
        <section id="features" className="py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              {...motionProps(fadeInUp)}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Everything You Need to{" "}
                <span className="text-[var(--gold)]">Trade Smarter</span>
              </h2>
              <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
                From your first journal entry to running a full classroom of
                students.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              {...motionProps(staggerContainer)}
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  className="p-6 rounded-xl glass glass-hover glass-shimmer"
                  variants={reduced ? undefined : scaleIn}
                  whileHover={reduced ? undefined : { y: -4 }}
                >
                  <div className="w-12 h-12 rounded-lg bg-[var(--gold)]/10 border border-[var(--gold)]/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl text-[var(--gold)]">{feature.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--muted)] text-sm">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Journal Demo ───────────────────────────────── */}
        <section className="py-32 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Terminal mock */}
              <motion.div
                ref={journalRef}
                className="rounded-xl glass overflow-hidden"
                {...motionProps(slideInLeft)}
              >
                {/* Window chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--glass-border)]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                    <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                  </div>
                  <span className="ml-2 text-xs text-[var(--muted)] font-mono">
                    trade-journal
                  </span>
                </div>
                {/* Terminal body */}
                <div className="p-5 font-mono text-sm leading-relaxed min-h-[320px]">
                  <pre className="whitespace-pre-wrap text-[var(--foreground)]/90">
                    {journalText}
                    {!journalDone && <span className="typing-cursor" />}
                  </pre>
                </div>
              </motion.div>

              {/* Checklist */}
              <motion.div {...motionProps(slideInRight)}>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Your Trading Journal,{" "}
                  <span className="text-[var(--gold)]">Reimagined</span>
                </h2>
                <p className="text-[var(--muted)] text-lg mb-8">
                  Capture not just the numbers, but the psychology behind every
                  trade. Track emotions, rule adherence, and lessons learned.
                </p>
                <ul className="space-y-4">
                  {journalChecklist.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-xl text-[var(--gold)] mt-0.5 shrink-0">check_circle</span>
                      <span className="text-[var(--foreground)]/90">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── For Teachers ───────────────────────────────── */}
        <section className="relative py-32 px-4 overflow-hidden">
          <div className="mesh-bg absolute inset-0 opacity-50 pointer-events-none" />
          <div className="relative z-10 max-w-6xl mx-auto">
            <motion.div
              className="text-center mb-16"
              {...motionProps(fadeInUp)}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
                <span className="material-symbols-outlined text-base text-[var(--gold)]">school</span>
                <span className="text-sm text-[var(--gold)]">
                  For Educators
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Turn Your Edge Into{" "}
                <span className="text-[var(--gold)]">Income</span>
              </h2>
              <p className="text-[var(--muted)] text-lg max-w-2xl mx-auto">
                Launch your own classroom. Publish lessons, host live sessions,
                share trade calls, and earn from every subscriber.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-3 gap-6 mb-12"
              {...motionProps(staggerContainer)}
            >
              {[
                {
                  icon: "auto_stories",
                  title: "Create & Publish",
                  description:
                    "Build lessons, topics, and strategies. Upload videos, PDFs, and structured courses.",
                },
                {
                  icon: "radio_button_checked",
                  title: "Go Live",
                  description:
                    "Schedule and stream trading sessions. Students join in real-time for live analysis.",
                },
                {
                  icon: "attach_money",
                  title: "Earn",
                  description:
                    "$2.80 per active student monthly. Stripe payouts directly to your account.",
                },
              ].map((card) => (
                <motion.div
                  key={card.title}
                  className="p-6 rounded-xl glass glass-hover glass-shimmer text-center"
                  variants={reduced ? undefined : scaleIn}
                  whileHover={reduced ? undefined : { y: -4 }}
                >
                  <div className="w-14 h-14 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/10 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-[var(--gold)]">{card.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{card.title}</h3>
                  <p className="text-[var(--muted)] text-sm">
                    {card.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="text-center"
              {...motionProps(fadeInUp)}
            >
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[var(--gold)] text-black font-semibold text-lg hover:bg-[var(--gold-light)] transition-colors"
              >
                Create Your Teacher Account
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────── */}
        <section id="pricing" className="py-32 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-16"
              {...motionProps(fadeInUp)}
            >
              <h2 className="text-3xl md:text-5xl font-bold mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-[var(--muted)] text-lg">
                Start free and upgrade when you&apos;re ready.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 gap-6"
              {...motionProps(staggerContainer)}
            >
              {/* Free */}
              <motion.div
                className="p-8 rounded-xl glass glass-hover"
                variants={reduced ? undefined : fadeInUp}
                whileHover={reduced ? undefined : { y: -4 }}
              >
                <h3 className="text-xl font-bold mb-2">Free</h3>
                <p className="text-4xl font-bold mb-6">
                  $0
                  <span className="text-sm text-[var(--muted)] font-normal">
                    /month
                  </span>
                </p>
                <ul className="space-y-3 mb-8">
                  {pricingFeatures.free.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-base text-[var(--success)]">check_circle</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block w-full py-3 rounded-lg glass glass-hover text-center font-medium text-[var(--gold)]"
                >
                  Get Started
                </Link>
              </motion.div>

              {/* Premium */}
              <motion.div
                className="p-8 rounded-xl animated-border relative"
                variants={reduced ? undefined : fadeInUp}
                whileHover={reduced ? undefined : { y: -4 }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-[var(--gold)] text-black text-sm font-semibold">
                    Recommended
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl text-[var(--gold)]">workspace_premium</span>
                  Premium
                </h3>
                <p className="text-4xl font-bold mb-6">
                  $2.80
                  <span className="text-sm text-[var(--muted)] font-normal">
                    /month
                  </span>
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-base text-[var(--gold)]">check_circle</span>
                    <span>Everything in Free</span>
                  </li>
                  {pricingFeatures.premium.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-base text-[var(--gold)]">check_circle</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block w-full py-3 rounded-lg bg-[var(--gold)] text-black text-center font-semibold hover:bg-[var(--gold-light)] transition-colors"
                >
                  Start Free, Upgrade Later
                </Link>
              </motion.div>
            </motion.div>

            {/* Teacher note */}
            <motion.div
              className="mt-8 p-6 rounded-xl glass text-center"
              {...motionProps(fadeInUp)}
            >
              <h4 className="font-semibold mb-2">
                Are You a Trading Educator?
              </h4>
              <p className="text-sm text-[var(--muted)]">
                Teachers: $350 one-time setup fee + $2.80 per active student
                monthly.{" "}
                <Link
                  href="/auth/signup"
                  className="text-[var(--gold)] hover:underline"
                >
                  Create your teacher account
                </Link>
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────── */}
        <section className="relative py-32 px-4 overflow-hidden">
          <div className="mesh-bg absolute inset-0 pointer-events-none" />
          <ParticleField count={12} />

          <motion.div
            className="relative z-10 max-w-3xl mx-auto text-center"
            {...motionProps(staggerContainer)}
          >
            <motion.h2
              className="text-3xl md:text-5xl font-bold mb-4"
              variants={reduced ? undefined : fadeInUp}
            >
              Your Next Trade Starts{" "}
              <span className="text-[var(--gold)]">Here</span>
            </motion.h2>
            <motion.p
              className="text-[var(--muted)] text-lg mb-10"
              variants={reduced ? undefined : fadeInUp}
            >
              Join traders who journal smarter, learn faster, and trade with
              discipline.
            </motion.p>
            <motion.div variants={reduced ? undefined : fadeInUp}>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[var(--gold)] text-black font-semibold text-lg hover:bg-[var(--gold-light)] transition-colors"
                style={{ animation: "pulse-glow 3s ease-in-out infinite" }}
              >
                Create Your Free Account
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="py-16 px-4 border-t border-[var(--glass-surface-border)] bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.jpg"
                alt="Pure Gold Academy"
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-cover"
              />
              <span className="font-bold tracking-tight">Pure Gold Trading Academy</span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <p className="text-sm text-[var(--muted)]">
                &copy; {new Date().getFullYear()} Pure Gold Trading Academy. All
                rights reserved.
              </p>
              <p className="text-xs text-[var(--muted)]">
                Built for traders, by traders.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
