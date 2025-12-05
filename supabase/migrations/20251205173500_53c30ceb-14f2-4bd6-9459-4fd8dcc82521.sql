-- Make user_id nullable so Typeform can create caregiver records
ALTER TABLE public.caregivers ALTER COLUMN user_id DROP NOT NULL;

-- Update RLS policies to allow service role inserts (webhook uses service role)
-- Existing policies work since service role bypasses RLS