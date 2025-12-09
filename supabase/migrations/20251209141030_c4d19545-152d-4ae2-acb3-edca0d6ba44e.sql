-- Add policy to allow inserts from the formless webhook (service role)
-- Also, let's check if there's an issue with how RLS is evaluating

-- First, let's add a more permissive policy for authenticated admins
-- The issue might be that has_role returns NULL instead of false for non-admins

-- Drop and recreate the insert policy with better handling
DROP POLICY IF EXISTS "Admins can insert parent requests" ON public.parent_requests;

CREATE POLICY "Admins can insert parent requests" 
ON public.parent_requests 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) = true);