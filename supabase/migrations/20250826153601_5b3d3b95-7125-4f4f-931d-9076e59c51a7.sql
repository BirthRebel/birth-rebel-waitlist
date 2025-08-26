-- Create enum for user segmentation
DO $$ BEGIN
  CREATE TYPE public.waitlist_user_type AS ENUM ('caregiver', 'mother');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create table for waitlist signups
CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_name TEXT,
  email TEXT NOT NULL,
  user_type public.waitlist_user_type NOT NULL,
  user_agent TEXT,
  referrer TEXT
);

-- Enable Row Level Security
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Replace policy (drop if exists to avoid errors on re-run)
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist_signups;
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist_signups
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at ON public.waitlist_signups (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_email ON public.waitlist_signups (lower(email));