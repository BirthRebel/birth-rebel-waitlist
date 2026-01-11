-- Make email nullable in parent_requests table since Formless sometimes doesn't capture valid emails
ALTER TABLE public.parent_requests ALTER COLUMN email DROP NOT NULL;