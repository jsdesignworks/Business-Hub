'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { ClipboardList, CheckCircle2, Clock, ChevronRight } from 'lucide-react'

export default function AccountQuestionnairesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const qc = useQueryClient()
  const [active, setActive] = useState<any | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['client-questionnaire-assignments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('questionnaire_assignments')
        .select('*, questionnaire:questionnaires(*)')
        .eq('client_id', user!.id)
        .order('assigned_at', { ascending: false })
      return data ?? []
    },
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('questionnaire_assignments')
        .update({ status: 'completed', completed_at: new Date().toISOString(), responses: answers })
        .eq('id', active.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-questionnaire-assignments'] })
      toast.success('Questionnaire submitted!')
      setActive(null); setAnswers({})
    },
    onError: () => toast.error('Submission failed'),
  })

  function openQ(a: any) {
    setActive(a)
    setAnswers(a.responses ?? {})
  }

  const pending = assignments.filter((a: any) => a.status !== 'completed')
  const completed = assignments.filter((a: any) => a.status === 'completed')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
        <p className="text-sm text-gray-500 mt-1">{pending.length} pending · {completed.length} completed</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <ClipboardList className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No questionnaires yet</p>
          <p className="text-gray-400 text-sm">Your designer will send questionnaires here</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">To Do</h2>
              {pending.map((a: any) => (
                <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow border-amber-100" onClick={() => openQ(a)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-amber-50 rounded-xl flex-shrink-0"><Clock className="w-5 h-5 text-amber-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{a.questionnaire?.title}</p>
                      {a.questionnaire?.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.questionnaire.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">Assigned {formatDate(a.assigned_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">Pending</Badge>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Completed</h2>
              {completed.map((a: any) => (
                <Card key={a.id} className="opacity-75 cursor-pointer hover:opacity-100 transition-opacity" onClick={() => openQ(a)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-green-50 rounded-xl flex-shrink-0"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{a.questionnaire?.title}</p>
                      <p className="text-xs text-gray-400 mt-1">Completed {formatDate(a.completed_at)}</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Done</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Questionnaire fill-out dialog */}
      <Dialog open={!!active} onOpenChange={v => { if (!v) { setActive(null); setAnswers({}) } }}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{active?.questionnaire?.title}</DialogTitle>
          </DialogHeader>
          {active?.questionnaire?.description && (
            <p className="text-sm text-gray-500 -mt-2">{active.questionnaire.description}</p>
          )}
          <div className="space-y-5 py-2">
            {(active?.questionnaire?.questions ?? []).map((q: any, i: number) => (
              <div key={i} className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-800">
                  {i + 1}. {q.text}
                  <span className="text-red-500 ml-0.5">*</span>
                </Label>
                {q.type === 'textarea' ? (
                  <Textarea
                    value={answers[i] ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    placeholder="Your answer…"
                    rows={3}
                    className="resize-none"
                    disabled={active?.status === 'completed'}
                  />
                ) : (
                  <Input
                    value={answers[i] ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    placeholder="Your answer…"
                    disabled={active?.status === 'completed'}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActive(null); setAnswers({}) }}>Cancel</Button>
            {active?.status !== 'completed' && (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Submitting…' : 'Submit'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
