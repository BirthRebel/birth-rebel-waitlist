-- Remove document expiry date columns except for insurance
ALTER TABLE public.caregivers
DROP COLUMN IF EXISTS training_certificate_expires,
DROP COLUMN IF EXISTS additional_certificate_1_expires,
DROP COLUMN IF EXISTS additional_certificate_2_expires,
DROP COLUMN IF EXISTS dbs_certificate_expires;