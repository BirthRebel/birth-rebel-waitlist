-- Add new columns to parent_requests table for enhanced intake form
ALTER TABLE public.parent_requests
ADD COLUMN IF NOT EXISTS stage_of_journey text,
ADD COLUMN IF NOT EXISTS family_context text,
ADD COLUMN IF NOT EXISTS caregiver_preferences text,
ADD COLUMN IF NOT EXISTS language text,
ADD COLUMN IF NOT EXISTS preferred_communication text,
ADD COLUMN IF NOT EXISTS shared_identity_requests text,
ADD COLUMN IF NOT EXISTS budget text,
ADD COLUMN IF NOT EXISTS general_availability text,
ADD COLUMN IF NOT EXISTS specific_concerns text;