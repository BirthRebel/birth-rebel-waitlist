-- Drop the existing foreign key constraint and recreate with ON DELETE SET NULL
ALTER TABLE public.parent_requests 
DROP CONSTRAINT IF EXISTS parent_requests_matched_caregiver_id_fkey;

ALTER TABLE public.parent_requests
ADD CONSTRAINT parent_requests_matched_caregiver_id_fkey 
FOREIGN KEY (matched_caregiver_id) 
REFERENCES public.caregivers(id) 
ON DELETE SET NULL;