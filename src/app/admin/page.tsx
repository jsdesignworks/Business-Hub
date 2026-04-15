'use client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileQuestion, Receipt, MessageSquare } from 'lucide-react'

export default function AdminDashboard() {
  const { profile } = useAuth()

  const stats = [
    { label: 'Total Clients', value: '0', icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: 'Questionnaires', value: '0', icon: FileQuestion, color: 'bg-purple-50 text-purple-600' },
    { label: 'Outstanding Invoices', value: '$0', icon: Receipt, color: 'bg-green-50 text-green-600' },
    { label: 'Unread Messages', value: '0', icon: MessageSquare, color: 'bg-orange-50 text-orange-600' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h1>
        <p className="text-gray-500">Here's what's happening with your clients today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 ld:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Clients</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No clients yet. Add your first client to get started.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">No recent activity.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
