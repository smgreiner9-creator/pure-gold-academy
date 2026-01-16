-- Teacher Pricing & Stripe Connect Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- NEW TABLES
-- ============================================

-- Teacher Stripe Connect accounts
CREATE TABLE teacher_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stripe_account_id TEXT UNIQUE,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classroom pricing settings
CREATE TABLE classroom_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE UNIQUE NOT NULL,
  pricing_type TEXT DEFAULT 'free' CHECK (pricing_type IN ('free', 'paid')),
  monthly_price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  stripe_price_id TEXT,
  trial_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student classroom subscriptions (for paid classrooms)
CREATE TABLE classroom_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'suspended', 'past_due')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, classroom_id)
);

-- Individual content purchases
CREATE TABLE content_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES learn_content(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  platform_fee DECIMAL(10, 2) NOT NULL,
  teacher_payout DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, content_id)
);

-- ============================================
-- MODIFY EXISTING TABLES
-- ============================================

-- Add pricing fields to classrooms
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;

-- Add pricing fields to learn_content
ALTER TABLE learn_content ADD COLUMN IF NOT EXISTS is_individually_priced BOOLEAN DEFAULT false;
ALTER TABLE learn_content ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_teacher_stripe_accounts_teacher_id ON teacher_stripe_accounts(teacher_id);
CREATE INDEX idx_teacher_stripe_accounts_stripe_account_id ON teacher_stripe_accounts(stripe_account_id);
CREATE INDEX idx_classroom_pricing_classroom_id ON classroom_pricing(classroom_id);
CREATE INDEX idx_classroom_subscriptions_student_id ON classroom_subscriptions(student_id);
CREATE INDEX idx_classroom_subscriptions_classroom_id ON classroom_subscriptions(classroom_id);
CREATE INDEX idx_classroom_subscriptions_status ON classroom_subscriptions(status);
CREATE INDEX idx_content_purchases_student_id ON content_purchases(student_id);
CREATE INDEX idx_content_purchases_content_id ON content_purchases(content_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE teacher_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_purchases ENABLE ROW LEVEL SECURITY;

-- Teacher Stripe accounts policies
CREATE POLICY "Teachers can view their own Stripe account" ON teacher_stripe_accounts
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can insert their own Stripe account" ON teacher_stripe_accounts
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Teachers can update their own Stripe account" ON teacher_stripe_accounts
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Classroom pricing policies
CREATE POLICY "Teachers can manage pricing for their classrooms" ON classroom_pricing
  FOR ALL USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Anyone can view classroom pricing" ON classroom_pricing
  FOR SELECT USING (true);

-- Classroom subscriptions policies
CREATE POLICY "Students can view their own subscriptions" ON classroom_subscriptions
  FOR SELECT USING (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can view subscriptions for their classrooms" ON classroom_subscriptions
  FOR SELECT USING (
    classroom_id IN (
      SELECT id FROM classrooms WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Content purchases policies
CREATE POLICY "Students can view their own purchases" ON content_purchases
  FOR SELECT USING (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Teachers can view purchases for their content" ON content_purchases
  FOR SELECT USING (
    content_id IN (
      SELECT id FROM learn_content WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_teacher_stripe_accounts_updated_at
  BEFORE UPDATE ON teacher_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classroom_pricing_updated_at
  BEFORE UPDATE ON classroom_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classroom_subscriptions_updated_at
  BEFORE UPDATE ON classroom_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
