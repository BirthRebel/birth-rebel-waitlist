-- Drop existing policies
DROP POLICY IF EXISTS "Admins can insert parent requests" ON public.parent_requests;
DROP POLICY IF EXISTS "Admins can view all parent requests" ON public.parent_requests;
DROP POLICY IF EXISTS "Admins can update parent requests" ON public.parent_requests;

-- Recreate policies using the has_role security definer function
CREATE POLICY "Admins can view all parent requests" 
ON public.parent_requests 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert parent requests" 
ON public.parent_requests 
FOR INSERT 
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update parent requests" 
ON public.parent_requests 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));