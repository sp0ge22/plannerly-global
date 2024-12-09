create table
  public.notes (
    id uuid not null default extensions.uuid_generate_v4 (),
    user_id text not null,
    title text not null,
    content text not null,
    summary text null,
    is_archived boolean null default false,
    created_at timestamp with time zone null default current_timestamp,
    updated_at timestamp with time zone null default current_timestamp,
    created_by_user_id text not null,
    tags text[] null default '{}'::text[],
    tenant_id uuid not null,
    constraint notes_pkey primary key (id),
    constraint notes_tenant_id_fkey foreign key (tenant_id) references tenants (id)
  ) tablespace pg_default;

create index if not exists idx_notes_tenant_id on public.notes using btree (tenant_id) tablespace pg_default;

create index if not exists notes_user_id_idx on public.notes using btree (user_id) tablespace pg_default;

create index if not exists notes_created_by_user_id_idx on public.notes using btree (created_by_user_id) tablespace pg_default;

create index if not exists notes_is_archived_idx on public.notes using btree (is_archived) tablespace pg_default;

create trigger update_notes_updated_at before
update on notes for each row
execute function update_updated_at_column ();