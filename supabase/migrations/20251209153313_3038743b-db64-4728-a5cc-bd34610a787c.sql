-- Allow admins to insert matches
CREATE POLICY "Admins can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to view all matches  
CREATE POLICY "Admins can view all matches"
ON public.matches
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Allow admins to update all matches
CREATE POLICY "Admins can update all matches"
ON public.matches
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));