-- Normalize all existing emails to lowercase to prevent case mismatch issues
UPDATE matches SET parent_email = LOWER(parent_email) WHERE parent_email != LOWER(parent_email);
UPDATE parent_requests SET email = LOWER(email) WHERE email IS NOT NULL AND email != LOWER(email);
UPDATE conversations SET parent_email = LOWER(parent_email) WHERE parent_email != LOWER(parent_email);
UPDATE caregivers SET email = LOWER(email) WHERE email != LOWER(email);