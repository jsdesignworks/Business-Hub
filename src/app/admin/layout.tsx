'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LayoutDashboard, Users, FileQuestion, Receipt, MessageSquare,
  FolderOpen, FileText, BarChart3, Grid3x3, Settings, LogOut,
  Building2, Shield, Activity, BookOpen,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Clients', href: '/admin/clients', icon: Users },
  { label: 'Questionnaires', href: '/admin/questionnaires', icon: FileQuestion },
  { label: 'Invoices', href: '/admin/invoices', icon: Receipt },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { label: 'Files', href: '/admin/files', icon: FolderOpen },
  { label: 'Documents', href: '/admin/documents', icon: FileText },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Apps', href: '/admin/apps', icon: Grid3x3 },
  { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { label: 'Users', href: '/admin/users', icon: Shield },
  { label: 'System', href: '/admin/system', icon: Activity },
  { label: 'Dev docs', href: '/admin/development', icon: BookOpen },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, isAdmin, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !isAdmin) router.push('/login')
  }, [loading, isAdmin, router])

  if (loading) return (
    <div className="flex h-screen">
      <div className="w-60 border-r bg-white p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
      <div className="flex-1 p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )

  if (!isAdmin) return null

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Design Business Hub</p>
              <p className="text-xs text-gray-500">Admin Center</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
              )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                {profile?.full_name?.[0] ?? 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{profile?.full_name ?? 'Admin'}</p>
              <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm"
            className="w-full justify-start text-gray-500 hover:text-red-600"
            onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
