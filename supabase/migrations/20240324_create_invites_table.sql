-- Helper function to get current user's email (CREATE THIS FIRST)
create or replace function current_user_email()
returns text
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::json->>'email',
    current_setting('request.jwt.claims', true)::json->>'sub'
  );
$$;

-- Then create the table
create table if not exists public.invites (
  email text primary key,
  invited_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  used boolean default false,
  access_key text not null
);

-- Enable RLS
alter table public.invites enable row level security;

-- Drop existing policies first
drop policy if exists "Users can view invites" on public.invites;
drop policy if exists "Only admins can create invites" on public.invites;
drop policy if exists "Allow updates to mark invites as used" on public.invites;
drop policy if exists "Only admins can delete invites" on public.invites;

-- Create policy to allow authenticated users to view invites
create policy "Users can view invites"
  on public.invites for select
  using (true);

-- Create policy to allow only admin users to create invites
create policy "Only admins can create invites"
  on public.invites for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Allow users to mark their own invite as used when setting password
create policy "Users can mark their own invite as used"
  on public.invites for update
  using (
    email = current_user_email()
  )
  with check (
    email = current_user_email()
    and used = true  -- Only allow setting used to true
    and (select used from public.invites where email = current_user_email()) = false  -- Only if it wasn't already used
  );

-- Add policy to allow admin users to delete invites
create policy "Only admins can delete invites"
  on public.invites for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );
