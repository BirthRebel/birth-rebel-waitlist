-- Drop the existing insert policy
DROP POLICY IF EXISTS "Admins can insert parent requests" ON public.parent_requests;

-- Create a simpler policy that directly checks the user_roles table
CREATE POLICY "Admins can insert parent requests" 
ON public.parent_requests 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

-- Also update the SELECT and UPDATE policies to use the same pattern
DROP POLICY IF EXISTS "Admins can view all parent requests" ON public.parent_requests;
DROP POLICY IF EXISTS "Admins can update parent requests" ON public.parent_requests;

CREATE POLICY "Admins can view all parent requests" 
ON public.parent_requests 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update parent requests" 
ON public.parent_requests 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::app_role
  )
);