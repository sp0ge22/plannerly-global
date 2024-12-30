create or replace function public.setup_new_user(
  user_id uuid,
  user_email text,
  user_name text,
  organization_id uuid,
  organization_name text,
  is_joining_existing boolean
)
returns void
language plpgsql
security definer
as $$
declare
  tenant_id uuid;
begin
  -- Start transaction
  begin
    -- Create profile
    insert into public.profiles (
      id,
      email,
      name,
      created_at,
      updated_at
    ) values (
      user_id,
      lower(user_email),
      user_name,
      now(),
      now()
    );

    -- Handle organization setup
    if is_joining_existing then
      -- Verify organization exists
      if not exists (select 1 from public.tenants where id = organization_id) then
        raise exception 'organization not found';
      end if;
      tenant_id := organization_id;
    else
      -- Create new organization
      insert into public.tenants (name)
      values (organization_name)
      returning id into tenant_id;
    end if;

    -- Link user to organization
    insert into public.user_tenants (
      user_id,
      tenant_id,
      is_owner
    ) values (
      user_id,
      tenant_id,
      not is_joining_existing  -- owner if creating, member if joining
    );

    -- Commit transaction
    commit;
  exception
    when others then
      -- Rollback transaction on any error
      rollback;
      raise;
  end;
end;
$$; 