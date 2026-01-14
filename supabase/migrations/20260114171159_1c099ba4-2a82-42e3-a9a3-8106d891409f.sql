-- Create a security definer function to get the current user's email
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the problematic policy that accesses auth.users directly
DROP POLICY IF EXISTS "Users can link to their caregiver record by email" ON public.caregivers;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can link to their caregiver record by email"
ON public.caregivers
FOR UPDATE
USING (
  (user_id IS NULL) AND (email = get_current_user_email())
)
WITH CHECK (user_id = auth.uid());