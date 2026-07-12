-- Add subscription columns to profiles table
-- plan: 'free' | 'basic' | 'standard'
-- trial_ends_at: timestamp when free trial expires (3 days after signup)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Set trial_ends_at to 3 days from created_at for all existing users who don't have it
UPDATE profiles
  SET trial_ends_at = created_at + INTERVAL '3 days'
  WHERE trial_ends_at IS NULL;

-- Trigger: automatically set trial_ends_at on new signups
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
