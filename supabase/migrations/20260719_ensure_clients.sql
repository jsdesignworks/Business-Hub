-- Ensure public.clients exists for admin CRM (fixes PostgREST PGRST205:
-- "Could not find the table 'public.clients' in the schema cache").
-- Run in Supabase SQL Editor for project: yvtxsormqbeoszzkfhby
-- Prerequisite: public.profiles + public.is_admin() (see 20260713_* migrations).

create extension if not exists "uuid-ossp";

-- Admin check used by RLS (safe if already created by profiles recursion fix)
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

create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  company text,
  status text not null default 'prospect'
    check (status in ('prospect', 'active', 'inactive', 'churned')),
  tags text[] default '{}',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists clients_profile_id_idx on public.clients (profile_id);
create index if not exists clients_email_idx on public.clients (email);
create index if not exists clients_status_idx on public.clients (status);

alter table public.clients enable row level security;

drop policy if exists "admins_manage_clients" on public.clients;
create policy "admins_manage_clients" on public.clients for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "clients_view_own" on public.clients;
create policy "clients_view_own" on public.clients for select
  using (profile_id = auth.uid());

notify pgrst, 'reload schema';
