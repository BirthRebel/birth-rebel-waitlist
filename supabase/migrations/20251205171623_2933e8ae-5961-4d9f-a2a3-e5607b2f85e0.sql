-- Add new columns to caregivers table for Typeform intake
ALTER TABLE public.caregivers
ADD COLUMN IF NOT EXISTS pronouns text,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS address_line_1 text,
ADD COLUMN IF NOT EXISTS address_line_2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS post_code text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS language_spoken text[],
ADD COLUMN IF NOT EXISTS training_certifications text[],
ADD COLUMN IF NOT EXISTS years_practicing integer,
ADD COLUMN IF NOT EXISTS births_supported integer,
ADD COLUMN IF NOT EXISTS services_offered text[],
ADD COLUMN IF NOT EXISTS typical_availability text,
ADD COLUMN IF NOT EXISTS specific_support_experience text,
ADD COLUMN IF NOT EXISTS care_types_supported text[],
ADD COLUMN IF NOT EXISTS care_style text,
ADD COLUMN IF NOT EXISTS gdpr_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS typeform_response_id text UNIQUE,
ADD COLUMN IF NOT EXISTS intake_completed_at timestamp with time zone;

-- Create storage bucket for caregiver documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('caregiver-documents', 'caregiver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: caregivers can view their own documents
CREATE POLICY "Caregivers can view own documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'caregiver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: service role can upload documents (for webhook)
CREATE POLICY "Service role can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'caregiver-documents');