'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { Plus, ClipboardList, Search, Trash2 } from 'lucide-react'

export default function QuestionnairesPage() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', questions: [{ text: '', type: 'text' }] })

  const { data: questionnaires = [], isLoading } = useQuery({
    queryKey: ['questionnaires'],
    queryFn: async () => {
      const { data } = await supabase.from('questionnaires').select('*').order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error('Title is required')
      const { error } = await supabase.from('questionnaires').insert({
        title: form.title,
        description: form.description || null,
        questions: form.questions,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Questionnaire created!')
      setShowNew(false)
      setForm({ title: '', description: '', questions: [{ text: '', type: 'text' }] })
      qc.invalidateQueries({ queryKey: ['questionnaires'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, { text: '', type: 'text' }] }))

  const removeQuestion = (i: number) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }))

  const updateQuestion = (i: number, field: string, value: string) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)),
    }))

  const filtered = questionnaires.filter((q: any) =>
    q.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage client questionnaires</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />New Questionnaire
        </Button>
      </div>

      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search questionnaires..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{search ? 'No questionnaires match.' : 'No questionnaires yet.'}</p>
          {!search && (
            <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm" onClick={() => setShowNew(true)}>
              Create First Questionnaire
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((q: any) => (
            <Card key={q.id} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <Badge variant="secondary" className="text-xs">{q.questions?.length ?? 0} questions</Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mt-2 mb-1 group-hover:text-indigo-600 transition-colors">
                  {q.title}
                </h3>
                {q.description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{q.description}</p>}
                <p className="text-xs text-gray-400">Created {formatDate(q.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Questionnaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title <span className="text-red-500">*</span></Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Brand Discovery"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this questionnaire..."
                rows={2}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Questions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Add Question
                </Button>
              </div>
              {form.questions.map((q, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder={`Question ${i + 1}`}
                      value={q.text}
                      onChange={(e) => updateQuestion(i, 'text', e.target.value)}
                    />
                    <Select value={q.type} onValueChange={(v) => updateQuestion(i, 'type', v ?? 'text')}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Short text</SelectItem>
                        <SelectItem value="textarea">Long text</SelectItem>
                        <SelectItem value="select">Single choice</SelectItem>
                        <SelectItem value="multiselect">Multiple choice</SelectItem>
                        <SelectItem value="yesno">Yes/No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(i)}
                      className="mt-2 text-gray-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.title}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {createMutation.isPending ? 'Creating…' : 'Create Questionnaire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
