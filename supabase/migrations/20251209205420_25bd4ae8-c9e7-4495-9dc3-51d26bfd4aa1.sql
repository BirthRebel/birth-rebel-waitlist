-- Drop existing restrictive policies on conversations
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Caregivers can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Admins can view all conversations" 
ON public.conversations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Caregivers can view their conversations" 
ON public.conversations 
FOR SELECT 
USING (caregiver_id = get_current_caregiver_id());

CREATE POLICY "Admins can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update conversations" 
ON public.conversations 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));