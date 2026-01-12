-- Add meeting_link column to matches table for video call scheduling
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.matches.meeting_link IS 'Google Meet/Zoom link provided by caregiver for video calls';