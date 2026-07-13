'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { LayoutDashboard, MessageSquare, FileQuestion, CreditCard, FolderOpen, FileText, Settings, LogOut } from 'lucide-react'

const navItems = [
  { label: 'Overview', href: '/account', icon: LayoutDashboard },
  { label: 'Messages', href: '/account/messages', icon: MessageSquare },
  { label: 'Questionnaires', href: '/account/questionnaires', icon: FileQuestion },
  { label: 'Billing', href: '/account/billing', icon: CreditCard },
  { label: 'Files', href: '/account/files', icon: FolderOpen },
  { label: 'Documents', href: '/account/documents', icon: FileText },
  { label: 'Settings', href: '/account/settings', icon: Settings },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isAdmin, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (isAdmin) router.push('/admin')
  }, [loading, user, isAdmin, router])

  if (loading || !user) return (
    <div className="flex h-screen">
      <div className="w-60 border-r bg-white p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
      <div className="flex-1 p-8"><Skeleton className="h-64 w-full" /></div>
    </div>
  )

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Account not set up</h1>
          <p className="text-sm text-gray-500">
            You&apos;re signed in, but your profile is missing. Sign out and try again, or contact an admin.
          </p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <Button
            variant="outline"
            onClick={async () => {
              await signOut()
              router.push('/login')
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">Design Business Hub</p>
              <p className="text-xs text-gray-500">Client Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== '/account' && pathname.startsWith(href))
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
                {profile?.full_name?.[0] ?? 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{profile?.full_name ?? 'Client'}</p>
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
