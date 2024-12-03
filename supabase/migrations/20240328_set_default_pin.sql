-- Set default PIN for all existing users
UPDATE "public"."profiles"
SET pin = '0220'
WHERE pin IS NULL;

-- Add constraint to ensure PIN is not null
ALTER TABLE "public"."profiles"
ALTER COLUMN pin SET DEFAULT '0220',
ALTER COLUMN pin SET NOT NULL; 