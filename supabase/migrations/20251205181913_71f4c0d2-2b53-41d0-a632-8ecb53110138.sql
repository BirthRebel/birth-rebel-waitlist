-- Drop existing table and recreate with columns matching CSV headers exactly
DROP TABLE IF EXISTS public.commissions;
DROP TABLE IF EXISTS public.matches;
DROP TABLE IF EXISTS public.caregivers CASCADE;

-- Recreate caregivers table with columns matching CSV headers
CREATE TABLE public.caregivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  pronouns text,
  first_name text,
  last_name text,
  email text NOT NULL,
  phone text,
  address text,
  address_line_2 text,
  city_town text,
  state_region_province text,
  zip_post_code text,
  country text,
  is_doula boolean DEFAULT false,
  is_private_midwife boolean DEFAULT false,
  is_lactation_consultant boolean DEFAULT false,
  is_sleep_consultant boolean DEFAULT false,
  is_hypnobirthing_coach boolean DEFAULT false,
  is_bereavement_councillor boolean DEFAULT false,
  support_type_other text,
  speaks_english boolean DEFAULT false,
  speaks_french boolean DEFAULT false,
  speaks_german boolean DEFAULT false,
  speaks_spanish boolean DEFAULT false,
  speaks_italian boolean DEFAULT false,
  speaks_punjabi boolean DEFAULT false,
  speaks_urdu boolean DEFAULT false,
  speaks_arabic boolean DEFAULT false,
  speaks_bengali boolean DEFAULT false,
  speaks_gujrati boolean DEFAULT false,
  speaks_portuguese boolean DEFAULT false,
  speaks_mandarin boolean DEFAULT false,
  language_other text,
  certifications_training text,
  years_practicing text,
  births_supported text,
  offers_birth_planning boolean DEFAULT false,
  offers_postnatal_support boolean DEFAULT false,
  offers_active_labour_support boolean DEFAULT false,
  offers_fertility_conception boolean DEFAULT false,
  offers_nutrition_support boolean DEFAULT false,
  offers_lactation_support boolean DEFAULT false,
  offers_newborn_sleep_support boolean DEFAULT false,
  offers_hypnobirthing boolean DEFAULT false,
  offers_loss_bereavement_care boolean DEFAULT false,
  services_other text,
  avail_weekdays_mornings boolean DEFAULT false,
  avail_weekdays_afternoons boolean DEFAULT false,
  avail_weekdays_evenings boolean DEFAULT false,
  avail_weekdays_overnight boolean DEFAULT false,
  avail_weekends_mornings boolean DEFAULT false,
  avail_weekends_afternoons boolean DEFAULT false,
  avail_weekends_evenings boolean DEFAULT false,
  avail_weekends_overnight boolean DEFAULT false,
  unavailable_school_holidays boolean DEFAULT false,
  supports_solo_parents boolean DEFAULT false,
  supports_multiples boolean DEFAULT false,
  supports_families_of_colour boolean DEFAULT false,
  supports_queer_trans boolean DEFAULT false,
  supports_disabled_parents boolean DEFAULT false,
  supports_neurodivergent boolean DEFAULT false,
  supports_trauma_survivors boolean DEFAULT false,
  supports_bereavement boolean DEFAULT false,
  supports_immigrant_refugee boolean DEFAULT false,
  supports_complex_health boolean DEFAULT false,
  supports_home_births boolean DEFAULT false,
  supports_water_births boolean DEFAULT false,
  supports_caesareans boolean DEFAULT false,
  supports_rebozo boolean DEFAULT false,
  care_antenatal_planning boolean DEFAULT false,
  care_birth_support boolean DEFAULT false,
  care_postnatal_support boolean DEFAULT false,
  care_grief_loss boolean DEFAULT false,
  care_full_spectrum boolean DEFAULT false,
  care_fertility_conception boolean DEFAULT false,
  care_feeding_lactation boolean DEFAULT false,
  care_cultural_spiritual boolean DEFAULT false,
  care_style text,
  gdpr_consent boolean DEFAULT false,
  training_certificate_url text,
  additional_certificate_1_url text,
  additional_certificate_2_url text,
  dbs_certificate_url text,
  insurance_certificate_url text,
  typeform_response_id text,
  intake_completed_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caregivers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Caregivers can view their own record" ON public.caregivers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Caregivers can update their own record" ON public.caregivers
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can create their own caregiver record" ON public.caregivers
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Recreate the helper function
CREATE OR REPLACE FUNCTION public.get_current_caregiver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.caregivers WHERE user_id = auth.uid()
$$;

-- Recreate matches table
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caregiver_id uuid NOT NULL REFERENCES public.caregivers(id),
  parent_first_name text NOT NULL,
  parent_email text NOT NULL,
  support_type text NOT NULL,
  status text NOT NULL DEFAULT 'matched',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can view their own matches" ON public.matches
  FOR SELECT USING (caregiver_id = get_current_caregiver_id());

CREATE POLICY "Caregivers can update their own matches" ON public.matches
  FOR UPDATE USING (caregiver_id = get_current_caregiver_id());

-- Recreate commissions table
CREATE TABLE public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id),
  caregiver_id uuid NOT NULL,
  booking_value numeric NOT NULL,
  commission_rate numeric NOT NULL DEFAULT 0.12,
  commission_amount numeric NOT NULL,
  commission_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caregivers can view their own commissions" ON public.commissions
  FOR SELECT USING (caregiver_id = get_current_caregiver_id());

CREATE POLICY "Caregivers can update their own commissions" ON public.commissions
  FOR UPDATE USING (caregiver_id = get_current_caregiver_id());