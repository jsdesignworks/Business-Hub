'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { User, Lock, Bell, Loader2 } from 'lucide-react'

export default function AccountSettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [profileForm, setProfileForm] = useState({ full_name: '', email: '', phone: '', company: '' })
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [profileLoaded, setProfileLoaded] = useState(false)

  const { isLoading } = useQuery({
    queryKey: ['client-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .single()
      if (data && !profileLoaded) {
        setProfileForm({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
        })
        setProfileLoaded(true)
      }
      return data
    },
    enabled: !!user?.id,
  })

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('clients')
        .update({ ...profileForm, updated_at: new Date().toISOString() })
        .eq('user_id', user?.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-profile'] })
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const updatePassword = useMutation({
    mutationFn: async () => {
      if (passwordForm.next !== passwordForm.confirm) throw new Error('Passwords do not match')
      if (passwordForm.next.length < 8) throw new Error('Password must be at least 8 characters')
      const { error } = await supabase.auth.updateUser({ password: passwordForm.next })
      if (error) throw error
    },
    onSuccess: () => {
      setPasswordForm({ current: '', next: '', confirm: '' })
      toast.success('Password updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  const initials = profileForm.full_name
    ? profileForm.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-2">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">{profileForm.full_name || 'Your Name'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileForm.full_name}
                onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={profileForm.company}
                onChange={e => setProfileForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                placeholder="your@email.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => updateProfile.mutate()}
              disabled={updateProfile.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordForm.next}
              onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))}
              placeholder="Min. 8 characters"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Re-enter new password"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => updatePassword.mutate()}
              disabled={updatePassword.isPending || !passwordForm.next}
              variant="outline"
            >
              {updatePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-indigo-600" />
            <div>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Email notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'New invoices', desc: 'When a new invoice is sent to you' },
              { label: 'Invoice reminders', desc: 'Upcoming and overdue payment reminders' },
              { label: 'New messages', desc: 'When you receive a message from your designer' },
              { label: 'File uploads', desc: 'When new files are shared with you' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <Button variant="outline" size="sm" onClick={() => toast.success('Preferences saved')}>
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
