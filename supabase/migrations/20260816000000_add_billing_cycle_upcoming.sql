-- ═══════════════════════════════════════════════════════════════════
-- Migration: add billing_cycle, upcoming_plan fields to subscriptions
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════

-- Add billing_cycle to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle       TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS upcoming_plan       TEXT,
  ADD COLUMN IF NOT EXISTS upcoming_billing    TEXT,
  ADD COLUMN IF NOT EXISTS upcoming_starts_at  TIMESTAMPTZ;

-- Add plan column to payments table for easier querying
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS plan TEXT;

-- Add service-role write policy so backend can insert/update subscriptions
DROP POLICY IF EXISTS "Service role can write subscriptions" ON subscriptions;
CREATE POLICY "Service role can write subscriptions"
  ON subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add service-role write policy for payments
DROP POLICY IF EXISTS "Service role can write payments" ON payments;
CREATE POLICY "Service role can write payments"
  ON payments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Backfill billing_cycle from existing rows (infer from duration)
UPDATE subscriptions
  SET billing_cycle = CASE
    WHEN EXTRACT(EPOCH FROM (expires_at - starts_at)) / 86400 >= 300 THEN 'yearly'
    ELSE 'monthly'
  END
  WHERE billing_cycle IS NULL AND starts_at IS NOT NULL AND expires_at IS NOT NULL;

SELECT 'Migration complete' AS result;
