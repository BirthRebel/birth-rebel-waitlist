-- Add secure access token column to parent_requests
ALTER TABLE public.parent_requests
ADD COLUMN access_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Create index for fast token lookups
CREATE INDEX idx_parent_requests_access_token ON public.parent_requests(access_token);

-- Update existing records to have tokens
UPDATE public.parent_requests
SET access_token = encode(gen_random_bytes(32), 'hex')
WHERE access_token IS NULL;