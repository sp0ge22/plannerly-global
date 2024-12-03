alter table comments
add column user_id uuid references auth.users(id);
