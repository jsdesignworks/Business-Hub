'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import {
  RefreshCw,
  Database,
  Activity,
  Server,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trash2,
} from 'lucide-react'

const TABLE_NAMES = [
  'profiles',
  'clients',
  'questionnaires',
  'questionnaire_assignments',
  'invoices',
  'messages',
  'files',
  'documents',
  'organizations',
] as const

type TableProbe = { name: string; count: number | null; ok: boolean }

type ActivityRow = { id: string; at: string; label: string }

type SystemPayload = {
  tables: TableProbe[]
  activity: ActivityRow[]
  supabaseConnected: boolean
}

function healthFromTables(tables: TableProbe[]): 'healthy' | 'degraded' | 'down' {
  const oks = tables.filter((t) => t.ok).length
  if (oks === tables.length) return 'healthy'
  if (oks === 0) return 'down'
  return 'degraded'
}

export default function SystemPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['system-health', user?.id],
    queryFn: async (): Promise<SystemPayload> => {
      const tables: TableProbe[] = []
      for (const name of TABLE_NAMES) {
        const { count, error } = await supabase
          .from(name)
          .select('*', { count: 'exact', head: true })
        tables.push({
          name,
          count: error ? null : count ?? 0,
          ok: !error,
        })
      }

      const since = new Date()
      since.setDate(since.getDate() - 7)
      const sinceIso = since.toISOString()

      const [
        msgRes,
        clientRes,
        invRes,
        fileRes,
        qRes,
        assignRes,
        docRes,
      ] = await Promise.all([
        supabase
          .from('messages')
          .select('id, created_at, subject, body')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('clients')
          .select('id, created_at, full_name')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('invoices')
          .select('id, created_at, number, amount')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('files')
          .select('id, created_at, name')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('questionnaires')
          .select('id, created_at, title')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('questionnaire_assignments')
          .select('id, created_at, status')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('documents')
          .select('id, created_at, title')
          .gte('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      const activity: ActivityRow[] = []

      for (const m of msgRes.data ?? []) {
        const sub = m.subject ? `: ${m.subject}` : ''
        activity.push({
          id: `msg-${m.id}`,
          at: m.created_at,
          label: `New message${sub}`,
        })
      }
      for (const c of clientRes.data ?? []) {
        activity.push({
          id: `client-${c.id}`,
          at: c.created_at,
          label: `Client added: ${c.full_name}`,
        })
      }
      for (const inv of invRes.data ?? []) {
        const num = (inv as { number?: string }).number ?? '—'
        activity.push({
          id: `inv-${inv.id}`,
          at: inv.created_at,
          label: `Invoice ${num}`,
        })
      }
      for (const f of fileRes.data ?? []) {
        activity.push({
          id: `file-${f.id}`,
          at: f.created_at,
          label: `File uploaded: ${f.name}`,
        })
      }
      for (const q of qRes.data ?? []) {
        activity.push({
          id: `q-${q.id}`,
          at: q.created_at,
          label: `Questionnaire: ${q.title}`,
        })
      }
      for (const a of assignRes.data ?? []) {
        activity.push({
          id: `qa-${a.id}`,
          at: a.created_at,
          label: `Questionnaire assignment (${a.status})`,
        })
      }
      if (!docRes.error) {
        for (const d of docRes.data ?? []) {
          activity.push({
            id: `doc-${d.id}`,
            at: d.created_at,
            label: `Document: ${d.title}`,
          })
        }
      }

      activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      const trimmed = activity.slice(0, 40)

      const profilesProbe = tables.find((t) => t.name === 'profiles')
      const supabaseConnected = profilesProbe?.ok === true

      return { tables, activity: trimmed, supabaseConnected }
    },
    enabled: !!user,
  })

  const health = data ? healthFromTables(data.tables) : 'healthy'
  const healthBadge =
    health === 'healthy' ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 gap-1">
        <CheckCircle2 className="h-3 w-3" /> Healthy
      </Badge>
    ) : health === 'degraded' ? (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200 gap-1">
        <AlertTriangle className="h-3 w-3" /> Degraded
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 gap-1">
        <XCircle className="h-3 w-3" /> Check tables
      </Badge>
    )

  function handleClearCache() {
    queryClient.invalidateQueries()
    toast.success('Application cache refreshed')
  }

  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System</h1>
          <p className="text-gray-500 mt-1">Health, database tables, and recent activity</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isLoading ? <Skeleton className="h-6 w-24 rounded-full" /> : healthBadge}
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-gray-200"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-indigo-600" />
              Database tables
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {data?.tables.map((t) => (
                  <li
                    key={t.name}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2 font-medium text-gray-800">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          t.ok ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={t.ok ? 'OK' : 'Error'}
                      />
                      {t.name}
                    </span>
                    <span className="text-gray-600 tabular-nums">
                      {t.ok ? (t.count ?? 0).toLocaleString() : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              Recent activity
            </CardTitle>
            <p className="text-xs text-gray-500 font-normal">Last 7 days · newest first</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data?.activity.length ? (
              <p className="text-sm text-gray-500 py-6 text-center">No activity in the last 7 days.</p>
            ) : (
              <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {data.activity.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-0.5 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-gray-800">{row.label}</span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(row.at), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-600" />
            System actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-gray-200 w-fit"
            onClick={handleClearCache}
          >
            <Trash2 className="h-4 w-4" />
            Clear cache
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Environment</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {process.env.NODE_ENV}
            </Badge>
            {vercelEnv ? (
              <Badge variant="outline" className="font-mono text-xs">
                Vercel: {vercelEnv}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Supabase</span>
            {isLoading ? (
              <Skeleton className="h-6 w-28" />
            ) : data?.supabaseConnected ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 gap-1">
                <XCircle className="h-3 w-3" /> Unavailable
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-center text-xs text-gray-500">
        <Link href="/admin/development" className="text-indigo-600 hover:underline font-medium">
          Developer documentation
        </Link>
        <span className="text-gray-400"> — architecture, Supabase wiring, and this screen</span>
      </p>
    </div>
  )
}
