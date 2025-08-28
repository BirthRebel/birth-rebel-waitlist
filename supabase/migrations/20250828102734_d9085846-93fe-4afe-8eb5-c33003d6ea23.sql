-- Enforce RLS and explicitly deny read/write beyond inserts (compatible syntax)
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_signups FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='waitlist_signups' AND policyname='Deny select on waitlist_signups'
  ) THEN
    CREATE POLICY "Deny select on waitlist_signups"
    ON public.waitlist_signups
    FOR SELECT
    USING (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='waitlist_signups' AND policyname='Deny update on waitlist_signups'
  ) THEN
    CREATE POLICY "Deny update on waitlist_signups"
    ON public.waitlist_signups
    FOR UPDATE
    USING (false)
    WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='waitlist_signups' AND policyname='Deny delete on waitlist_signups'
  ) THEN
    CREATE POLICY "Deny delete on waitlist_signups"
    ON public.waitlist_signups
    FOR DELETE
    USING (false);
  END IF;
END
$$;