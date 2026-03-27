'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, Phone, Mail, Calendar, Upload, Send, X } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import CsvImportModal from '@/components/CsvImportModal'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [composeTo, setComposeTo] = useState<any | null>(null)
  const [emailForm, setEmailForm] = useState({ subject: '', body: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function load() {
    const [t, p, u] = await Promise.all([
      supabase.from('tenants').select('*, units(unit_number, property_id, properties(name))').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name'),
      supabase.from('units').select('id, unit_number, property_id, properties(name)'),
    ])
    setTenants(t.data ?? [])
    setProperties(p.data ?? [])
    setUnits(u.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 mt-1">{tenants.length} tenants</p>
        </div>
        <button onClick={() => setShowImport(true)} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          <Upload size={15} /> Import CSV
        </button>
      </div>

      {showImport && (
        <CsvImportModal type="tenants" properties={properties} units={units} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load() }} />
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-xl border border-gray-200 h-20 animate-pulse" />)}</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>No tenants yet — add them through a property's unit page</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Tenant', 'Property / Unit', 'Contact', 'Lease Period', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: any) => {
                const daysLeft = t.lease_end ? differenceInDays(new Date(t.lease_end), new Date()) : null
                return (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {t.units?.properties?.name}
                      <span className="text-gray-400"> · Unit {t.units?.unit_number}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        {t.email && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Mail size={11} />{t.email}</div>}
                        {t.phone && <div className="flex items-center gap-1.5 text-xs text-gray-500"><Phone size={11} />{t.phone}</div>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {t.lease_start && t.lease_end ? (
                        <span>{format(new Date(t.lease_start), 'MMM d, yy')} – {format(new Date(t.lease_end), 'MMM d, yy')}</span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {daysLeft !== null ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          daysLeft < 0 ? 'bg-red-100 text-red-700' :
                          daysLeft <= 30 ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? `${daysLeft}d left` : 'Active'}
                        </span>
                      ) : <span className="text-xs text-gray-400">No end date</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {t.email && (
                        <button
                          onClick={() => { setComposeTo(t); setEmailForm({ subject: '', body: '' }) }}
                          className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-all"
                        >
                          <Mail size={13} /> Email
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
                <input value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Lease renewal notice" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
