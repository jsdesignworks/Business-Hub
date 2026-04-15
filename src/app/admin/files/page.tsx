'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDate, fileSizeLabel } from '@/lib/utils'
import { Upload, File, FileImage, FileText, Trash2, Download, Search, FolderOpen } from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  image: <FileImage className="w-5 h-5 text-blue-500" />,
  pdf:   <FileText className="w-5 h-5 text-red-500" />,
  text:  <FileText className="w-5 h-5 text-gray-500" />,
}
function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return ICON_MAP.image
  if (mime === 'application/pdf') return ICON_MAP.pdf
  return ICON_MAP.text ?? <File className="w-5 h-5 text-gray-400" />
}

export default function AdminFilesPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [uploading, setUploading] = useState(false)

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['admin-files'],
    queryFn: async () => {
      const { data } = await supabase
        .from('files')
        .select('*, client:profiles!files_client_id_fkey(full_name, email)')
        .order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-mini'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'client').order('full_name')
      return data ?? []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (file: any) => {
      await supabase.storage.from('files').remove([file.storage_path])
      await supabase.from('files').delete().eq('id', file.id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-files'] }); toast.success('File deleted') },
    onError: () => toast.error('Delete failed'),
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !user) return
    setUploading(true)
    try {
      const path = `admin/${Date.now()}_${f.name}`
      const { error: upErr } = await supabase.storage.from('files').upload(path, f)
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(path)
      await supabase.from('files').insert({
        name: f.name, size: f.size, mime_type: f.type,
        storage_path: path, url: urlData.publicUrl,
        uploaded_by: user.id,
      })
      qc.invalidateQueries({ queryKey: ['admin-files'] })
      toast.success('File uploaded')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const filtered = files.filter((f: any) => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    const matchClient = clientFilter === 'all' || f.client_id === clientFilter
    return matchSearch && matchClient
  })

  const totalSize = files.reduce((s: number, f: any) => s + (f.size ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Files</h1>
          <p className="text-sm text-gray-500 mt-1">{files.length} files · {fileSizeLabel(totalSize)} total</p>
        </div>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading…' : 'Upload File'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search files…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clients.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Files grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No files found</p>
          <p className="text-gray-400 text-sm">Upload a file to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((file: any) => (
            <Card key={file.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-gray-50 rounded-lg">{fileIcon(file.mime_type ?? '')}</div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {file.url && (
                      <a href={file.url} target="_blank" rel="noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-700"
                      onClick={() => deleteMutation.mutate(file)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fileSizeLabel(file.size ?? 0)}</p>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  {file.client ? (
                    <Badge variant="secondary" className="text-xs truncate max-w-[120px]">{file.client.full_name}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Admin</Badge>
                  )}
                  <span className="text-xs text-gray-400">{formatDate(file.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
