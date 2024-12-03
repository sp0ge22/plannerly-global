-- Enable RLS on user_permissions table
ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can manage all permissions" ON "public"."user_permissions";
DROP POLICY IF EXISTS "Users can view their own permissions" ON "public"."user_permissions";

-- Policy for admins to manage all permissions
CREATE POLICY "Admins can manage all permissions"
ON "public"."user_permissions"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Policy for users to view their own permissions
CREATE POLICY "Users can view their own permissions"
ON "public"."user_permissions"
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);
