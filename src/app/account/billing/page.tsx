'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Receipt, Download, CreditCard, CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  paid:    { icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-green-100 text-green-700',  label: 'Paid' },
  sent:    { icon: <Clock className="w-4 h-4" />,        color: 'bg-amber-100 text-amber-700',  label: 'Due' },
  overdue: { icon: <AlertCircle className="w-4 h-4" />, color: 'bg-red-100 text-red-700',    label: 'Overdue' },
  draft:   { icon: <Receipt className="w-4 h-4" />,     color: 'bg-gray-100 text-gray-600',   label: 'Draft' },
}

export default function AccountBillingPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['client-invoices-all', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*').eq('client_id', user!.id).order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const totalPaid = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)
  const totalOwed = invoices.filter((i: any) => i.status !== 'paid' && i.status !== 'draft').reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)
  const overdue = invoices.filter((i: any) => i.status === 'overdue')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500 mt-1">Your invoices and payment history</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-green-50 rounded-xl"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-amber-50 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalOwed)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 rounded-xl"><Receipt className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Total Invoices</p>
              <p className="text-xl font-bold text-gray-900">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">You have {overdue.length} overdue invoice{overdue.length > 1 ? 's' : ''}</p>
            <p className="text-xs text-red-600 mt-0.5">Please reach out to your designer to arrange payment.</p>
          </div>
        </div>
      )}

      {/* Invoice list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Receipt className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-gray-500 text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map((inv: any) => {
                const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
                return (
                  <div key={inv.id} className="py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">Invoice #{inv.invoice_number}</p>
                        <Badge variant="secondary" className={`text-xs flex items-center gap-1 ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-gray-400">Issued {formatDate(inv.created_at)}</span>
                        {inv.due_date && <span className="text-xs text-gray-400">Due {formatDate(inv.due_date)}</span>}
                      </div>
                      {inv.description && <p className="text-xs text-gray-500 mt-1 truncate">{inv.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="font-semibold text-gray-900 text-lg">{formatCurrency(inv.total_amount)}</p>
                      {inv.status !== 'paid' && inv.status !== 'draft' && (
                        <Button size="sm" onClick={() => toast.info('Payment integration coming soon — contact your designer to arrange payment.')}>
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />Pay
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toast.info('PDF download coming soon')}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
