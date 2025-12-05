-- Create enum for support types
CREATE TYPE public.support_type AS ENUM ('doula', 'lactation', 'sleep', 'hypnobirthing');

-- Create enum for match status
CREATE TYPE public.match_status AS ENUM ('matched', 'booked', 'closed');

-- Create caregivers table
CREATE TABLE public.caregivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  type_of_support support_type NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  parent_first_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  support_type TEXT NOT NULL,
  status match_status NOT NULL DEFAULT 'matched',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commissions table
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES public.caregivers(id) ON DELETE CASCADE,
  booking_value NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 0.12,
  commission_amount NUMERIC NOT NULL,
  commission_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(match_id)
);

-- Enable RLS on all tables
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Helper function to get caregiver_id for current user
CREATE OR REPLACE FUNCTION public.get_current_caregiver_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.caregivers WHERE user_id = auth.uid()
$$;

-- RLS policies for caregivers
CREATE POLICY "Caregivers can view their own record"
ON public.caregivers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Caregivers can update their own record"
ON public.caregivers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- RLS policies for matches
CREATE POLICY "Caregivers can view their own matches"
ON public.matches
FOR SELECT
TO authenticated
USING (caregiver_id = public.get_current_caregiver_id());

CREATE POLICY "Caregivers can update their own matches"
ON public.matches
FOR UPDATE
TO authenticated
USING (caregiver_id = public.get_current_caregiver_id());

-- RLS policies for commissions
CREATE POLICY "Caregivers can view their own commissions"
ON public.commissions
FOR SELECT
TO authenticated
USING (caregiver_id = public.get_current_caregiver_id());

CREATE POLICY "Caregivers can insert their own commissions"
ON public.commissions
FOR INSERT
TO authenticated
WITH CHECK (caregiver_id = public.get_current_caregiver_id());

CREATE POLICY "Caregivers can update their own commissions"
ON public.commissions
FOR UPDATE
TO authenticated
USING (caregiver_id = public.get_current_caregiver_id());