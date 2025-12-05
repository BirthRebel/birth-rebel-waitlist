-- Manually link the caregiver record to the user
UPDATE public.caregivers 
SET user_id = 'c2ea56fa-e327-4f0f-9ef5-30cb35e6bda6'
WHERE email = 'lsdembitzer@gmail.com' AND user_id IS NULL;