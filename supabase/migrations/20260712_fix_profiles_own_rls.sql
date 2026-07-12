-- Fix profiles RLS: own-row policy must use auth.uid() (was typo acth.uid()).
-- Run in Supabase SQL Editor if not applied via MCP.

drop policy if exists "users_own_profile" on profiles;
create policy "users_own_profile" on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
