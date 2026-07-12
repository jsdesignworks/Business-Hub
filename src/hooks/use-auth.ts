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
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    return data as Profile | null
  }, [supabase])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      const profile = user ? await fetchProfile(user.id) : null
      setState({ user, session, profile, loading: false,
        isAdmin: profile?.role === 'admin',
        isClient: profile?.role === 'client',
        isProspect: profile?.role === 'prospect',
      })
    }
    init()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const user = session?.user ?? null
      const profile = user ? await fetchProfile(user.id) : null
      setState({ user, session, profile, loading: false,
        isAdmin: profile?.role === 'admin',
        isClient: profile?.role === 'client',
        isProspect: profile?.role === 'prospect',
      })
    })
    return () => subscription.unsubscribe()
  }, [fetchProfile, supabase])

  const signOut = async () => { await supabase.auth.signOut() }
  return { ...state, signOut }
}
