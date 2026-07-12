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

  useEffect(() => {
    let cancelled = false

    const applySession = async (session: Session | null) => {
      const user = session?.user ?? null
      let profile: Profile | null = null
      try {
        profile = user ? await fetchProfile(user.id) : null
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
        await applySession(session)
      } catch {
        if (!cancelled) {
          setState({
            user: null, session: null, profile: null,
            loading: false, isAdmin: false, isClient: false, isProspect: false,
          })
        }
      }
    }

    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await applySession(session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchProfile, supabase])

  const signOut = async () => { await supabase.auth.signOut() }
  return { ...state, signOut }
}
