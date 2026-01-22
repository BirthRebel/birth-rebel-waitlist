-- Add code of conduct acceptance tracking
ALTER TABLE public.caregivers 
ADD COLUMN code_of_conduct_accepted boolean DEFAULT false,
ADD COLUMN code_of_conduct_accepted_at timestamp with time zone;