'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Search, FileText, Edit2, Trash2, Eye, Loader2 } from 'lucide-react'

const CATEGORIES = ['Contract', 'Proposal', 'Invoice Template', 'Brief', 'Agreement', 'Other']

type Doc = {
  id: string
  title: string
  content: string
  category: string
  client_id: string | null
  created_at: string
  updated_at: string
}

type FormState = { title: string; content: string; category: string }

export default function AdminDocumentsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [viewing, setViewing] = useState<Doc | null>(null)
  const [editing, setEditing] = useState<Doc | null>(null)
  const [form, setForm] = useState<FormState>({ title: '', content: '', category: 'Contract' })
  const [saving, setSaving] = useState(false)

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['admin-documents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .order('updated_at', { ascending: false })
      return (data || []) as Doc[]
    },
    enabled: !!user,
  })

  const filtered = docs.filter(d => {
    const ms = d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase())
    const mc = category === 'all' || d.category === category
    return ms && mc
  })

  const saveDoc = useMutation({
    mutationFn: async () => {
      setSaving(true)
      if (editing) {
        const { error } = await supabase
          .from('documents')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('documents')
          .insert({ ...form, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      toast.success(editing ? 'Document updated' : 'Document created')
      setShowNew(false)
      setEditing(null)
      setForm({ title: '', content: '', category: 'Contract' })
      setSaving(false)
    },
    onError: () => {
      toast.error('Failed to save document')
      setSaving(false)
    },
  })

  const deleteDoc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] })
      toast.success('Document deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  function openEdit(doc: Doc) {
    setEditing(doc)
    setForm({ title: doc.title, content: doc.content, category: doc.category })
    setShowNew(true)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const categoryColor: Record<string, string> = {
    Contract: 'bg-blue-50 text-blue-700 border-blue-200',
    Proposal: 'bg-purple-50 text-purple-700 border-purple-200',
    'Invoice Template': 'bg-green-50 text-green-700 border-green-200',
    Brief: 'bg-amber-50 text-amber-700 border-amber-200',
    Agreement: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Other: 'bg-gray-50 text-gray-700 border-gray-200',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">{docs.length} documents</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setForm({ title: '', content: '', category: 'Contract' }); setShowNew(true) }}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" /> New Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search documents…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{search || category !== 'all' ? 'No documents match' : 'No documents yet'}</p>
          <p className="text-sm text-gray-400 mt-1">
            {search || category !== 'all' ? 'Try adjusting your filters' : 'Create your first document to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <Card key={doc.id} className="border-gray-200 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{doc.title}</p>
                    <Badge className={`text-xs border ${categoryColor[doc.category] || categoryColor['Other']}`} variant="outline">
                      {doc.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{doc.content?.slice(0, 120)}…</p>
                  <p className="text-xs text-gray-400 mt-1">Updated {formatDate(doc.updated_at)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewing(doc)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(doc)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm('Delete this document?')) deleteDoc.mutate(doc.id)
                    }}
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

      {/* Create / Edit Dialog */}
      <Dialog open={showNew} onOpenChange={open => { if (!open) { setShowNew(false); setEditing(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Document' : 'New Document'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label htmlFor="doc-title">Title</Label>
                <Input
                  id="doc-title"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Document title"
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v ?? "Contract" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Document content…"
                rows={12}
                className="resize-none font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowNew(false); setEditing(null) }}>
              Cancel
            </Button>
            <Button
              onClick={() => saveDoc.mutate()}
              disabled={!form.title || !form.content || saving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={open => { if (!open) setViewing(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewing?.title}
              <Badge className={`text-xs border ${categoryColor[viewing?.category || 'Other'] || categoryColor['Other']}`} variant="outline">
                {viewing?.category}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
              {viewing?.content}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            <Button onClick={() => { setViewing(null); if (viewing) openEdit(viewing) }} className="bg-indigo-600 hover:bg-indigo-700">
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
