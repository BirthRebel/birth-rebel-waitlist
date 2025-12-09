-- Fix matches foreign key
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS matches_caregiver_id_fkey;

ALTER TABLE public.matches
ADD CONSTRAINT matches_caregiver_id_fkey 
FOREIGN KEY (caregiver_id) 
REFERENCES public.caregivers(id) 
ON DELETE CASCADE;

-- Fix commissions foreign key
ALTER TABLE public.commissions 
DROP CONSTRAINT IF EXISTS commissions_caregiver_id_fkey;

ALTER TABLE public.commissions
ADD CONSTRAINT commissions_caregiver_id_fkey 
FOREIGN KEY (caregiver_id) 
REFERENCES public.caregivers(id) 
ON DELETE CASCADE;