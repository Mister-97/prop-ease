'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

export default function AddPropertyModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', zip: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!form.name || !form.address) { setError('Name and address are required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('properties').insert({ ...form, user_id: (await supabase.auth.getUser()).data.user?.id })
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add Property</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {[
            { key: 'name', label: 'Property Name', placeholder: 'e.g. Maple Street Duplex' },
            { key: 'address', label: 'Address', placeholder: '123 Maple St' },
            { key: 'city', label: 'City', placeholder: 'Chicago' },
            { key: 'state', label: 'State', placeholder: 'IL' },
            { key: 'zip', label: 'ZIP Code', placeholder: '60601' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Property'}
          </button>
        </div>
      </div>
    </div>
  )
}
