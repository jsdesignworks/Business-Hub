'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, FolderOpen } from 'lucide-react'

type Doc = {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  updated_at: string
}

const categoryColor: Record<string, string> = {
  Contract: 'bg-blue-50 text-blue-700 border-blue-200',
  Proposal: 'bg-purple-50 text-purple-700 border-purple-200',
  'Invoice Template': 'bg-green-50 text-green-700 border-green-200',
  Brief: 'bg-amber-50 text-amber-700 border-amber-200',
  Agreement: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Other: 'bg-gray-50 text-gray-600 border-gray-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AccountDocumentsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const { data: clientData } = useQuery({
    queryKey: ['client-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id').eq('user_id', user?.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['client-documents', clientData?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientData?.id)
        .order('updated_at', { ascending: false })
      return (data || []) as Doc[]
    },
    enabled: !!clientData?.id,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Contracts, proposals and agreements from your designer</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No documents yet</p>
          <p className="text-sm text-gray-400 mt-1">Documents shared by your designer will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <Card key={doc.id} className="border-gray-200 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs border ${categoryColor[doc.category] ?? categoryColor['Other']}`}
                    >
                      {doc.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{doc.content?.slice(0, 160)}…</p>
                  <p className="text-xs text-gray-400 mt-1">Updated {formatDate(doc.updated_at)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
