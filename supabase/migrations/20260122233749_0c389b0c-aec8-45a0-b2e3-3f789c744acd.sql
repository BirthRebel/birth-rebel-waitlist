-- Drop the existing foreign key constraint
ALTER TABLE public.admin_notifications 
DROP CONSTRAINT IF EXISTS admin_notifications_match_id_fkey;

-- Re-add with ON DELETE SET NULL (since match_id is nullable)
ALTER TABLE public.admin_notifications 
ADD CONSTRAINT admin_notifications_match_id_fkey 
FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;