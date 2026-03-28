'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageSquare, Send } from 'lucide-react'
import { format } from 'date-fns'

export default function MessagesPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState<Record<string, number>>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tenants')
        .select('id, name, units(unit_number, properties(name))')
        .order('name')
      setTenants(data ?? [])

      // Count unread per tenant
      const { data: unreads } = await supabase
        .from('portal_messages')
        .select('tenant_id')
        .eq('sender', 'tenant')
        .eq('read', false)
      const counts: Record<string, number> = {}
      unreads?.forEach(u => { counts[u.tenant_id] = (counts[u.tenant_id] ?? 0) + 1 })
      setUnread(counts)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.id)
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages(tenantId: string) {
    const { data } = await supabase
      .from('portal_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
    // mark as read
    await supabase.from('portal_messages').update({ read: true }).eq('tenant_id', tenantId).eq('sender', 'tenant').eq('read', false)
    setUnread(u => ({ ...u, [tenantId]: 0 }))
  }

  async function send() {
    if (!input.trim() || !selected || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    const { data } = await supabase.from('portal_messages').insert({
      tenant_id: selected.id,
      sender: 'landlord',
      message: msg,
    }).select().single()
    if (data) setMessages(m => [...m, data])
    setSending(false)
  }

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0)

  return (
    <div className="p-4 lg:p-8 h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-gray-500 mt-1">
          {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'Tenant conversations'}
        </p>
      </div>

      <div className="flex gap-4 h-[70vh] bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Tenant list */}
        <div className="w-64 border-r border-gray-100 overflow-y-auto shrink-0">
          {tenants.length === 0 ? (
            <p className="text-sm text-gray-400 p-4">No tenants yet</p>
          ) : tenants.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${selected?.id === t.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                {unread[t.id] > 0 && (
                  <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">{unread[t.id]}</span>
                )}
              </div>
              <p className="text-xs text-gray-400">{t.units?.properties?.name} · Unit {t.units?.unit_number}</p>
            </button>
          ))}
        </div>

        {/* Chat area */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a tenant to view messages</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">{selected.name}</p>
              <p className="text-xs text-gray-400">{selected.units?.properties?.name} · Unit {selected.units?.unit_number}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No messages yet</div>
              ) : messages.map(m => (
                <div key={m.id} className={`flex ${m.sender === 'landlord' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.sender === 'landlord' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    <p>{m.message}</p>
                    <p className={`text-xs mt-1 ${m.sender === 'landlord' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {format(new Date(m.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-gray-100 p-3 flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send() }}
                placeholder={`Message ${selected.name}...`}
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-400"
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
        )}
      </div>
    </div>
  )
}
