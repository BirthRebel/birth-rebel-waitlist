-- Harden RLS and explicitly block public read/write beyond inserts
-- Ensure RLS is enabled and enforced
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_signups FORCE ROW LEVEL SECURITY;

-- Add restrictive policies to explicitly deny SELECT/UPDATE/DELETE for all clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='waitlist_signups' AND policyname='Block public select on waitlist_signups'
  ) THEN
    CREATE POLICY "Block public select on waitlist_signups"
    AS RESTRICTIVE
    ON public.waitlist_signups
    FOR SELECT
    USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='waitlist_signups' AND policyname='Block public update on waitlist_signups'
  ) THEN
    CREATE POLICY "Block public update on waitlist_signups"
    AS RESTRICTIVE
    ON public.waitlist_signups
    FOR UPDATE
    USING (false)
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='waitlist_signups' AND policyname='Block public delete on waitlist_signups'
  ) THEN
    CREATE POLICY "Block public delete on waitlist_signups"
    AS RESTRICTIVE
    ON public.waitlist_signups
    FOR DELETE
    USING (false);
  END IF;
END
$$;