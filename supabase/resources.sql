create table
  public.resources (
    id serial not null,
    title text not null,
    url text not null,
    description text null,
    category_id integer null,
    icon text null,
    created_at timestamp with time zone null default now(),
    updated_at timestamp with time zone null default now(),
    image_url text null,
    tenant_id uuid not null,
    constraint resources_pkey primary key (id),
    constraint resources_category_id_fkey foreign key (category_id) references resource_categories (id) on delete cascade,
    constraint resources_tenant_id_fkey foreign key (tenant_id) references tenants (id)
  ) tablespace pg_default;

create index if not exists idx_resources_tenant_id on public.resources using btree (tenant_id) tablespace pg_default;

create trigger update_resources_updated_at before
update on resources for each row
execute function update_updated_at_column ();