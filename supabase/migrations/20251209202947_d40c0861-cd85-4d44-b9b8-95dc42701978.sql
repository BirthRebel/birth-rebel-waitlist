-- Add DELETE policy for admins on caregivers table
CREATE POLICY "Admins can delete caregivers"
ON public.caregivers
FOR DELETE
USING (has_role(auth.uid(), 'admin'));