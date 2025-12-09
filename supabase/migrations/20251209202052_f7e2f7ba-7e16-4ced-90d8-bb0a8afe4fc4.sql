-- Allow admins to insert commissions on behalf of caregivers
CREATE POLICY "Admins can insert commissions" 
ON public.commissions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all commissions
CREATE POLICY "Admins can view all commissions" 
ON public.commissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update all commissions
CREATE POLICY "Admins can update all commissions" 
ON public.commissions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));