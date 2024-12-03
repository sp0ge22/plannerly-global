-- Add archived column to tasks table
ALTER TABLE "public"."tasks"
ADD COLUMN IF NOT EXISTS "archived" BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived); 