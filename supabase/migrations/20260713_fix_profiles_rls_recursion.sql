-- Fix infinite recursion in profiles RLS (42P17).
-- Admins policy must not SELECT profiles from inside a profiles policy.
-- Run in SQL Editor for yvtxsormqbeoszzkfhby.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

drop policy if exists "admins_all_profiles" on public.profiles;
create policy "admins_all_profiles" on public.profiles for select
  using (public.is_admin());

-- Keep own-row policy (non-recursive)
drop policy if exists "users_own_profile" on public.profiles;
create policy "users_own_profile" on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

notify pgrst, 'reload schema';
