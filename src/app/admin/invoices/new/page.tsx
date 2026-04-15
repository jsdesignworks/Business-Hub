'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface LineItem { description: string; quantity: number; unitPrice: number }

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    clientId: searchParams.get('client') ?? '',
    dueDate: '',
    notes: '',
    status: 'draft',
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ])

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-select'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, full_name, company').order('full_name')
      return data ?? []
    },
  })

  const total = lineItems.reduce((s, item) => s + item.quantity * item.unitPrice, 0)

  const updateLine = (idx: number, field: keyof LineItem, value: string | number) => {
    setLineItems((items) =>
      items.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  const addLine = () => setLineItems((items) => [...items, { description: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (idx: number) => setLineItems((items) => items.filter((_, i) => i !== idx))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId) { toast.error('Please select a client'); return }
    if (lineItems.some((l) => !l.description)) { toast.error('All line items need a description'); return }
    setLoading(true)

    // Generate invoice number
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
    const number = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`

    const { error } = await supabase.from('invoices').insert({
      client_id: form.clientId,
      number,
      amount: total,
      status: form.status,
      due_date: form.dueDate || null,
      notes: form.notes || null,
      line_items: lineItems,
    })

    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Invoice created!')
    router.push('/admin/invoices')
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-gray-500">
          <Link href="/admin/invoices">
            <ArrowLeft className="w-4 h-4 mr-1" />Back to Invoices
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        <p className="text-gray-500 text-sm mt-1">Create a new invoice for a client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client <span className="text-red-500">*</span></Label>
                <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v ?? "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients as any[]).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}{c.company ? ` (${c.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? "draft" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-3.5 h-3.5 mr-1" />Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 uppercase">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-3">Unit Price</div>
              <div className="col-span-1"></div>
            </div>
            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                    className="text-center"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPrice}
                    onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {/* Total */}
            <div className="flex justify-end pt-2 border-t">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Payment terms, additional info..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline"><Link href="/admin/invoices">Cancel</Link></Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
            {loading ? 'Creating…' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
