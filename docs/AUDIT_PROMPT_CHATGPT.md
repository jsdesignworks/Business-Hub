# ChatGPT audit prompt — Design Business Hub v2

Copy everything below the line into ChatGPT (GPT-4o / o1 / equivalent). Attach or paste the listed source files (or a zip of `src/`, `supabase/`, `middleware.ts`, and `docs/`). Replace bracketed placeholders if needed.

---

## Role

You are a senior full-stack auditor specializing in **Next.js App Router**, **Supabase (Auth, PostgREST, RLS, Storage)**, and **CRM/portal product architecture**. You are ruthless about schema drift, insecure patterns, and half-wired features. You do **not** invent tables or columns that are not evidenced in the repo. When live DB may differ from the repo, call that out explicitly as a **deployment risk**.

## Product under audit

**Name:** Design Business Hub (v2)  
**Production URL:** `https://dash.designworks.app`  
**Stack:** Next.js (App Router) + Supabase JS / `@supabase/ssr` + TanStack Query + Tailwind  
**Supabase project ref (expected):** `yvtxsormqbeoszzkfhby` (must match `NEXT_PUBLIC_SUPABASE_URL`)  
**Repo paths of interest:** `src/`, `supabase/`, `middleware.ts`, `docs/DEVELOPER_SYSTEM.md`, `docs/CURSOR_HANDOFF.md` (if present)

### Intended domain model (as designed)

| Layer | Table / mechanism | Purpose |
|-------|-------------------|---------|
| Auth identity | `auth.users` + `public.profiles` | Login; `profiles.role` ∈ `admin` \| `client` \| `prospect` gates `/admin` vs `/account` |
| CRM | `public.clients` | Contact/prospect/client records; optional `profile_id` → `profiles.id` |
| Invite | `/api/admin/invite` + service role | Creates auth user + metadata `role`; does **not** create CRM row |
| Add Client | Admin UI insert into `clients` | CRM-only; `profile_id` typically null |
| Portal | `/account/*` | Client-facing; should resolve data via `clients.profile_id = auth.uid()`, then related rows by `client_id` |

Treat **auth user ≠ CRM client** unless `clients.profile_id` is set. Flag any code that conflates `auth.uid()`, `clients.id`, and `profiles.id`.

## Your mission

Produce a **complete technical audit** that a founder/engineer can execute from. Prefer evidence (file path + snippet) over opinion. Rank every finding. End with a **recommended build order** for launch.

## Inputs you must analyze

If files are attached, read them thoroughly. If only partial context is provided, say what is missing and audit what you have. At minimum request or use:

1. `supabase/schema.sql` and all files under `supabase/migrations/`
2. `middleware.ts`
3. `src/lib/supabase.ts`, `src/lib/supabase-server.ts`, `src/lib/supabase-service.ts`
4. `src/hooks/use-auth.ts`
5. `src/app/api/admin/invite/route.ts`
6. All pages under `src/app/admin/**` and `src/app/account/**`
7. `src/app/(auth)/**`, `src/types/index.ts`
8. `docs/DEVELOPER_SYSTEM.md`

## Audit dimensions (cover every section)

### A. Schema vs application drift

1. Enumerate every Supabase call: `.from('table')`, `.storage.from(...)`, `auth.*`, RPC.
2. For each table referenced in app code, check whether it exists in `schema.sql` and/or migrations.
3. For each select/insert/update, list **columns used in code** vs **columns defined in SQL**. Flag mismatches such as:
   - `clients.user_id` (app) vs `clients.profile_id` (schema)
   - invoices: `total` / `total_amount` / `invoice_number` vs `amount` / `number`
   - questionnaires: `questions` vs `fields`
   - files: `url` vs `storage_path`
   - settings: `bio` / `phone` on profiles if not in schema
4. Flag tables used in UI but **missing from repo DDL**: especially `documents`, `organizations`.
5. Note migrations that were written for live SQL Editor runs (ensure_*) vs full schema apply — risk of partial production schema.

### B. Auth, sessions, middleware, roles

1. How session is established (cookies via `@supabase/ssr` vs localStorage).
2. Middleware public routes (`/login`, `/reset-password`, `/onboarding`, `/pay/[id]`, etc.) and redirect rules for admin vs client.
3. Whether `profiles.role` is the single source of truth for admin gates; any client-side-only checks that can be bypassed.
4. Invite flow: service role usage, admin verification, redirectTo, metadata → profile role.
5. Password reset / Site URL / Redirect URLs assumptions.
6. Hard timeouts, singleton clients, layout loading/recovery UX — note remaining failure modes.

### C. RLS and security

