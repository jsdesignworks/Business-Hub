-- Ensure jake@designworks.app is an admin after profiles backfill.
-- Run in SQL Editor for project yvtxsormqbeoszzkfhby.

select id, email, role from public.profiles order by email;

update public.profiles
set role = 'admin', updated_at = now()
where lower(email) = 'jake@designworks.app';

select id, email, role from public.profiles
where lower(email) = 'jake@designworks.app';
