'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInitials, statusColor, formatDate } from '@/lib/utils'
import type { Client } from '@/types'
import { Search, Plus, Users, TrendingUp, UserCheck, UserX } from 'lucide-react'

const STATUS_TABS = ['all', 'prospect', 'active', 'inactive', 'churned'] as const

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const supabase = createClient()

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', status],
    queryFn: async () => {
      let q = supabase.from('clients').select('*').order('created_at', { ascending: false })
      if (status !== 'all') q = q.eq('status', status)
      const { data } = await q
      return (data ?? []) as Client[]
    },
  })

  const filtered = clients.filter((c) =>
    search === '' ||
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    all: clients.length,
    prospect: clients.filter((c) => c.status === 'prospect').length,
    active: clients.filter((c) => c.status === 'active').length,
    inactive: clients.filter((c) => c.status === 'inactive').length,
    churned: clients.filter((c) => c.status === 'churned').length,
  }

  const stats = [
    { label: 'Total', value: counts.all, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active', value: counts.active, icon: UserCheck, color: 'text-green-600 bg-green-50' },
    { label: 'Prospects', value: counts.prospect, icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
    { label: 'Churned', value: counts.churned, icon: UserX, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your prospects and clients</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Link href="/admin/clients/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Tabs value={status} onValueChange={setStatus} className="mt-2">
            <TabsList className="h-8">
              {STATUS_TABS.map((s) => (
                <TabsTrigger key={s} value={s} className="text-xs capitalize h-7">
                  {s === 'all' ? `All (${counts.all})` : `${s} (${counts[s]})`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {search ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
              </p>
              {!search && (
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm">
                  <Link href="/admin/clients/new">Add Client</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((client) => (
                <Link
                  key={client.id}
                  href={`/admin/clients/${client.id}`}
                  className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
                      {getInitials(client.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 group-hover:text-indigo-600 truncate">
                        {client.full_name}
                      </p>
                      <Badge className={`text-xs ${statusColor(client.status)} border-0`}>
                        {client.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {client.email}
                      {client.company && ` · ${client.company}`}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                    {(client.tags ?? []).slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {(client.tags ?? []).length > 2 && (
                      <span className="text-xs text-gray-400">+{client.tags!.length - 2}</span>
                    )}
                  </div>
                  <p className="hidden md:block text-xs text-gray-400 flex-shrink-0">
                    {formatDate(client.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
