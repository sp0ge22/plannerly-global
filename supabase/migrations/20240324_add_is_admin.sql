-- Add is_admin column to profiles table
alter table public.profiles 
add column if not exists is_admin boolean default false;

-- Set initial admin (replace with your user ID)
update public.profiles 
set is_admin = true 
where id = 'dd60582e-6344-4865-b229-d58ccb05e9aa';
