-- Delete the older incomplete duplicate entry for Sarah
-- (The newer entry id:0ac68912... has all the data we need)
DELETE FROM parent_requests 
WHERE id = 'fd57656e-d903-43f5-86b1-19266b555e4e';