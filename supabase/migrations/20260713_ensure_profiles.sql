-- Ensure public.profiles exists and is usable via PostgREST (fixes 404 on /rest/v1/profiles).
-- Run in Supabase SQL Editor for project: yvtxsormqbeoszzkfhby
-- (Dashboard → Project Settings → General: confirm Reference ID matches.)

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'prospect' check (role in ('admin', 'client', 'prospect')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "users_own_profile" on public.profiles;
create policy "users_own_profile" on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "admins_all_profiles" on public.profiles;
create policy "admins_all_profiles" on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    case
      when new.raw_user_meta_data->>'role' in ('admin', 'client', 'prospect')
        then new.raw_user_meta_data->>'role'
      else 'client'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for existing auth users (e.g. jake@designworks.app)
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  case
    when u.raw_user_meta_data->>'role' in ('admin', 'client', 'prospect')
      then u.raw_user_meta_data->>'role'
    when lower(coalesce(u.email, '')) = 'jake@designworks.app'
      then 'admin'
    else 'client'
  end
from auth.users u
on conflict (id) do update set
  email = excluded.email,
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  updated_at = now();

notify pgrst, 'reload schema';
