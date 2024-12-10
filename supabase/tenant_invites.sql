create table
  public.tenant_invites (
    id uuid not null default gen_random_uuid(),
    tenant_id uuid not null,
    invited_email text not null,
    invited_by uuid not null,
    status text not null default 'pending',
    created_at timestamp with time zone not null default now(),
    expires_at timestamp with time zone not null default (now() + interval '48 hours'),
    accepted_at timestamp with time zone null,
    constraint tenant_invites_pkey primary key (id),
    constraint tenant_invites_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete cascade,
    constraint tenant_invites_invited_by_fkey foreign key (invited_by) references auth.users (id) on delete cascade,
    constraint tenant_invites_status_check check (status in ('pending', 'accepted', 'rejected', 'expired'))
  ) tablespace pg_default;

-- Unique index to prevent duplicate pending invites
create unique index idx_tenant_invites_unique_pending 
  on public.tenant_invites (tenant_id, invited_email) 
  where status = 'pending';

-- Index for looking up invites by email (for showing pending invites to users)
create index idx_tenant_invites_email on public.tenant_invites (invited_email)
where status = 'pending';

-- Index for finding active invites that need to be expired
create index idx_tenant_invites_expires_at on public.tenant_invites (expires_at)
where status = 'pending';

-- RLS policies for tenant_invites
alter table public.tenant_invites enable row level security;

-- Allow tenant owners to create invites
create policy "Tenant owners can create invites"
  on public.tenant_invites for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_tenants ut
      where ut.tenant_id = tenant_invites.tenant_id
      and ut.user_id = auth.uid()
      and ut.is_owner = true
    )
  );

-- Allow users to view invites meant for them
create policy "Users can view their own invites"
  on public.tenant_invites for select
  to authenticated
  using (
    invited_email = (
      select email from public.profiles
      where id = auth.uid()
    )
  );

-- Allow tenant owners to view invites they created
create policy "Tenant owners can view their tenant invites"
  on public.tenant_invites for select
  to authenticated
  using (
    exists (
      select 1 from public.user_tenants ut
      where ut.tenant_id = tenant_invites.tenant_id
      and ut.user_id = auth.uid()
      and ut.is_owner = true
    )
  );

-- Function to automatically expire invites
create or replace function public.expire_tenant_invites()
returns trigger as $$
begin
  update public.tenant_invites
  set status = 'expired'
  where status = 'pending'
  and expires_at <= now();
  return null;
end;
$$ language plpgsql security definer;

-- Trigger to run expire_tenant_invites periodically
create or replace trigger expire_tenant_invites_trigger
  after insert or update on public.tenant_invites
  execute function public.expire_tenant_invites(); 