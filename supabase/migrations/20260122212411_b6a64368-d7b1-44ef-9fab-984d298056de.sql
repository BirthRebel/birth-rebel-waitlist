-- Add Stripe Connect fields to caregivers table
ALTER TABLE public.caregivers
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;

-- Create quotes table for itemized pricing
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES public.caregivers(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount INTEGER NOT NULL,
  platform_fee INTEGER GENERATED ALWAYS AS (ROUND(total_amount * 0.10)) STORED,
  caregiver_payout INTEGER GENERATED ALWAYS AS (ROUND(total_amount * 0.90)) STORED,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'paid', 'expired', 'cancelled')),
  payment_intent_id TEXT,
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'first_session_completed', 'released', 'failed')),
  first_session_completed BOOLEAN DEFAULT false,
  first_session_completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all quotes"
ON public.quotes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Caregivers can view and manage their own quotes
CREATE POLICY "Caregivers can view own quotes"
ON public.quotes
FOR SELECT
USING (caregiver_id = public.get_current_caregiver_id());

CREATE POLICY "Caregivers can create own quotes"
ON public.quotes
FOR INSERT
WITH CHECK (caregiver_id = public.get_current_caregiver_id());

CREATE POLICY "Caregivers can update own quotes"
ON public.quotes
FOR UPDATE
USING (caregiver_id = public.get_current_caregiver_id());

-- Add updated_at trigger
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_quotes_caregiver_id ON public.quotes(caregiver_id);
CREATE INDEX idx_quotes_match_id ON public.quotes(match_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);