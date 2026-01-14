-- Add policy to allow admins to update caregiver records
CREATE POLICY "Admins can update all caregivers"
ON public.caregivers
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));