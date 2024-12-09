create table
  public.resource_categories (
    id serial not null,
    name text not null,
    description text null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    image_url text null,
    tenant_id uuid not null,
    constraint resource_categories_pkey primary key (id),
    constraint resource_categories_tenant_id_fkey foreign key (tenant_id) references tenants (id)
  ) tablespace pg_default;

create index if not exists idx_resource_categories_tenant_id on public.resource_categories using btree (tenant_id) tablespace pg_default;

create trigger update_resource_categories_updated_at before
update on resource_categories for each row
execute function update_updated_at_column ();