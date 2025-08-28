-- Add last_name column to waitlist_signups table
ALTER TABLE public.waitlist_signups 
ADD COLUMN last_name TEXT;