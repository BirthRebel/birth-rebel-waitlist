-- Delete Stephanie's incorrect entries from parent_requests
DELETE FROM parent_requests 
WHERE email ILIKE '%stephanie%' 
   OR first_name ILIKE '%stephanie%';