-- Add new profile fields for caregivers
ALTER TABLE public.caregivers 
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS doula_package_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMP WITH TIME ZONE;

-- Create storage bucket for caregiver profile photos (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('caregiver-photos', 'caregiver-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow caregivers to upload their own profile photos
CREATE POLICY "Caregivers can upload own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'caregiver-photos' 
  AND auth.uid() IN (
    SELECT user_id FROM public.caregivers WHERE user_id = auth.uid()
  )
);

-- Allow caregivers to update their own profile photos
CREATE POLICY "Caregivers can update own profile photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'caregiver-photos' 
  AND auth.uid() IN (
    SELECT user_id FROM public.caregivers WHERE user_id = auth.uid()
  )
);

-- Allow public read access to profile photos
CREATE POLICY "Profile photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'caregiver-photos');