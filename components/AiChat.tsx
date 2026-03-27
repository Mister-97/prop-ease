'use client'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, CheckCircle, X } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  actionTaken?: boolean
}

const SUGGESTIONS = [
  'Which leases expire soon?',
  'Show open maintenance requests',
  'What are my expenses this month?',
  'Which units are vacant?',
]

export default function AiChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! Ask me anything about your properties, or tell me to make a change — like \"add a maintenance request for Sand Dollar\" or \"which leases expire next month?\"",
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(1),
        }),
      })
      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.message,
        actionTaken: data.actionTaken,
      }])
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Something went wrong. Try again.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 left-64 z-50 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      style={{ height: '520px' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-violet-50">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          <p className="text-sm font-semibold text-violet-700">Personal Assistant</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {m.content}
              {m.actionTaken && (
                <div className="flex items-center gap-1 mt-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle size={11} /> Done
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 size={14} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        {messages.length === 1 && !loading && (
          <div className="space-y-1.5 pt-1">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-xs text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-2 rounded-lg transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything or give a command..."
            className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="text-violet-500 hover:text-violet-600 disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
