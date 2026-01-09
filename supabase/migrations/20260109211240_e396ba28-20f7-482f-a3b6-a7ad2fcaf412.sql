-- Add expiration date columns for document tracking
ALTER TABLE public.caregivers
ADD COLUMN training_certificate_expires date,
ADD COLUMN additional_certificate_1_expires date,
ADD COLUMN additional_certificate_2_expires date,
ADD COLUMN dbs_certificate_expires date,
ADD COLUMN insurance_certificate_expires date;

-- Add a comment explaining the columns
COMMENT ON COLUMN public.caregivers.training_certificate_expires IS 'Expiration date for the training certificate';
COMMENT ON COLUMN public.caregivers.additional_certificate_1_expires IS 'Expiration date for additional certificate 1';
COMMENT ON COLUMN public.caregivers.additional_certificate_2_expires IS 'Expiration date for additional certificate 2';
COMMENT ON COLUMN public.caregivers.dbs_certificate_expires IS 'Expiration date for DBS certificate';
COMMENT ON COLUMN public.caregivers.insurance_certificate_expires IS 'Expiration date for insurance certificate';