'use client'
import { createClient } from '@/lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
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

/** Hard ceiling — must not await hung gotrue locks. */
const AUTH_HARD_TIMEOUT_MS = 5000

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

const emptyAuth: AuthState = {
  user: null, session: null, profile: null,
  loading: false, isAdmin: false, isClient: false, isProspect: false,
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null,
    loading: true, isAdmin: false, isClient: false, isProspect: false,
  })
  const [supabase] = useState(() => createClient())
  const [devBypass, setDevBypass] = useState(false)

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

    if (document.cookie.includes('dev_bypass=1')) {
      setDevBypass(true)
      setState({
        user: { id: 'dev-user', email: 'dev@test.local' } as User,
        session: null,
        profile: {
          id: 'dev-user',
          email: 'dev@test.local',
          full_name: 'Dev User',
          avatar_url: null,
          role: 'admin',
          created_at: '',
          updated_at: '',
        },
        loading: false, isAdmin: true, isClient: false, isProspect: false,
      })
      return
    }

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

    // INITIAL_SESSION covers cookie/session restore without stacking getSession+getUser
    // (those share a navigator lock and can hang past 5s — Codex audit finding).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user ?? null, session)
    })

    // Force-clear loading; do not await another lock-bound auth call here.
    const hardTimeout = window.setTimeout(() => {
      if (cancelled) return
      setState((prev) => (prev.loading ? { ...prev, loading: false } : prev))
    }, AUTH_HARD_TIMEOUT_MS)

    return () => {
      cancelled = true
      window.clearTimeout(hardTimeout)
      subscription.unsubscribe()
    }
  }, [ensureProfile, supabase])

  const signOut = async () => {
    if (devBypass) {
      document.cookie = 'dev_bypass=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
      window.location.reload()
      return
    }
    await supabase.auth.signOut()
    setState(emptyAuth)
  }

  return { ...state, signOut }
}
