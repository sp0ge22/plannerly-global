create table
  public.user_tenants (
    user_id uuid not null,
    tenant_id uuid not null,
    created_at timestamp with time zone not null default now(),
    is_owner boolean not null default false,
    constraint user_tenants_pkey primary key (user_id, tenant_id),
    constraint user_tenants_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete cascade,
    constraint user_tenants_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;

-- Add is_owner column to existing user_tenants table
ALTER TABLE public.user_tenants 
ADD COLUMN IF NOT EXISTS is_owner boolean not null default false;