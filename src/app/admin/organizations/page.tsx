'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Search, Building2, Users, Edit2, Trash2, Loader2 } from 'lucide-react'

type Org = {
  id: string
  name: string
  domain?: string
  description?: string
  client_count?: number
  created_at: string
}

type OrgForm = { name: string; domain: string; description: string }

export default function AdminOrganizationsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Org | null>(null)
  const [form, setForm] = useState<OrgForm>({ name: '', domain: '', description: '' })
  const [saving, setSaving] = useState(false)

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('*, clients(count)')
        .order('name', { ascending: true })
      return (data || []) as Org[]
    },
    enabled: !!user,
  })

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.domain?.toLowerCase() ?? '').includes(search.toLowerCase())
  )

  const saveOrg = useMutation({
    mutationFn: async () => {
      setSaving(true)
      if (editing) {
        const { error } = await supabase
          .from('organizations')
          .update({ ...form })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert({ ...form, created_at: new Date().toISOString() })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
      toast.success(editing ? 'Organization updated' : 'Organization created')
      setShowForm(false)
      setEditing(null)
      setForm({ name: '', domain: '', description: '' })
      setSaving(false)
    },
    onError: () => {
      toast.error('Failed to save — check organizations table exists')
      setSaving(false)
    },
  })

  const deleteOrg = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizations').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
      toast.success('Organization deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  function openEdit(org: Org) {
    setEditing(org)
    setForm({ name: org.name, domain: org.domain || '', description: org.description || '' })
    setShowForm(true)
  }

  function openNew() {
    setEditing(null)
    setForm({ name: '', domain: '', description: '' })
    setShowForm(true)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">{orgs.length} organizations</p>
        </div>
        <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> New Organization
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search organizations…"
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{search ? 'No organizations match' : 'No organizations yet'}</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search' : 'Create your first organization to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(org => (
            <Card key={org.id} className="border-gray-200 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{org.name}</p>
                    {org.domain && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                        {org.domain}
                      </Badge>
                    )}
                  </div>
                  {org.description && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{org.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {(org as { clients?: { count: number }[] }).clients?.[0]?.count ?? 0} clients
                    </span>
                    <span className="text-xs text-gray-400">Created {formatDate(org.created_at)}</span>
                  </div>
         2      </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(org)} className="h-8 w-8 p-0">
                    <Edit2 className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { if (confirm('Delete this organization?')) deleteOrg.mutate(org.id) }}
                    className="h-8 w-8 p-0 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); setEditing(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Organization' : 'New Organization'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="org-name">Name *</Label>
              <Input
                id="org-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Organization name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-domain">Domain</Label>
              <Input
                id="org-domain"
                value={form.domain}
                onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                placeholder="example.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-desc">Description</Label>
              <Textarea
                id="org-desc"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description…"
                rows={3}
                className="resize-none"
              />
            </div>
     2    </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null) }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveOrg.mutate()}
              disabled={!form.name || saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
