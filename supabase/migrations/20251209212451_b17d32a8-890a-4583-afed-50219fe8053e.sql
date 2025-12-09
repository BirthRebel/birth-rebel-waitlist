-- Add RLS policy allowing caregivers to insert their own commissions
CREATE POLICY "Caregivers can insert their own commissions"
ON public.commissions
FOR INSERT
WITH CHECK (caregiver_id = get_current_caregiver_id());