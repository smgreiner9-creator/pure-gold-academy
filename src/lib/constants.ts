// Subscription tier limits
export const FREE_TIER_JOURNAL_LIMIT = 15 // Maximum journal entries per month for free users

// Premium feature flags
export const PREMIUM_FEATURES = {
  unlimitedJournals: true,
  advancedAnalytics: true,
  exportData: true,
  priorityFeedback: true,
  priorityFeatures: true,
} as const

// Subscription pricing (for display purposes)
export const PRICING = {
  free: 0,
  premium: 2.80,
  teacherSetup: 350,
  teacherPerStudent: 2.80,
} as const