1. Which tables have RLS in schema/migrations; which app features assume RLS that may be missing on live.
2. Admin policies that subquery `profiles` inside `profiles` policies (recursion / `42P17`) vs `is_admin()` security definer.
3. Client isolation: can client A read client B’s invoices, files, messages, assignments?
4. Service role: only on server routes? Any `NEXT_PUBLIC_` leakage risk?
5. Storage bucket policies for `files` if referenced.
6. Overly broad `for all` policies; missing `with check`.

### D. Feature completeness (admin + account)

For each major surface, mark **Working / Partial / Broken / Empty / Schema-blocked**:

- Admin: dashboard, clients CRUD, users/invite, invoices, questionnaires, messages, files, documents, organizations, analytics, settings, system health, apps
- Account: home, billing, questionnaires, messages, files, documents, settings
- Auth: login, forgot/reset password
- Public stubs: `/onboarding`, `/pay/[id]`

Call out static/fake data (e.g. admin dashboard zeros, synthetic activity feed).

### E. Data model integrity

1. FK graph: clients → invoices, messages, files, questionnaire_assignments; profiles links.
2. Whether invite + add-client can produce orphaned auth users or CRM rows that never link.
3. Whether account billing uses `client_id = user.id` (auth id) incorrectly vs CRM `clients.id`.
4. Multi-tenant / `organization_id` — present in UI intent but missing in schema?

### F. Ops and env

1. Required env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Build-time baking of `NEXT_PUBLIC_*`; redeploy requirements.
3. System health page probes — which failures mean missing tables vs RLS.

### G. Code quality / Next.js specifics

1. Server vs client boundaries; secrets on client.
2. Error handling (toasts that hide root cause).
3. Obvious bugs (wrong Link nesting, unused imports only if they signal incomplete work).
4. Do **not** rewrite the app; only recommend surgical fixes.

## Output format (mandatory)

### 1. Executive summary (≤10 sentences)

What works, what is blocking launch, biggest schema/security risks.

### 2. Architecture map

Mermaid or ASCII: Auth → profiles → middleware → admin/account; CRM clients; invite API; portal data path (intended vs actual).

### 3. Findings table

| ID | Severity | Area | Finding | Evidence (path) | Impact | Fix |
|----|----------|------|---------|-----------------|--------|-----|
| F1 | Critical / High / Medium / Low / Info | … | … | … | … | … |

Severity guide:
- **Critical:** data leak, auth bypass, or core flow completely broken in production
- **High:** feature unusable due to missing table/column/RLS; wrong ID joins
- **Medium:** partial UI, wrong field names, incomplete RLS on secondary tables
- **Low:** polish, docs drift, deferred nice-to-haves
- **Info:** observations / confirmation of correct patterns

### 4. Schema matrix

| Table | In schema.sql | In migrations | Queried by app | Columns mismatched | RLS status | Notes |
|-------|---------------|---------------|----------------|--------------------|------------|-------|

### 5. Route / page matrix

| Route | Auth required | Role | Data deps | Status | Notes |
|-------|---------------|------|-----------|--------|-------|

### 6. Recommended build order

Numbered list, launch-first. Example themes: ensure core tables → unify `profile_id` on account queries → RLS for invoices/messages/files → wire admin dashboard → onboarding/pay if needed.

### 7. Verification checklist

Concrete steps the human can run after fixes (SQL Editor statements, Network tab checks, invite + add-client + portal smoke tests).

### 8. Out of scope / deferred

Items that are nice-to-have (2FA, PDF, real audit log, multi-tenant, apps hub, tests) — list separately so they are not confused with launch blockers.

## Rules of engagement

- Cite **file paths** and quote short snippets for every Critical/High finding.
- Distinguish **repo schema** vs **likely live DB** (migrations applied piecemeal).
- Do not recommend exposing the service role to the browser.
- Do not propose rewriting the stack (no “switch to Prisma/Firebase”).
- If two docs disagree (`CURSOR_HANDOFF` vs `schema.sql`), prefer **schema.sql + migrations + actual `.from()` calls**, and flag the doc as stale.
- If uncertain, mark **Unknown** and state what evidence would resolve it.
- Prefer fewer, sharper findings over a laundry list of style nits.

## Known context (seed facts — verify, do not assume still true)

- Invite was moved to `POST /api/admin/invite` with `SUPABASE_SERVICE_ROLE_KEY` (browser `auth.admin` was broken).
- Profiles table + RLS recursion were fixed via ensure migrations; admin sticky loading was hardened with singleton client + timeouts.
- Add Client failed with PGRST205 missing `public.clients` until `20260719_ensure_clients.sql` is applied on live.
- Account pages have historically filtered `clients` by `user_id` while schema defines `profile_id`.
- Admin dashboard may still show static zeros.
- `documents` / `organizations` used in UI may lack repo DDL.

## Start now

Begin with the executive summary and findings table. Be thorough; depth beats brevity. Assume the reader will paste your output into a project tracker.
