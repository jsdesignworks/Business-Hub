'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials, formatDate } from '@/lib/utils'
import { Send, MessageSquare } from 'lucide-react'

export default function AccountMessagesPage() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['account-messages', user?.id],
    enabled: !!user,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(full_name, role)')
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order('created_at', { ascending: true })
      return data ?? []
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMutation = useMutation({
    mutationFn: async (body: string) => {
      // Find admin to send to (first admin in profiles)
      const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1)
      const adminId = admins?.[0]?.id
      await supabase.from('messages').insert({ sender_id: user!.id, recipient_id: adminId, body })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['account-messages'] }); setText('') },
  })

  function handleSend() {
    if (!text.trim()) return
    sendMutation.mutate(text.trim())
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-400">Chat with your designer</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'justify-end'}`}>
                {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />}
                <div className={`h-12 rounded-2xl animate-pulse bg-gray-200 ${i % 2 === 0 ? 'w-64' : 'w-48'}`} />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm">Send a message to your designer below</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'items-end'}`}>
                {!isMe && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-600">
                      {getInitials(msg.sender?.full_name ?? 'Admin')}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : ''} flex flex-col`}>
                  {!isMe && <p className="text-xs text-gray-400 px-1">{msg.sender?.full_name}</p>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.body}
                  </div>
                  <p className="text-xs text-gray-400 px-1">{formatDate(msg.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t bg-white flex-shrink-0">
        <div className="flex gap-3">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            className="resize-none flex-1"
          />
          <Button onClick={handleSend} disabled={!text.trim() || sendMutation.isPending} className="self-end h-10">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
