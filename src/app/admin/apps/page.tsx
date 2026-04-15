'use client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, Sparkles, BarChart2, Mail, FileSignature, CalendarDays, Link2, Zap, MessageSquare, CreditCard, Globe, BookOpen } from 'lucide-react'

type App = {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  status: 'available' | 'coming_soon' | 'connected'
  href?: string
  color: string
}

const APPS: App[] = [
  { id: 'stripe', name: 'Stripe', description: 'Accept online payments and manage subscriptions with automatic invoice sync.', icon: <CreditCard className="w-6 h-6" />, category: 'Payments', status: 'coming_soon', color: 'bg-violet-100 text-violet-600' },
  { id: 'calendly', name: 'Calendly', description: 'Embed your scheduling link so clients can book discovery calls directly.', icon: <CalendarDays className="w-6 h-6" />, category: 'Scheduling', status: 'coming_soon', color: 'bg-blue-100 text-blue-600' },
  { id: 'mailchimp', name: 'Mailchimp', description: 'Sync your client list and trigger email campaigns on invoice or project events.', icon: <Mail className="w-6 h-6" />, category: 'Email', status: 'coming_soon', color: 'bg-yellow-100 text-yellow-600' },
  { id: 'docusign', name: 'DocuSign', description: 'Send contracts for e-signature right from your client portal.', icon: <FileSignature className="w-6 h-6" />, category: 'Contracts', status: 'coming_soon', color: 'bg-orange-100 text-orange-600' },
  { id: 'slack', name: 'Slack', description: 'Get notified in Slack when clients submit questionnaires or pay invoices.', icon: <MessageSquare className="w-6 h-6" />, category: 'Notifications', status: 'coming_soon', color: 'bg-green-100 text-green-600' },
  { id: 'zapier', name: 'Zapier', description: 'Connect with 5,000+ apps via webhooks — automate any workflow.', icon: <Zap className="w-6 h-6" />, category: 'Automation', status: 'coming_soon', color: 'bg-orange-100 text-orange-700' },
  { id: 'analytics', name: 'Google Analytics', description: 'Track client portal traffic and see which pages get the most engagement.', icon: <BarChart2 className="w-6 h-6" />, category: 'Analytics', status: 'coming_soon', color: 'bg-red-100 text-red-600' },
  { id: 'domain', name: 'Custom Domain', description: 'Use your own domain for the client portal — e.g. clients.yourbrand.com.', icon: <Globe className="w-6 h-6" />, category: 'Branding', status: 'coming_soon', color: 'bg-indigo-100 text-indigo-600' },
  { id: 'notion', name: 'Notion', description: 'Attach Notion pages to projects and surface them inside your client portal.', icon: <BookOpen className="w-6 h-6" />, category: 'Productivity', status: 'coming_soon', color: 'bg-gray-100 text-gray-700' },
  { id: 'webhook', name: 'Webhooks', description: 'Send real-time HTTP events to any endpoint when key actions happen.', icon: <Link2 className="w-6 h-6" />, category: 'Developer', status: 'coming_soon', color: 'bg-teal-100 text-teal-600' },
]

const CATEGORIES = ['All', ...Array.from(new Set(APPS.map(a => a.category)))]

import { useState } from 'react'

export default function AdminAppsPage() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = APPS.filter(a => activeCategory === 'All' || a.category === activeCategory)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Growth Hub <Sparkles className="w-5 h-5 text-indigo-500" />
          </h1>
          <p className="text-sm text-gray-500 mt-1">Connect your favorite tools to supercharge your design business</p>
        </div>
        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100">
          {APPS.filter(a => a.status === 'connected').length} connected
        </Badge>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 p-6 text-white">
        <div className="relative z-10">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-200 mb-1">Coming Soon</p>
          <h2 className="text-xl font-bold mb-2">Integrations are on the way</h2>
          <p className="text-indigo-100 text-sm max-w-lg">We're building direct integrations with the tools you already use. Everything below will be one-click to connect — no code required.</p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-full opacity-10">
          <Zap className="w-full h-full" />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* App grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(app => (
          <Card key={app.id} className="group relative hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${app.color}`}>
                  {app.icon}
                </div>
                <Badge
                  variant={app.status === 'connected' ? 'default' : 'secondary'}
                  className={`text-xs ${
                    app.status === 'connected'
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : app.status === 'coming_soon'
                      ? 'bg-gray-100 text-gray-500'
                      : ''
                  }`}
                >
                  {app.status === 'connected' ? 'Connected' : app.status === 'coming_soon' ? 'Coming soon' : 'Available'}
                </Badge>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{app.name}</p>
                  <Badge variant="outline" className="text-xs">{app.category}</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{app.description}</p>
              </div>
              <Button
                variant={app.status === 'connected' ? 'outline' : 'secondary'}
                size="sm"
                className="w-full"
                disabled={app.status === 'coming_soon'}
              >
                {app.status === 'connected' ? (
                  <><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Manage</>
                ) : app.status === 'coming_soon' ? (
                  'Notify me'
                ) : (
                  'Connect'
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
