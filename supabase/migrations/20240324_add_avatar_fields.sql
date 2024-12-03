-- Add new columns for avatar customization
ALTER TABLE profiles
ADD COLUMN avatar_color text DEFAULT 'bg-red-600',
ADD COLUMN avatar_letter text DEFAULT 'U';

-- Update existing rows to have default values
UPDATE profiles 
SET 
    avatar_color = 'bg-red-600',
    avatar_letter = 'U'
WHERE avatar_color IS NULL OR avatar_letter IS NULL;
