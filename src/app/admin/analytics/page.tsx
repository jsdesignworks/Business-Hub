'use client'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { Users, DollarSign, ClipboardList, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export default function AnalyticsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['analytics', user?.id],
    queryFn: async () => {
      const [clients, invoices, questionnaires, assignments] = await Promise.all([
        supabase.from('clients').select('id, status, created_at'),
        supabase.from('invoices').select('id, total, status, created_at'),
        supabase.from('questionnaires').select('id, created_at'),
        supabase.from('questionnaire_assignments').select('id, status'),
      ])
      return {
        clients: clients.data ?? [],
        invoices: invoices.data ?? [],
        questionnaires: questionnaires.data ?? [],
        assignments: assignments.data ?? [],
      }
    },
    enabled: !!user,
  })

  const totalRevenue = stats?.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total ?? 0), 0) ?? 0
  const outstanding = stats?.invoices.filter(i => i.status !== 'paid' && i.status !== 'draft').reduce((s, i) => s + (i.total ?? 0), 0) ?? 0
  const activeClients = stats?.clients.filter(c => c.status === 'active').length ?? 0
  const completedQ = stats?.assignments.filter(a => a.status === 'completed').length ?? 0
  const pendingQ = stats?.assignments.filter(a => a.status === 'pending').length ?? 0

  const invoiceByStatus = [
    { label: 'Paid', count: stats?.invoices.filter(i => i.status === 'paid').length ?? 0, color: 'bg-green-100 text-green-700', icon: CheckCircle2, iconColor: 'text-green-500' },
    { label: 'Sent', count: stats?.invoices.filter(i => i.status === 'sent').length ?? 0, color: 'bg-blue-100 text-blue-700', icon: Clock, iconColor: 'text-blue-500' },
    { label: 'Overdue', count: stats?.invoices.filter(i => i.status === 'overdue').length ?? 0, color: 'bg-red-100 text-red-700', icon: AlertCircle, iconColor: 'text-red-500' },
    { label: 'Draft', count: stats?.invoices.filter(i => i.status === 'draft').length ?? 0, color: 'bg-gray-100 text-gray-600', icon: Clock, iconColor: 'text-gray-400' },
  ]

  const clientByStatus = [
    { label: 'Active', count: stats?.clients.filter(c => c.status === 'active').length ?? 0, color: 'bg-green-500' },
    { label: 'Lead', count: stats?.clients.filter(c => c.status === 'lead').length ?? 0, color: 'bg-yellow-400' },
    { label: 'Inactive', count: stats?.clients.filter(c => c.status === 'inactive').length ?? 0, color: 'bg-gray-300' },
  ]
  const totalClients = stats?.clients.length ?? 0

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Business overview and performance metrics</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Outstanding', value: formatCurrency(outstanding), icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'Active Clients', value: activeClients.toString(), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Questionnaires', value: (stats?.questionnaires.length ?? 0).toString(), icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(m => (
          <Card key={m.label}>
            <CardContent className="pt-6">
              {isLoading ? <Skeleton className="h-12" /> : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{m.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-full ${m.bg} flex items-center justify-center`}>
                    <m.icon className={`h-5 w-5 ${m.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Invoice breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : (
              invoiceByStatus.map(s => (
                <div key={s.label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                    <span className="text-sm text-gray-700">{s.label}</span>
                  </div>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Client breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <div className="space-y-4">
                <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
                  {clientByStatus.map(s => (
                    <div
                      key={s.label}
                      className={`${s.color} transition-all`}
                      style={{ width: totalClients ? `${(s.count / totalClients) * 100}%` : '0%' }}
                    />
                  ))}
                </div>
                <div className="space-y-2">
                  {clientByStatus.map(s => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                        <span className="text-gray-600">{s.label}</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {s.count} ({totalClients ? Math.round((s.count / totalClients) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500">Total clients</span>
                  <span className="font-semibold text-gray-900">{totalClients}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questionnaire completion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questionnaire Completion</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-24" /> : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="#6366f1" strokeWidth="3"
                        strokeDasharray={`${(completedQ + pendingQ) > 0 ? (completedQ / (completedQ + pendingQ)) * 100 : 0} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-gray-900">
                        {(completedQ + pendingQ) > 0 ? Math.round((completedQ / (completedQ + pendingQ)) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        <span className="text-gray-600">Completed</span>
                      </div>
                      <span className="font-medium">{completedQ}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                        <span className="text-gray-600">Pending</span>
                      </div>
                      <span className="font-medium">{pendingQ}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? <Skeleton className="h-24" /> : (
              <>
                {[
                  { label: 'Total invoiced', value: stats?.invoices.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0 },
                  { label: 'Collected', value: totalRevenue },
                  { label: 'Outstanding', value: outstanding },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-500">{r.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(r.value)}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Collection rate</span>
                    <span>
                      {(stats?.invoices.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0) > 0
                        ? Math.round((totalRevenue / (stats?.invoices.reduce((s, i) => s + (i.total ?? 0), 0) ?? 1)) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: `${(stats?.invoices.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0) > 0
                          ? Math.round((totalRevenue / (stats?.invoices.reduce((s, i) => s + (i.total ?? 0), 0) ?? 1)) * 100)
                          : 0}%`
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
