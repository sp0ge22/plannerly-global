-- Function to create a new invite
create or replace function public.create_tenant_invite(
  p_tenant_id uuid,
  p_invited_email text
)
returns json
language plpgsql security definer
as $$
declare
  v_invited_user_id uuid;
  v_result json;
begin
  -- Check if the email exists in profiles
  select id into v_invited_user_id
  from public.profiles
  where email = p_invited_email;

  if v_invited_user_id is null then
    return json_build_object(
      'success', false,
      'message', 'No user found with this email'
    );
  end if;

  -- Create the invite
  insert into public.tenant_invites (
    tenant_id,
    invited_email,
    invited_by
  )
  values (
    p_tenant_id,
    p_invited_email,
    auth.uid()
  )
  returning json_build_object(
    'success', true,
    'invite', json_build_object(
      'id', id,
      'tenant_id', tenant_id,
      'invited_email', invited_email,
      'status', status,
      'expires_at', expires_at
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Helper function to validate invite
create or replace function public.validate_tenant_invite(
  p_invite_id uuid,
  p_user_email text
)
returns uuid
language sql
security definer
stable
as $$
  select tenant_id
  from public.tenant_invites
  where id = p_invite_id
    and invited_email = p_user_email
    and status = 'pending'
    and expires_at > now();
$$;

-- Helper function to handle old tenant
create or replace function public.cleanup_old_tenant(
  p_user_id uuid
)
returns void
language sql
security definer
as $$
  with deleted_membership as (
    delete from public.user_tenants
    where user_id = p_user_id
    returning tenant_id
  ),
  tenant_members as (
    select tenant_id, count(*) as member_count
    from public.user_tenants
    where tenant_id in (select tenant_id from deleted_membership)
    group by tenant_id
  )
  delete from public.tenants t
  where id in (
    select tenant_id 
    from tenant_members 
    where member_count = 0
  );
$$;

-- Main function to accept an invite
create or replace function public.accept_tenant_invite(
  p_invite_id uuid
)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid = auth.uid();
  v_user_email text;
  v_tenant_id uuid;
begin
  -- Get user email
  select email into v_user_email
  from public.profiles
  where id = v_user_id;

  if v_user_email is null then
    return json_build_object(
      'success', false,
      'message', 'User not found'
    );
  end if;

  -- Validate invite and get tenant_id
  v_tenant_id := public.validate_tenant_invite(p_invite_id, v_user_email);

  if v_tenant_id is null then
    return json_build_object(
      'success', false,
      'message', 'Invalid or expired invite'
    );
  end if;

  -- Clean up old tenant
  perform public.cleanup_old_tenant(v_user_id);

  -- Add to new tenant
  insert into public.user_tenants (user_id, tenant_id, is_owner)
  values (v_user_id, v_tenant_id, false);

  -- Update invite status
  update public.tenant_invites
  set status = 'accepted',
      accepted_at = now()
  where id = p_invite_id;

  return json_build_object(
    'success', true,
    'tenant_id', v_tenant_id
  );
exception when others then
  return json_build_object(
    'success', false,
    'message', SQLERRM
  );
end;
$$;

-- Function to reject an invite
create or replace function public.reject_tenant_invite(
  p_invite_id uuid
)
returns json
language plpgsql security definer
as $$
declare
  v_invite record;
  v_user_email text;
begin
  -- Get the user's email
  select email into v_user_email
  from public.profiles
  where id = auth.uid();

  -- Get and validate the invite
  select * into v_invite
  from public.tenant_invites
  where id = p_invite_id
    and invited_email = v_user_email
    and status = 'pending';

  if v_invite is null then
    return json_build_object(
      'success', false,
      'message', 'Invalid invite'
    );
  end if;

  -- Update invite status
  update public.tenant_invites
  set status = 'rejected'
  where id = p_invite_id;

  return json_build_object(
    'success', true
  );
end;
$$; 