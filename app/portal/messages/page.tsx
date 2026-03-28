'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPortalTenant } from '@/lib/portal'
import PortalShell from '@/components/PortalShell'
import { Send, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

export default function PortalMessages() {
  const [tenant, setTenant] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const t = await getPortalTenant()
      if (!t) { router.replace('/portal/login'); return }
      setTenant(t)
      const { data } = await supabase
        .from('portal_messages')
        .select('*')
        .eq('tenant_id', t.id)
        .order('created_at', { ascending: true })
      setMessages(data ?? [])
      setLoading(false)
      // mark landlord messages as read
      await supabase.from('portal_messages').update({ read: true }).eq('tenant_id', t.id).eq('sender', 'landlord').eq('read', false)
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || !tenant || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    const { data } = await supabase.from('portal_messages').insert({
      tenant_id: tenant.id,
      sender: 'tenant',
      message: msg,
    }).select().single()
    if (data) setMessages(m => [...m, data])
    setSending(false)
  }

  if (loading || !tenant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <PortalShell tenantName={tenant.name}>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-400 mt-0.5">Chat with your property manager</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col" style={{ height: '60vh' }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No messages yet — send one below</p>
            </div>
          ) : messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === 'tenant' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender === 'tenant' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                <p>{m.message}</p>
                <p className={`text-xs mt-1 ${m.sender === 'tenant' ? 'text-blue-200' : 'text-gray-400'}`}>
                  {format(new Date(m.created_at), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message..."
            className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400 bg-transparent"
          />
          <button
            onClick={send}
            disabled={!input.trim() || sending}
            className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </PortalShell>
  )
}
