'use client'
import { createClient } from '@/lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import type { User, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  isClient: boolean
  isProspect: boolean
}

const AUTH_INIT_TIMEOUT_MS = 8000

let browserClient: SupabaseClient | null = null

function getBrowserClient() {
  if (!browserClient) browserClient = createClient()
  return browserClient
}

function rolesFromProfile(profile: Profile | null) {
  return {
    isAdmin: profile?.role === 'admin',
    isClient: profile?.role === 'client',
    isProspect: profile?.role === 'prospect',
  }
}

function roleFromMetadata(user: User): Profile['role'] {
  const meta = user.user_metadata ?? {}
  if (meta.role === 'admin' || meta.role === 'client' || meta.role === 'prospect') {
    return meta.role
  }
  return 'client'
}

export function useAuth() {
  // DEV BYPASS: return mock user when dev_bypass cookie is active
  if (typeof document !== 'undefined' && document.cookie.includes('dev_bypass=1')) {
    const mockUser = { id: 'dev-user', email: 'dev@test.local' } as any
    const mockProfile = { id: 'dev-user', role: 'admin', full_name: 'Dev User' } as any
    return {
      user: mockUser, session: null, profile: mockProfile,
      loading: false, isAdmin: true, isClient: false, isProspect: false,
      signOut: async () => {
        document.cookie = 'dev_bypass=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
        window.location.reload()
      },
    }
  }

  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null,
    loading: true, isAdmin: false, isClient: false, isProspect: false,
  })
  const [supabase] = useState(() => getBrowserClient())

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    return data as Profile | null
  }, [supabase])

  const ensureProfile = useCallback(async (user: User) => {
    let profile = await fetchProfile(user.id)
    if (profile) return profile

    const meta = user.user_metadata ?? {}
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email ?? '',
      full_name: meta.full_name ?? meta.name ?? null,
      role: roleFromMetadata(user),
    })
    return await fetchProfile(user.id)
  }, [fetchProfile, supabase])

  useEffect(() => {
    let cancelled = false

    const applyUser = async (user: User | null, session: Session | null) => {
      let profile: Profile | null = null
      try {
        if (user) profile = await ensureProfile(user)
      } catch {
        profile = null
      }
      if (cancelled) return
      setState({
        user,
        session,
        profile,
        loading: false,
        ...rolesFromProfile(profile),
      })
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        let user = session?.user ?? null

        if (!user) {
          const { data: { user: verified } } = await supabase.auth.getUser()
          user = verified ?? null
        }

        await applyUser(user, session)
      } catch {
        if (!cancelled) {
          setState({
            user: null, session: null, profile: null,
            loading: false, isAdmin: false, isClient: false, isProspect: false,
          })
        }
      }
    }

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setState((prev) => prev.loading
          ? { ...prev, loading: false }
          : prev)
      }
    }, AUTH_INIT_TIMEOUT_MS)

    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applyUser(session?.user ?? null, session)
    })

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [ensureProfile, supabase])

  const signOut = async () => { await supabase.auth.signOut() }
  return { ...state, signOut }
}
