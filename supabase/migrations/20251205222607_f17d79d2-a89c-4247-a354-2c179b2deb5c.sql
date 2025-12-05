-- Allow users to claim a caregiver record by email when user_id is null
CREATE POLICY "Users can link to their caregiver record by email"
ON public.caregivers
FOR UPDATE
USING (user_id IS NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (user_id = auth.uid());