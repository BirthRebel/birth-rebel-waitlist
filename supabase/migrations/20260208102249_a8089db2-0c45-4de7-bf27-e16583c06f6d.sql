-- Fix existing meeting links that contain pasted calendar text
UPDATE matches 
SET meeting_link = (regexp_match(meeting_link, '(https?://(?:meet\.google\.com|calendar\.app\.google|zoom\.us|teams\.microsoft\.com)\S*)'))[1]
WHERE meeting_link IS NOT NULL 
AND meeting_link ~ '\s';

-- For any remaining links with spaces that didn't match known domains, extract first URL
UPDATE matches 
SET meeting_link = (regexp_match(meeting_link, '(https?://\S+)'))[1]
WHERE meeting_link IS NOT NULL 
AND meeting_link ~ '\s';