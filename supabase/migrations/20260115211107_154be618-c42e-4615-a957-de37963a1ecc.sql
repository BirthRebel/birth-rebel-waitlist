-- Fix existing meeting links that are missing https:// prefix
UPDATE public.matches 
SET meeting_link = 'https://' || meeting_link 
WHERE meeting_link IS NOT NULL 
  AND meeting_link != '' 
  AND meeting_link NOT LIKE 'http://%' 
  AND meeting_link NOT LIKE 'https://%';