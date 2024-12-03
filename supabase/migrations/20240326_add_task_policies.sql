-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view tasks they have permission for" ON "public"."tasks";
DROP POLICY IF EXISTS "Users can view their own tasks" ON "public"."tasks";

-- Enable RLS on tasks table if not already enabled
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing tasks
CREATE POLICY "Users can view tasks they have permission for" 
ON "public"."tasks"
FOR SELECT
TO authenticated
USING (
  -- Allow if user has permission for the assignee
  EXISTS (
    SELECT 1 
    FROM user_permissions 
    WHERE user_id = auth.uid() 
    AND assignee = tasks.assignee
  )
  -- Or if user is an admin
  OR EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
  -- Or if task is assigned to the user
  OR assignee = (
    SELECT email 
    FROM auth.users 
    WHERE id = auth.uid()
  )
);
