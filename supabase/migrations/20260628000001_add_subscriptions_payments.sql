-- ═══════════════════════════════════════════════════════════════════
-- PASTE THIS ENTIRE SCRIPT INTO:
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════

-- ── STEP 1: Add subscription columns to profiles ──────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan                TEXT        NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_ends_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Back-fill trial_ends_at = signup date + 3 days for all existing users
UPDATE profiles
  SET trial_ends_at = created_at + INTERVAL '3 days'
  WHERE trial_ends_at IS NULL;

-- ── STEP 2: Auto-set trial_ends_at for NEW signups ────────────────
CREATE OR REPLACE FUNCTION set_trial_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_trial_end();

-- ── STEP 3: Create subscriptions table ───────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name   TEXT        NOT NULL,
  plan_type   TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'active',
  payment_id  TEXT,
  order_id    TEXT,
  amount      INTEGER,
  currency    TEXT        DEFAULT 'INR',
  starts_at   TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── STEP 4: Create payments table ────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id     TEXT        NOT NULL,
  order_id       TEXT,
  signature      TEXT,
  amount         INTEGER,
  currency       TEXT        DEFAULT 'INR',
  payment_method TEXT        DEFAULT 'razorpay',
  status         TEXT        NOT NULL DEFAULT 'captured',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payments" ON payments;
CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ── STEP 5: Verify everything was created ─────────────────────────
-- This final SELECT will return rows — confirming success
SELECT
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'plan')       AS profiles_plan_col,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'subscriptions')                            AS subscriptions_table,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_name = 'payments')                                 AS payments_table;
