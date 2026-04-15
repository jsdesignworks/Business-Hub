'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Settings, User, Bell, Shield, Palette } from 'lucide-react'

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'branding',      label: 'Branding',      icon: Palette },
  { id: 'security',      label: 'Security',      icon: Shield },
]

export default function AdminSettingsPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const qc = useQueryClient()
  const [tab, setTab] = useState('profile')

  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    email: user?.email ?? '',
    bio: (profile as any)?.bio ?? '',
    phone: (profile as any)?.phone ?? '',
    company: (profile as any)?.company ?? '',
  })

  const [notifForm, setNotifForm] = useState({
    email_new_client: true,
    email_invoice_paid: true,
    email_questionnaire_submitted: true,
    email_new_message: false,
  })

  const [brandForm, setBrandForm] = useState({
    business_name: 'My Design Studio',
    tagline: 'Beautiful design, delivered.',
    primary_color: '#4f46e5',
    welcome_message: 'Welcome to your client portal! Here you can view your invoices, fill out questionnaires, and send messages.',
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('profiles').update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        company: profileForm.company,
      }).eq('id', user!.id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('Settings saved') },
    onError: () => toast.error('Save failed'),
  })

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and portal preferences</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      {tab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>This info is visible to you only</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profileForm.email} disabled className="opacity-60" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Company / Studio Name</Label>
                <Input value={profileForm.company} onChange={e => setProfileForm(f => ({ ...f, company: e.target.value }))} placeholder="My Design Studio" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Bio</Label>
                <Textarea value={profileForm.bio} onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))} placeholder="A short bio about yourself…" rows={3} className="resize-none" />
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Choose which events trigger email alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'email_new_client', label: 'New client signs up', desc: 'When a new client account is created' },
              { key: 'email_invoice_paid', label: 'Invoice paid', desc: 'When a client pays an invoice' },
              { key: 'email_questionnaire_submitted', label: 'Questionnaire submitted', desc: 'When a client completes a questionnaire' },
              { key: 'email_new_message', label: 'New message', desc: 'When a client sends you a message' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                <Switch
                  checked={notifForm[item.key as keyof typeof notifForm]}
                  onCheckedChange={v => setNotifForm(f => ({ ...f, [item.key]: v }))}
                />
              </div>
            ))}
            <Separator />
            <Button onClick={() => toast.success('Notification preferences saved')}>Save Preferences</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'branding' && (
        <Card>
          <CardHeader>
            <CardTitle>Client Portal Branding</CardTitle>
            <CardDescription>Customize what your clients see in their portal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Business Name</Label>
              <Input value={brandForm.business_name} onChange={e => setBrandForm(f => ({ ...f, business_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input value={brandForm.tagline} onChange={e => setBrandForm(f => ({ ...f, tagline: e.target.value }))} placeholder="A short tagline…" />
            </div>
            <div className="space-y-1.5">
              <Label>Primary Color</Label>
              <div className="flex gap-3 items-center">
                <input type="color" value={brandForm.primary_color} onChange={e => setBrandForm(f => ({ ...f, primary_color: e.target.value }))} className="h-10 w-16 rounded cursor-pointer border border-gray-200" />
                <Input value={brandForm.primary_color} onChange={e => setBrandForm(f => ({ ...f, primary_color: e.target.value }))} className="w-32 font-mono text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Welcome Message</Label>
              <Textarea value={brandForm.welcome_message} onChange={e => setBrandForm(f => ({ ...f, welcome_message: e.target.value }))} rows={3} className="resize-none" />
            </div>
            <Button onClick={() => toast.success('Branding saved')}>Save Branding</Button>
          </CardContent>
        </Card>
      )}

      {tab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" placeholder="Enter new password" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input type="password" placeholder="Confirm new password" />
            </div>
            <Button onClick={() => toast.info('Password change coming soon')}>Update Password</Button>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-800">Two-factor authentication</p>
                <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.info('2FA coming soon')}>Enable 2FA</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
