'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Hammer, Plus, Phone, Mail, Star, X, Send } from 'lucide-react'

const TRADES = ['plumber', 'electrician', 'hvac', 'landscaper', 'cleaner', 'handyman', 'roofer', 'painter', 'pest_control', 'other']

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', trade: 'handyman', phone: '', email: '', notes: '', rating: '5' })
  const [saving, setSaving] = useState(false)
  const [composeTo, setComposeTo] = useState<any | null>(null)
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function sendEmail() {
    if (!composeTo?.email || !emailForm.subject || !emailForm.body) return
    setSending(true)
    await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: composeTo.email, subject: emailForm.subject, body: emailForm.body }),
    })
    setSending(false)
    setSent(true)
    setTimeout(() => { setComposeTo(null); setSent(false); setEmailForm({ subject: '', body: '' }) }, 1500)
  }

  async function load() {
    const { data } = await supabase.from('vendors').select('*').order('name')
    setVendors(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.name || !form.trade) return
    setSaving(true)
    await supabase.from('vendors').insert({ ...form, rating: form.rating ? parseInt(form.rating) : null })
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', trade: 'handyman', phone: '', email: '', notes: '', rating: '5' })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this vendor?')) return
    await supabase.from('vendors').delete().eq('id', id)
    load()
  }

  const tradeLabel = (t: string) => t === 'hvac' ? 'HVAC' : t === 'pest_control' ? 'Pest Control' : t.charAt(0).toUpperCase() + t.slice(1)

  const tradeColors: Record<string, string> = {
    plumber: 'bg-blue-100 text-blue-700',
    electrician: 'bg-yellow-100 text-yellow-700',
    hvac: 'bg-cyan-100 text-cyan-700',
    landscaper: 'bg-green-100 text-green-700',
    cleaner: 'bg-purple-100 text-purple-700',
    handyman: 'bg-orange-100 text-orange-700',
    roofer: 'bg-stone-100 text-stone-700',
    painter: 'bg-pink-100 text-pink-700',
    pest_control: 'bg-red-100 text-red-700',
    other: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6 lg:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-500 mt-1">{vendors.length} vendors in your network</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Add Vendor
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-200 h-36 animate-pulse" />)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Hammer size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No vendors yet</p>
          <p className="text-sm mt-1">Add contractors and service providers</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v: any) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-5 relative group">
              <button
                onClick={() => remove(v.id)}
                className="absolute top-3 right-3 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={15} />
              </button>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700 font-bold text-sm flex-shrink-0">
                  {v.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{v.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tradeColors[v.trade] ?? tradeColors.other}`}>
                    {tradeLabel(v.trade)}
                  </span>
                </div>
              </div>
              {v.rating && (
                <div className="flex items-center gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={12} className={s <= v.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {v.phone && (
                  <a href={`tel:${v.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
                    <Phone size={11} />{v.phone}
                  </a>
                )}
                {v.email && (
                  <div className="flex items-center justify-between">
                    <a href={`mailto:${v.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600">
                      <Mail size={11} />{v.email}
                    </a>
                    <button
                      onClick={() => { setComposeTo(v); setEmailForm({ subject: '', body: '' }) }}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-all"
                    >
                      <Send size={11} /> Email
                    </button>
                  </div>
                )}
              </div>
              {v.notes && <p className="mt-2 text-xs text-gray-400 line-clamp-2">{v.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Add Vendor</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mike's Plumbing" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
                <select value={form.trade} onChange={e => setForm(f => ({ ...f, trade: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {TRADES.map(t => <option key={t} value={t}>{tradeLabel(t)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1–5)</label>
                  <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'⭐'.repeat(r)} ({r})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any notes about this vendor..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {composeTo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Send Email</h2>
                <p className="text-sm text-gray-400">To: {composeTo.name} · {composeTo.email}</p>
              </div>
              <button onClick={() => setComposeTo(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Work request at Sand Dollar" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={6} placeholder="Write your message..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setComposeTo(null)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={sendEmail} disabled={sending || sent || !emailForm.subject || !emailForm.body} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {sent ? 'Sent!' : sending ? 'Sending...' : <><Send size={14} /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
