create table if not exists public.user_permissions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    assignee text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, assignee)
);

-- Add RLS policies
alter table public.user_permissions enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own permissions" on public.user_permissions;
drop policy if exists "Only admins can insert permissions" on public.user_permissions;
drop policy if exists "Only admins can update permissions" on public.user_permissions;
drop policy if exists "Only admins can delete permissions" on public.user_permissions;

-- Create new policies
create policy "Admins can view all permissions"
    on public.user_permissions for select
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

create policy "Users can view their own permissions"
    on public.user_permissions for select
    using (auth.uid() = user_id);

create policy "Only admins can insert permissions"
    on public.user_permissions for insert
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

create policy "Only admins can delete permissions"
    on public.user_permissions for delete
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );
