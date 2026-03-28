'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPortalTenant } from '@/lib/portal'
import PortalShell from '@/components/PortalShell'
import { Wrench, Plus, X, CheckCircle, Clock, AlertCircle, ImageIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}
const STATUS_ICONS: Record<string, any> = {
  open: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle,
}

export default function PortalMaintenance() {
  const [tenant, setTenant] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const t = await getPortalTenant()
      if (!t) { router.replace('/portal/login'); return }
      setTenant(t)
      const { data } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('unit_id', t.unit_id)
        .order('created_at', { ascending: false })
      setRequests(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function submit() {
    if (!form.title || !tenant) return
    setSaving(true)

    let photoUrl: string | null = null
    if (photoFile) {
      setUploading(true)
      const ext = photoFile.name.split('.').pop()
      const path = `${tenant.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('maintenance-photos')
        .upload(path, photoFile, { upsert: true })
      setUploading(false)

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('maintenance-photos').getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }
    }

    await supabase.from('maintenance_requests').insert({
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      property_id: tenant.property_id,
      unit_id: tenant.unit_id,
      status: 'open',
      photo_url: photoUrl,
    })

    setSaving(false)
    setShowAdd(false)
    setForm({ title: '', description: '', priority: 'medium' })
    removePhoto()

    const { data } = await supabase
      .from('maintenance_requests').select('*')
      .eq('unit_id', tenant.unit_id).order('created_at', { ascending: false })
    setRequests(data ?? [])
  }

  if (loading || !tenant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <PortalShell tenantName={tenant.name}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-400 mt-0.5">Unit {tenant.units?.unit_number} · {tenant.units?.properties?.name}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus size={15} /> New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wrench size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No maintenance requests</p>
          <p className="text-sm mt-1">Submit a request if something needs attention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => {
            const StatusIcon = STATUS_ICONS[r.status] ?? Clock
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {r.photo_url && (
                  <img src={r.photo_url} alt="maintenance" className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PRIORITY_COLORS[r.priority]}`}>
                      {r.priority}
                    </span>
                  </div>
                  {r.description && <p className="text-sm text-gray-500 mb-3">{r.description}</p>}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <StatusIcon size={13} className={
                        r.status === 'completed' ? 'text-green-500' :
                        r.status === 'in_progress' ? 'text-blue-500' :
                        'text-yellow-500'
                      } />
                      {r.status === 'in_progress' ? 'In Progress' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </div>
                    <p className="text-xs text-gray-400">{format(new Date(r.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New request modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">New Maintenance Request</h2>
              <button onClick={() => { setShowAdd(false); removePhoto() }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What needs fixing?</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Leaking faucet in bathroom"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low — not urgent</option>
                  <option value="medium">Medium — needs attention soon</option>
                  <option value="high">High — affecting daily life</option>
                  <option value="urgent">Urgent — safety issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details (optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the issue..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    <img src={photoPreview} alt="preview" className="w-full h-40 object-cover" />
                    <button
                      onClick={removePhoto}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  >
                    <ImageIcon size={24} />
                    <span className="text-sm">Tap to add a photo</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={pickPhoto}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAdd(false); removePhoto() }}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving || !form.title}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> :
                 saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  )
}
