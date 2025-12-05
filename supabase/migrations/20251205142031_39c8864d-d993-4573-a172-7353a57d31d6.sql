-- Allow anyone to insert matches (parents submitting the intake form are not authenticated)
CREATE POLICY "Anyone can create matches"
ON public.matches
FOR INSERT
WITH CHECK (true);