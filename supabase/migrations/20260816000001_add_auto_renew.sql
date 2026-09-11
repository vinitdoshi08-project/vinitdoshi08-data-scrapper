-- ═══════════════════════════════════════════════════════════════════
-- Migration: add auto_renew and razorpay_subscription_id columns
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS auto_renew               BOOLEAN     DEFAULT true,
  ADD COLUMN IF NOT EXISTS razorpay_sub_id          TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_plan_id         TEXT;

SELECT 'Auto-renew migration complete' AS result;
