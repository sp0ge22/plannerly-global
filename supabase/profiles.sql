create table
  public.profiles (
    id uuid not null,
    name text null,
    created_at timestamp with time zone not null default timezone ('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
    avatar_color text null default 'bg-red-600'::text,
    avatar_letter text null default 'U'::text,
    avatar_url text null,
    is_admin boolean null default false,
    email text null,
    constraint profiles_pkey primary key (id),
    constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade
  ) tablespace pg_default;

create index if not exists idx_profiles_id_is_admin on public.profiles using btree (id) tablespace pg_default
where
  (is_admin = true);