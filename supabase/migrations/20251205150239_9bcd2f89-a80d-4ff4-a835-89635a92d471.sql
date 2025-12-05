-- Drop the insecure policy that allows anyone to create matches
DROP POLICY IF EXISTS "Anyone can create matches" ON public.matches;

-- Create a restrictive policy that denies public insertions
-- Matches should only be created via backend edge functions using service role key
CREATE POLICY "Deny public match insertion" 
ON public.matches 
FOR INSERT 
TO anon, authenticated
WITH CHECK (false);