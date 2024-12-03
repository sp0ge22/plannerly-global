-- Add access_key column to invites table
alter table public.invites 
add column if not exists access_key text not null;

-- Update the existing policy or create a new one for the access_key
drop policy if exists "Allow updates to mark invites as used" on public.invites;

create policy "Allow updates to mark invites as used"
  on public.invites for update
  using (true)
  with check (
    email = email
    and access_key = access_key
    and (
      select is_admin 
      from public.profiles 
      where id = auth.uid()
    )
  );
