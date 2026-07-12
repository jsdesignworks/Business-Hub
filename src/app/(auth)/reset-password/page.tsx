'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let settled = false
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true
        setReady(true)
      }
    }, 2500)

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        settled = true
        window.clearTimeout(timeout)
        setHasSession(true)
        setReady(true)
      }
    }

    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        settled = true
        window.clearTimeout(timeout)
        setHasSession(true)
        setReady(true)
      }
    })

    return () => {
      window.clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Password updated. Please sign in.')
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>
            {ready && !hasSession
              ? 'This reset link is invalid or has expired'
              : 'Choose a new password for your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : !hasSession ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-500">
                Request a new link from the sign-in page.
              </p>
              <Link
                href="/login"
                className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
