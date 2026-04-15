# Design Business Hub v2 — Cursor Handoff

## Project Location
```
/users/jacobswapp/Project Dev Manager/Design Business Hub/v2
```

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · React Query · Sonner toasts

## Dev Server
```bash
cd '/users/jacobswapp/Project Dev Manager/Design Business Hub/v2'
npx next dev --port 3000
```
App runs at **http://localhost:3000**

---

## What's Been Built — Complete Page Inventory

| File | Size | Status |
|------|------|--------|
| `src/app/page.tsx` | 478 B | ✅ Root redirect |
| `src/app/layout.tsx` | 935 B | ✅ Root layout + DevBypassToggle |
| `src/app/(auth)/login/page.tsx` | 2.7 KB | ✅ |
| `src/app/admin/layout.tsx` | 4.4 KB | ✅ Sidebar, 13 nav items |
| `src/app/admin/page.tsx` | 2.3 KB | ✅ Dashboard |
| `src/app/admin/clients/page.tsx` | 7.5 KB | ✅ |
| `src/app/admin/clients/new/page.tsx` | 6.8 KB | ✅ |
| `src/app/admin/clients/[id]/page.tsx` | 14.5 KB | ✅ (has pre-existing TS onSuccess warnings — ignore) |
| `src/app/admin/invoices/page.tsx` | 7.8 KB | ✅ |
| `src/app/admin/invoices/new/page.tsx` | 8.8 KB | ✅ |
| `src/app/admin/messages/page.tsx` | 8.1 KB | ✅ |
| `src/app/admin/questionnaires/page.tsx` | 8.7 KB | ✅ |
| `src/app/admin/files/page.tsx` | 7.9 KB | ✅ |
| `src/app/admin/documents/page.tsx` | 12.5 KB | ✅ |
| `src/app/admin/apps/page.tsx` | 7.4 KB | ✅ |
| `src/app/admin/settings/page.tsx` | 9.7 KB | ✅ |
| `src/app/admin/users/page.tsx` | 12.8 KB | ✅ |
| `src/app/admin/analytics/page.tsx` | 11.9 KB | ✅ |
| `src/app/admin/organizations/page.tsx` | 9.6 KB | ✅ |
| `src/app/admin/system/page.tsx` | 490 B | ❌ **STUB — needs full implementation** |
| `src/app/account/layout.tsx` | 4.0 KB | ✅ Client portal sidebar |
| `src/app/account/page.tsx` | 8.4 KB | ✅ |
| `src/app/account/messages/page.tsx` | 5.2 KB | ✅ |
| `src/app/account/billing/page.tsx` | 6.8 KB | ✅ |
| `src/app/account/questionnaires/page.tsx` | 7.7 KB | ✅ |
| `src/app/account/settings/page.tsx` | 9.6 KB | ✅ |
| `src/app/account/files/page.tsx` | 5.7 KB | ✅ |
| `src/app/account/documents/page.tsx` | 3.9 KB | ✅ |

---

## Task 1 — Complete admin/system/page.tsx (PRIORITY)

The file at `src/app/admin/system/page.tsx` is a stub (490 bytes). Replace it entirely with a full implementation.

**What it should do:**
- Show a 2-column grid: left = Database Tables card, right = Recent Activity card
- Database Tables card: query each table and display row counts + green/red status dot
- Recent Activity card: fetch last 7 days of activity and display chronological list with relative timestamps
- System Actions card (full width): Clear Cache button, Environment badge, Supabase Connection status
- Header: System title + health badge + Refresh button

Use the same patterns as other admin pages (useQuery, useAuth, createClient, shadcn components, indigo-600 primary color).

---

## Task 2 — TypeScript

Run: `npx tsc --noEmit 2>&1 | grep 'error TS' | grep -v clients/\[id\]`
Ignore anything in `clients/[id]/page.tsx` - those are pre-existing.

---

## Task 3 — Test Dev Bypass Toggle

Floating pill bottom-right, dev-only. On login page:
1. Click `bypass OFF` -> sets cookie, navigates to /admin
2. Click `bypass ON` -> clears cookie, redirects to /login

---

## Architecture

**Auth pattern every page uses:**
```tsx
'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
export default function Page() {
  const { user } = useAuth()
  const supabase = createClient()
  const { data = [], isLoading } = useQuery({
    queryKey: ['key'],
    queryFn: async () => { const { data } = await supabase.from('table').select('*'); return data || [] },
    enabled: !!user,
  })
}
```

**Dev Bypass System:**
- Cookie `dev_bypass=1` skips all auth in middleware
- `useAuth()` returns mock admin user when cookie is set
- Toggle component: `src/components/shared/DevBypassToggle.tsx`

**TypeScript gotchas:**
- `Select` onValueChange: wrap as `(v) => setState(v ?? 'default')`
- `Button` and `DropdownMenuTrigger` do NOT support `asChild` - remove it

**Style:** indigo-600 primary, gray-900 sidebar, border-gray-200 cards

**Supabase tables:** clients, invoices, messages, questionnaires, files, documents, profiles, organizations

---

## Only One Remaining Task

**Replace the stub at `src/app/admin/system/page.tsx`** - the file currently contains only a "Under construction" placeholder (490 bytes). Every other page in the app is fully built.

---

## Supabase Schema

```sql
-- clients
id uuid, user_id uuid, email text, full_name text, company text,
role text ('admin'|'client'), status text ('active'|'inactive'), created_at timestamptz

-- invoices
id uuid, client_id uuid, invoice_number text, total_amount numeric,
status text ('draft'|'sent'|'paid'|'overdue'), due_date date, created_at timestamptz

-- messages
id uuid, client_id uuid, sender_id uuid, content text, is_read bool, created_at timestamptz

-- questionnaires
id uuid, client_id uuid, title text, status text, questions jsonb, created_at timestamptz

-- files
id uuid, client_id uuid, name text, size bigint, type text, url text, created_at timestamptz

-- documents
id uuid, client_id uuid, title text, content text,
category text ('Contract'|'Proposal'|'Invoice Template'|'Brief'|'Agreement'|'Other'),
updated_at timestamptz, created_at timestamptz

-- profiles
id uuid, role text, full_name text, avatar_url text, bio text, phone text, company text
```
