'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import { Search, Plus, Receipt, DollarSign, Clock, CheckCircle } from 'lucide-react'

const STATUS_TABS = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const supabase = createClient()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', status],
    queryFn: async () => {
      let q = supabase
        .from('invoices')
        .select('*, clients(full_name, company)')
        .order('created_at', { ascending: false })
      if (status !== 'all') q = q.eq('status', status)
      const { data } = await q
      return data ?? []
    },
  })

  const filtered = invoices.filter((inv: any) =>
    search === '' ||
    inv.number.toLowerCase().includes(search.toLowerCase()) ||
    (inv.clients?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totals = {
    outstanding: invoices.filter((i: any) => i.status === 'sent' || i.status === 'overdue').reduce((s: number, i: any) => s + Number(i.amount), 0),
    paid: invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0),
    overdue: invoices.filter((i: any) => i.status === 'overdue').reduce((s: number, i: any) => s + Number(i.amount), 0),
    draft: invoices.filter((i: any) => i.status === 'draft').reduce((s: number, i: any) => s + Number(i.amount), 0),
  }

  const counts: Record<string, number> = {
    all: invoices.length,
    draft: invoices.filter((i: any) => i.status === 'draft').length,
    sent: invoices.filter((i: any) => i.status === 'sent').length,
    paid: invoices.filter((i: any) => i.status === 'paid').length,
    overdue: invoices.filter((i: any) => i.status === 'overdue').length,
    cancelled: invoices.filter((i: any) => i.status === 'cancelled').length,
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and track client invoices</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Link href="/admin/invoices/new">
            <Plus className="w-4 h-4 mr-2" />New Invoice
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Outstanding', value: formatCurrency(totals.outstanding), icon: Clock, color: 'text-orange-600 bg-orange-50' },
          { label: 'Paid (All Time)', value: formatCurrency(totals.paid), icon: CheckCircle, color: 'text-green-600 bg-green-50' },
          { label: 'Overdue', value: formatCurrency(totals.overdue), icon: Receipt, color: 'text-red-600 bg-red-50' },
          { label: 'Draft', value: formatCurrency(totals.draft), icon: DollarSign, color: 'text-gray-600 bg-gray-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-lg font-bold mt-0.5">{value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by invoice # or client..."
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
              {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{search ? 'No invoices match your search.' : 'No invoices yet.'}</p>
              {!search && (
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm">
                  <Link href="/admin/invoices/new">Create Invoice</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-4 py-2 px-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <div className="col-span-2">Invoice #</div>
                <div className="col-span-4">Client</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {filtered.map((inv: any) => (
                <Link
                  key={inv.id}
                  href={`/admin/invoices/${inv.id}`}
                  className="grid grid-cols-12 gap-4 py-3 px-2 -mx-2 rounded-lg hover:bg-gray-50 items-center group"
                >
                  <div className="col-span-2">
                    <p className="font-mono text-sm font-medium group-hover:text-indigo-600">#{inv.number}</p>
                  </div>
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-gray-900 truncate">{inv.clients?.full_name ?? '—'}</p>
                    {inv.clients?.company && <p className="text-xs text-gray-400 truncate">{inv.clients.company}</p>}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">{formatDate(inv.created_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <Badge className={`text-xs ${statusColor(inv.status)} border-0`}>{inv.status}</Badge>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-sm">{formatCurrency(Number(inv.amount))}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
