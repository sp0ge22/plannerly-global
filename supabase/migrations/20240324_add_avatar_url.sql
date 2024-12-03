-- Add avatar_url column if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage policies for the avatars bucket
BEGIN;
  -- Enable RLS
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  -- Create policy for authenticated uploads
  DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
  CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
    );

  -- Create policy for updates
  DROP POLICY IF EXISTS "Allow individual update" ON storage.objects;
  CREATE POLICY "Allow individual update" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars');

  -- Create policy for deletes
  DROP POLICY IF EXISTS "Allow individual delete" ON storage.objects;
  CREATE POLICY "Allow individual delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars');

  -- Create policy for public viewing
  DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
  CREATE POLICY "Allow public viewing" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

COMMIT;
