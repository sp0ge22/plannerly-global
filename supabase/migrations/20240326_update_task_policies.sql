-- Drop existing policies
DROP POLICY IF EXISTS "Users can view tasks they have permission for" ON "public"."tasks";

-- Enable RLS
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing tasks
CREATE POLICY "Users can view tasks they have permission for" 
ON "public"."tasks"
FOR ALL
TO authenticated
USING (
  -- Check if user is admin first
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
  -- If not admin, check other conditions
  OR (
    -- User has explicit permission for the assignee
    EXISTS (
      SELECT 1 
      FROM user_permissions 
      WHERE user_id = auth.uid() 
      AND assignee = tasks.assignee
    )
    -- Or task is assigned to the user's email
    OR tasks.assignee = (
      SELECT email 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  )
);

-- Add an index to improve performance
CREATE INDEX IF NOT EXISTS idx_profiles_id_is_admin ON profiles(id) WHERE is_admin = true;
