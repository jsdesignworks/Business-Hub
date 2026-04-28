'use client'
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { getInitials, statusColor, formatDate, formatCurrency } from '@/lib/utils'
import type { Client } from '@/types'
import { ArrowLeft, Mail, Phone, Building2, Calendar, Edit2, Save, X as XIcon } from 'lucide-react'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Client>>({})

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*').eq('id', id).single()
      return data as Client
    },
  })

  useEffect(() => {
    if (client) setForm(client)
  }, [client])

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices', id],
    queryFn: async () => {
      const { data } = await supabase.from('invoices').select('*').eq('client_id', id).order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: assignments = [] } = useQuery({
    queryKey: ['client-questionnaires', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('questionnaire_assignments')
        .select('*, questionnaires(title)')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('clients').update({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        company: form.company,
        status: form.status,
        notes: form.notes,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Client updated')
      setEditing(false)
      qc.invalidateQueries({ queryKey: ['client', id] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="p-8 space-y-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )

  if (!client) return (
    <div className="p-8 text-center">
      <p className="text-gray-500">Client not found.</p>
      <Button className="mt-4" variant="outline" onClick={() => router.push("/admin/clients")}>Back</Button>
    </div>
  )

  const set = (k: keyof Client, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount), 0)
  const outstanding = invoices.filter((i: any) => i.status === 'sent' || i.status === 'overdue').reduce((s: number, i: any) => s + Number(i.amount), 0)

  return (
    <div className="p-8">
      {/* Back + Header */}
      <Button variant='ghost' size='sm' className='mb-4 -ml-2 text-gray-500' onClick={() => router.push('/admin/clients')}>
        <ArrowLeft className='w-4 h-4 mr-1' />Back to Clients
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-lg font-semibold">
              {getInitials(client.full_name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{client.full_name}</h1>
              <Badge className={`${statusColor(client.status)} border-0`}>{client.status}</Badge>
            </div>
            <p className="text-gray-500 text-sm">{client.email}{client.company && ` · ${client.company}`}</p>
          </div>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => { setForm(client); setEditing(true) }}>
            <Edit2 className="w-4 h-4 mr-2" />Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              <Save className="w-4 h-4 mr-2" />{saveMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <XIcon className="w-4 h-4 mr-2" />Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), color: 'text-green-600' },
          { label: 'Outstanding', value: formatCurrency(outstanding), color: 'text-orange-500' },
          { label: 'Invoices', value: String(invoices.length), color: 'text-blue-600' },
          { label: 'Questionnaires', value: String(assignments.length), color: 'text-purple-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="details">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="questionnaires">Questionnaires ({assignments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {editing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Full Name</Label>
                        <Input value={form.full_name ?? ''} onChange={(e) => set('full_name', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Company</Label>
                        <Input value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Status</Label>
                        <Select value={form.status ?? 'prospect'} onValueChange={(v) => set('status', v ?? 'prospect')}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="prospect">Prospect</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="churned">Churned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${client.email}`} className="text-indigo-600 hover:underline">{client.email}</a>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {client.company && (
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span>{client.company}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Added {formatDate(client.created_at)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={5} placeholder="Internal notes..." />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.notes || <span className="text-gray-400 italic">No notes yet.</span>}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {(client.tags ?? []).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Tags</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(client.tags ?? []).map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button className='w-full justify-start bg-indigo-600 hover:bg-indigo-700' size='sm' onClick={() => router.push('/admin/messages?client=' + id)}>
                    Send Message
                  </Button>
                  <Button className='w-full justify-start' variant='outline' size='sm' onClick={() => router.push('/admin/invoices/new?client=' + id)}>
                    Create Invoice
                  </Button>
                  <Button className='w-full justify-start' variant='outline' size='sm' onClick={() => router.push('/admin/questionnaires?assign=' + id)}>
                    Assign Questionnaire
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="pt-6">
              {invoices.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400">No invoices yet.</p>
                  <Button size='sm' className='mt-3 bg-indigo-600 hover:bg-indigo-700' onClick={() => router.push('/admin/invoices/new?client=' + id)}>
                    Create Invoice
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {invoices.map((inv: any) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">#{inv.number}</p>
                        <p className="text-xs text-gray-400">{formatDate(inv.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${statusColor(inv.status)} border-0 text-xs`}>{inv.status}</Badge>
                        <p className="font-semibold text-sm">{formatCurrency(Number(inv.amount))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questionnaires">
          <Card>
            <CardContent className="pt-6">
              {assignments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400">No questionnaires assigned.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {assignments.map((a: any) => (
                    <div key={a.id} className="py-3 flex items-center justify-between">
                      <p className="font-medium text-sm">{a.questionnaires?.title ?? 'Unnamed'}</p>
                      <Badge className={`${statusColor(a.status)} border-0 text-xs`}>{a.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
