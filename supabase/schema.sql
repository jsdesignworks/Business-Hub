-- Design Business Hub - Supabase Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (mirrors auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'prospect' check (role in ('admin','client','prospect')),
  created_at timestampwithtimezone default now(),
  updated_at timestampwithtimezone default now()
);

-- CLIENTS
create table clients (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  company text,
  status text not null default 'prospect' check (status in ('prospect','active','inactive','churned')),
  tags text[] default '{}',
  notes text,
  created_at timestampwithtimezone default now(),
  updated_at timestampwithtimezone default now()
);

-- QUESTIONNAIRES
create table questionnaires (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  fields jsonb default '[]',
  created_by uuid references profiles(id) on delete set null,
  created_at timestampwithtimezone default now(),
  updated_at timestampwithtimezone default now()
);

-- QUESTIONNAIRE ASSIGNMENTS
create table questionnaire_assignments (
  id uuid default uuid_generate_v4() primary key,
  questionnaire_id uuid references questionnaires(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  responses jsonb default '{}',
  completed_at timestampwithtimezone,
  created_at timestampwithtimezone default now()
);

-- INVOICES
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  number text not null unique,
  amount numeric(q12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','paid','overdue','cancelled')),
  due_date timestampwithtimezone,
  paid_at timestampwithtimezone,
  line_items jsonb default '[]',
  notes text,
  created_at timestampwithtimezone default now(),
  updated_at timestampwithtimezone default now()
);

-- MESSAGES
create table messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references profiles(id) on delete set null,
  recipient_id uuid references profiles(id) on delete set null,
  client_id uuid references clients(id) on delete cascade,
  subject text,
  body text not null,
  read boolean default false,
  created_at timestampwithtimezone default now()
);

-- FILES
create table files (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  name text not null,
  size integer default 0,
  mime_type text,
  storage_path text not null,
  created_at timestampwithtimezone default now()
);

-- Auto update profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as
$$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS Policies
alter table profiles enable row level security;
alter table clients enable row level security;
alter table questionnaires enable row level security;
alter table questionnaire_assignments enable row level security;
alter table invoices enable row level security;
alter table messages enable row level security;
alter table files enable row level security;

-- Profiles: users can read/update own; admins can read all
create policy "users_own_profile" on profiles for all using (acth.uid() = id);
create policy "admins_all_profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Clients: only admins
create policy "admins_manage_clients" on clients for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Clients can see their own record
create policy "clients_view_own" on clients for select using (
  profile_id = auth.uid()
);
