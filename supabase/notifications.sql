create table
  public.notifications (
    id bigint generated always as identity not null,
    user_id uuid not null,
    type text not null,
    task_id bigint not null,
    read boolean null default false,
    created_at timestamp with time zone not null default timezone ('utc'::text, now()),
    data jsonb null default '{}'::jsonb,
    tenant_id uuid not null,
    constraint notifications_pkey primary key (id),
    constraint notifications_task_id_fkey foreign key (task_id) references tasks (id) on delete cascade,
    constraint notifications_tenant_id_fkey foreign key (tenant_id) references tenants (id),
    constraint notifications_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
    constraint notifications_type_check check (
      (
        type = any (array['new_task'::text, 'new_comment'::text])
      )
    )
  ) tablespace pg_default;

create index if not exists idx_notifications_tenant_id on public.notifications using btree (tenant_id) tablespace pg_default;

create index if not exists notifications_user_id_idx on public.notifications using btree (user_id) tablespace pg_default;

create index if not exists notifications_read_idx on public.notifications using btree (read) tablespace pg_default;