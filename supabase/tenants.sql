create table
  public.tenants (
    id uuid not null default gen_random_uuid (),
    name text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint tenants_pkey primary key (id)
  ) tablespace pg_default;