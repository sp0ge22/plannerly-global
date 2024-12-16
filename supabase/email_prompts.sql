create table
  public.email_prompts (
    id uuid not null default gen_random_uuid(),
    title text not null,
    prompt text not null,
    type text not null, -- 'response' or 'rewrite'
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    created_by uuid not null references public.profiles(id) on delete cascade,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone('utc'::text, now()),
    constraint email_prompts_pkey primary key (id)
  ) tablespace pg_default;

-- Create an index for faster lookups by tenant
create index if not exists idx_email_prompts_tenant_id on public.email_prompts using btree (tenant_id);

-- Create an index for faster lookups by creator
create index if not exists idx_email_prompts_created_by on public.email_prompts using btree (created_by);

-- Create RLS policies
alter table public.email_prompts enable row level security;

create policy "Users can view prompts for their tenants"
  on public.email_prompts for select
  using (
    tenant_id in (
      select tenant_id 
      from public.user_tenants 
      where user_id = auth.uid()
    )
  );

create policy "Users can create prompts for their tenants"
  on public.email_prompts for insert
  with check (
    tenant_id in (
      select tenant_id 
      from public.user_tenants 
      where user_id = auth.uid()
    )
  );

create policy "Users can update prompts they created"
  on public.email_prompts for update
  using (created_by = auth.uid())
  with check (
    tenant_id in (
      select tenant_id 
      from public.user_tenants 
      where user_id = auth.uid()
    )
  );

create policy "Users can delete prompts they created"
  on public.email_prompts for delete
  using (created_by = auth.uid()); 