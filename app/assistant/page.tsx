'use client'
import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, CheckCircle, ArrowUp, Paperclip, X, FileText, ImageIcon, File } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  actionTaken?: boolean
  fileName?: string
}

const SUGGESTIONS = [
  'Which leases expire in the next 60 days?',
  'Show me all open maintenance requests',
  'What are my total expenses this month?',
  'Which units are currently vacant?',
  'Summarize everything going on right now',
]

function fileIcon(type: string) {
  if (type?.startsWith('image/')) return <ImageIcon size={13} className="text-blue-400" />
  if (type === 'application/pdf') return <FileText size={13} className="text-red-400" />
  return <File size={13} className="text-gray-400" />
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if ((!msg && !file) || loading) return
    setInput('')

    const userMsg: Message = {
      role: 'user',
      content: msg || `Attached: ${file?.name}`,
      fileName: file?.name,
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    const attachedFile = file
    setFile(null)

    try {
      let res: Response

      if (attachedFile) {
        const form = new FormData()
        form.append('message', msg)
        form.append('history', JSON.stringify(messages))
        form.append('file', attachedFile)
        res = await fetch('/api/chat', { method: 'POST', body: form })
      } else {
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, history: messages }),
        })
      }

      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.message,
        actionTaken: data.actionTaken,
      }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const empty = messages.length === 0

  return (
    <div className="flex flex-col h-full bg-white" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>

      {/* Empty state */}
      {empty && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles size={22} className="text-violet-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Personal Assistant</h1>
          <p className="text-gray-400 text-sm mb-2 text-center max-w-sm">
            Ask about your properties, or tell me to make a change.
          </p>
          <p className="text-gray-300 text-xs mb-10 text-center">You can also attach a PDF or CSV and I'll read it.</p>
          <div className="grid grid-cols-1 gap-2 w-full max-w-md">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-left text-sm text-gray-600 bg-gray-50 hover:bg-violet-50 hover:text-violet-700 border border-gray-200 hover:border-violet-200 px-4 py-3 rounded-xl transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {!empty && (
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-violet-600" />
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-gray-100 text-gray-900 rounded-br-sm' : 'text-gray-800'
                  }`}>
                    {m.fileName && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1 w-fit">
                        <File size={11} />
                        {m.fileName}
                      </div>
                    )}
                    {m.content}
                  </div>
                  {m.actionTaken && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-green-600 font-medium px-1">
                      <CheckCircle size={11} /> Updated successfully
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles size={13} className="text-violet-600" />
                </div>
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-6 pb-6 pt-2">
        <div className="max-w-2xl mx-auto">
          {/* Attached file preview */}
          {file && (
            <div className="flex items-center gap-2 mb-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-fit">
              {fileIcon(file.type)}
              <span className="text-xs text-gray-700 max-w-[200px] truncate">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-400 ml-1">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-gray-400 hover:text-violet-500 transition-colors flex-shrink-0"
              title="Attach a file"
            >
              <Paperclip size={17} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything, give a command, or attach a file..."
              rows={1}
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder-gray-400 resize-none"
              style={{ maxHeight: '120px' }}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={(!input.trim() && !file) || loading}
              className="w-8 h-8 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 text-white rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            >
              <ArrowUp size={15} />
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.csv,.xlsx,.png,.jpg,.jpeg" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-gray-300 text-center mt-2">Enter to send · Shift+Enter for new line · Attach PDF, CSV, or images</p>
        </div>
      </div>
    </div>
  )
}
