-- Remove the overly permissive policy that allows any authenticated user to read all caregivers
DROP POLICY IF EXISTS "Require authentication for caregiver access" ON public.caregivers;