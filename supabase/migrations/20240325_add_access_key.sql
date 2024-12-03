-- Add access_key column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='invites' AND column_name='access_key') 
  THEN
    ALTER TABLE invites ADD COLUMN access_key TEXT;
  END IF;
END $$;

-- Update existing NULL or empty access_keys with random values
UPDATE invites 
SET access_key = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
WHERE access_key IS NULL OR access_key = '';

-- Now make the column NOT NULL
ALTER TABLE invites ALTER COLUMN access_key SET NOT NULL;

-- Remove any duplicate access_keys (just in case)
WITH duplicates AS (
  SELECT access_key, 
         ROW_NUMBER() OVER (PARTITION BY access_key ORDER BY created_at) as rnum
  FROM invites
  WHERE access_key IS NOT NULL
)
UPDATE invites i
SET access_key = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
FROM duplicates d
WHERE i.access_key = d.access_key
AND d.rnum > 1;

-- Finally add the unique constraint
ALTER TABLE invites ADD CONSTRAINT invites_access_key_key UNIQUE (access_key);
