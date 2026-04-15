'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getInitials, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Send, Search, MessageSquare } from 'lucide-react'

export default function MessagesPage() {
  const { profile } = useAuth()
  const supabase = createClient()
  const qc = useQueryClient()
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [search, setSearch] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-messages'],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('id, full_name, email').order('full_name')
      return data ?? []
    },
  })

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', selectedClient],
    queryFn: async () => {
      if (!selectedClient) return []
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, role)')
        .eq('client_id', selectedClient)
        .order('created_at', { ascending: true })
      return data ?? []
    },
    enabled: !!selectedClient,
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!body.trim() || !selectedClient || !profile?.id) return
      const client = clients.find((c: any) => c.id === selectedClient)
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        client_id: selectedClient,
        body: body.trim(),
        subject: null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setBody('')
      qc.invalidateQueries({ queryKey: ['messages', selectedClient] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filteredClients = clients.filter((c: any) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  )

  const selectedClientData = clients.find((c: any) => c.id === selectedClient)

  return (
    <div className="flex h-[calc(100vh-0px)] bg-white">
      {/* Sidebar: client list */}
      <div className="w-72 border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900 mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredClients.map((client: any) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client.id)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${selectedClient === client.id ? 'bg-indigo-50 border-indigo-100' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {getInitials(client.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${selectedClient === client.id ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {client.full_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{client.email}</p>
                </div>
              </div>
            </button>
          ))}
          {filteredClients.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">No clients found</p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      {!selectedClient ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Select a client to start messaging</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <div className="p-4 border-b flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm">
                {getInitials(selectedClientData?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{selectedClientData?.full_name}</p>
              <p className="text-xs text-gray-400">{selectedClientData?.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg: any) => {
                const isAdmin = msg.sender?.role === 'admin'
                return (
                  <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isAdmin ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-xs mt-1 ${isAdmin ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {msg.sender?.full_name ?? 'Unknown'} · {formatDate(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-3 items-end">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type a message..."
                rows={2}
                className="flex-1 resize-none bg-white text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (body.trim()) sendMutation.mutate()
                  }
                }}
              />
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!body.trim() || sendMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 h-10 w-10 p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Press Enter to send, Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </div>
  )
}
