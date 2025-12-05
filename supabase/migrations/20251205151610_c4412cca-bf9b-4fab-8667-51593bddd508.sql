-- Allow authenticated users to create their own caregiver record
CREATE POLICY "Users can create their own caregiver record" 
ON public.caregivers 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());