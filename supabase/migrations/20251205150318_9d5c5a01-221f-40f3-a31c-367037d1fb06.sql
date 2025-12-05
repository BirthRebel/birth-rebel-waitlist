-- Drop the insecure policy that allows caregivers to insert their own commissions
DROP POLICY IF EXISTS "Caregivers can insert their own commissions" ON public.commissions;

-- Create a restrictive policy that denies all client-side insertions
-- Commissions should only be created via backend edge functions using service role key
CREATE POLICY "Deny client commission insertion" 
ON public.commissions 
FOR INSERT 
TO anon, authenticated
WITH CHECK (false);