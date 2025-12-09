-- Drop the existing foreign key constraint on conversations and recreate with ON DELETE SET NULL
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_caregiver_id_fkey;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_caregiver_id_fkey 
FOREIGN KEY (caregiver_id) 
REFERENCES public.caregivers(id) 
ON DELETE SET NULL;