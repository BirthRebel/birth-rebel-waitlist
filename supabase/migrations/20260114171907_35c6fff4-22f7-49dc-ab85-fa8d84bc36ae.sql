-- Allow caregivers to upload their own documents to caregiver-documents bucket
-- Using caregiver ID as folder name for organization
CREATE POLICY "Caregivers can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'caregiver-documents' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.caregivers WHERE user_id = auth.uid())
);

-- Allow caregivers to update their own documents
CREATE POLICY "Caregivers can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'caregiver-documents' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.caregivers WHERE user_id = auth.uid())
);

-- Update the view policy to use caregiver id instead of auth.uid()
DROP POLICY IF EXISTS "Caregivers can view own documents" ON storage.objects;
CREATE POLICY "Caregivers can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'caregiver-documents' 
  AND (storage.foldername(name))[1] = (SELECT id::text FROM public.caregivers WHERE user_id = auth.uid())
);

-- Allow admins to manage all documents
CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'caregiver-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'caregiver-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);