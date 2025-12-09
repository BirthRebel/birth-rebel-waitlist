-- Add a restrictive policy that requires authentication for SELECT
-- This ensures anonymous users can never access caregiver data, even if other policies are misconfigured
CREATE POLICY "Require authentication for caregiver access"
ON public.caregivers
AS RESTRICTIVE
FOR SELECT
TO public
USING (auth.uid() IS NOT NULL);