'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ClipboardList, Receipt, MessageSquare, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export default function AccountOverviewPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*').eq('client_id', user!.id).order('created_at', { ascending: false }).limit(3)
      return data ?? []
    },
  })

  const { data: questionnaires = [] } = useQuery({
    queryKey: ['client-questionnaires', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('questionnaire_assignments')
        .select('*, questionnaire:questionnaires(title)')
        .eq('client_id', user!.id)
        .order('assigned_at', { ascending: false })
        .limit(3)
      return data ?? []
    },
  })

  const { data: messages = [] } = useQuery({
    queryKey: ['client-messages-count', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from('messages').select('id').or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
      return data ?? []
    },
  })

  const outstanding = invoices.filter((i: any) => i.status === 'sent' || i.status === 'overdue')
  const pendingQ = questionnaires.filter((q: any) => q.status === 'pending')
  const overdueInv = invoices.filter((i: any) => i.status === 'overdue')

  const greetHour = new Date().getHours()
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening with your projects</p>
      </div>

      {/* Action alerts */}
      {(overdueInv.length > 0 || pendingQ.length > 0) && (
        <div className="space-y-2">
          {overdueInv.map((inv: any) => (
            <div key={inv.id} className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">Invoice #{inv.invoice_number} is overdue — {formatCurrency(inv.total_amount)}</p>
              <Link href="/account/billing">
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-7 text-xs">Pay now</Button>
              </Link>
            </div>
          ))}
          {pendingQ.map((q: any) => (
            <div key={q.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 flex-1">Questionnaire pending: {q.questionnaire?.title}</p>
              <Link href="/account/questionnaires">
                <Button size="sm" variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50 h-7 text-xs">Fill out</Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-amber-50 rounded-xl"><Receipt className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(outstanding.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0))}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-indigo-50 rounded-xl"><ClipboardList className="w-5 h-5 text-indigo-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Pending forms</p>
              <p className="text-lg font-bold text-gray-900">{pendingQ.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 bg-green-50 rounded-xl"><MessageSquare className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-gray-500">Messages</p>
              <p className="text-lg font-bold text-gray-900">{messages.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
          <Link href="/account/billing"><Button variant="ghost" size="sm" className="text-indigo-600 h-7 text-xs">View all <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No invoices yet</p>
          ) : invoices.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-800">Invoice #{inv.invoice_number}</p>
                <p className="text-xs text-gray-400">{formatDate(inv.due_date ? `Due ${inv.due_date}` : inv.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">{formatCurrency(inv.total_amount)}</span>
                <Badge
                  className={`text-xs ${
                    inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                    inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}
                  variant="secondary"
                >
                  {inv.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent questionnaires */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Questionnaires</CardTitle>
          <Link href="/account/questionnaires"><Button variant="ghost" size="sm" className="text-indigo-600 h-7 text-xs">View all <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {questionnaires.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No questionnaires assigned</p>
          ) : questionnaires.map((q: any) => (
            <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                {q.status === 'completed'
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                <p className="text-sm font-medium text-gray-800">{q.questionnaire?.title}</p>
              </div>
              <Badge variant="secondary" className={`text-xs ${q.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
               {q.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
