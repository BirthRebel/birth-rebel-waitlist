-- Allow admins to view all caregiver records
CREATE POLICY "Admins can view all caregivers" 
ON public.caregivers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));