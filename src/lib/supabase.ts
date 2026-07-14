import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in .env.local (local) or Vercel env (production) and rebuild.'
    )
  }
  return { url, anonKey }
}

/** One browser client per page load — avoids gotrue lock contention across callers. */
let browserClient: SupabaseClient | null = null

export function createClient() {
  if (browserClient) return browserClient
  const { url, anonKey } = getSupabaseEnv()
  browserClient = createBrowserClient(url, anonKey)
  return browserClient
}
