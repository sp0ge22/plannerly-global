-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create tables
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    email text,
    full_name text,
    is_admin boolean default false
);

create table if not exists public.invites (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    email text not null,
    used boolean default false,
    access_key text not null
);

create table if not exists public.tasks (
    id bigint generated by default as identity primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone,
    title text not null,
    body text not null,
    status text default 'todo' not null,
    assignee uuid references auth.users(id),
    priority text not null,
    due timestamp with time zone,
    user_id uuid references auth.users(id)
);

create table if not exists public.user_permissions (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) not null,
    assignee uuid references auth.users(id) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.tasks enable row level security;
alter table public.user_permissions enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Invites policies (admin only)
create policy "Only admins can manage invites"
    on public.invites for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

-- Tasks policies
create policy "Users can view assigned tasks"
    on public.tasks for select
    using (
        auth.uid() = user_id
        or auth.uid() = (assignee::uuid)
        or exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

create policy "Users can insert tasks"
    on public.tasks for insert
    with check (
        auth.uid() = user_id
        or exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

create policy "Users can update their own tasks or assigned tasks"
    on public.tasks for update
    using (
        auth.uid() = user_id
        or auth.uid() = (assignee::uuid)
        or exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

-- User permissions policies
create policy "Users can view their permissions"
    on public.user_permissions for select
    using (
        auth.uid() = user_id
        or auth.uid() = assignee
        or exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

create policy "Only admins can manage permissions"
    on public.user_permissions for all
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.is_admin = true
        )
    );

-- Create functions referenced in initSupabase.ts
create or replace function init_tasks_table()
returns void
language plpgsql
security definer
as $$
begin
    -- Table is already created above
    return;
end;
$$;

create or replace function create_tasks_policy()
returns void
language plpgsql
security definer
as $$
begin
    -- Policies are already created above
    return;
end;
$$;

-- Create triggers for updated_at
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger set_updated_at
    before update on tasks
    for each row
    execute function update_updated_at_column(); 