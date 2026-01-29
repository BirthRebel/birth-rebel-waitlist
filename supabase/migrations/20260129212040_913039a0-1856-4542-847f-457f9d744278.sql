-- Clear the orphaned Stripe account that was created before Connect was enabled
-- This will allow the caregiver to re-onboard under the proper Connect platform
UPDATE caregivers 
SET stripe_account_id = NULL, 
    stripe_onboarding_complete = false 
WHERE id = '8e52a0f2-d7ea-4c97-8e33-c51be7432ecf';