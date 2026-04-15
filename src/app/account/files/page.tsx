'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, FileText, Image, File, Download, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-8 w-8 text-red-500" />,
  png: <Image className="h-8 w-8 text-blue-500" />,
  jpg: <Image className="h-8 w-8 text-blue-500" />,
  jpeg: <Image className="h-8 w-8 text-blue-500" />,
  gif: <Image className="h-8 w-8 text-purple-500" />,
  svg: <Image className="h-8 w-8 text-green-500" />,
}

function getExt(name: string) {
  return name.split('.').pop()?.toLowerCase() || 'file'
}

function getIcon(name: string) {
  const ext = getExt(name)
  return FILE_ICONS[ext] || <File className="h-8 w-8 text-gray-400" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function AccountFilesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [search, setSearch] = useState('')

  const { data: clientData } = useQuery({
    queryKey: ['client-id', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id').eq('user_id', user?.id).single()
      return data
    },
    enabled: !!user?.id,
  })

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['client-files', clientData?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('files')
        .select('*')
        .eq('client_id', clientData?.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!clientData?.id,
  })

  const filtered = files.filter((f: { name: string }) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Files</h1>
        <p className="text-sm text-gray-500 mt-1">Files shared with you by your designer</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {search ? 'No files match your search' : 'No files yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'Files shared by your designer will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
   2      {filtered.map((file: {
            id: string
            name: string
            size?: number
            file_url?: string
            created_at: string
          }) => (
            <Card
              key={file.id}
              className="group relative cursor-pointer hover:shadow-md transition-shadow border-gray-200"
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="mt-2">{getIcon(file.name)}</div>
                <div className="w-full">
                  <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {file.size ? formatSize(file.size) : '—'}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(file.created_at)}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getExt(file.name).toUpperCase()}
                </Badge>
                {file.file_url && (
                  <a
                    href={file.file_url}
                    download
                    onClick={e => e.stopPropagation()}
                    className={cn(
                      'absolute inset-0 flex items-center justify-center rounded-lg',
                      'bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity'
                    )}
                  >
                    <Download className="h-6 w-6 text-white" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {filtered.length} file{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
