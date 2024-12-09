create table
  public.user_permissions (
    id uuid not null default gen_random_uuid (),
    user_id uuid null,
    assignee text not null,
    created_at timestamp with time zone not null default timezone ('utc'::text, now()),
    tenant_id uuid not null,
    constraint user_permissions_pkey primary key (id),
    constraint user_permissions_user_id_assignee_key unique (user_id, assignee),
    constraint user_permissions_tenant_id_fkey foreign key (tenant_id) references tenants (id),
    constraint user_permissions_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;

create index if not exists idx_user_permissions_tenant_id on public.user_permissions using btree (tenant_id) tablespace pg_default;