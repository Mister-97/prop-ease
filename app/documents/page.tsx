'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Upload, Trash2, Download, Plus, X, ImageIcon, File } from 'lucide-react'
import { format } from 'date-fns'

const CATEGORIES = ['lease', 'receipt', 'inspection', 'insurance', 'permit', 'photo', 'contract', 'other']

function fileIcon(type: string) {
  if (type?.startsWith('image/')) return <ImageIcon size={18} className="text-blue-500" />
  if (type === 'application/pdf') return <FileText size={18} className="text-red-500" />
  return <File size={18} className="text-gray-400" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterProp, setFilterProp] = useState('')
  const [form, setForm] = useState({ property_id: '', tenant_id: '', category: 'other', notes: '' })
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  async function load() {
    const [d, p, t] = await Promise.all([
      supabase.from('documents').select('*, properties(name), tenants(name)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name'),
      supabase.from('tenants').select('id, name, property_id'),
    ])
    setDocs(d.data ?? [])
    setProperties(p.data ?? [])
    setTenants(t.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function upload() {
    if (!file) return
    setUploading(true)
    const path = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file)
    if (uploadErr) { alert(uploadErr.message); setUploading(false); return }
    await supabase.from('documents').insert({
      property_id: form.property_id || null,
      tenant_id: form.tenant_id || null,
      category: form.category,
      notes: form.notes || null,
      name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
    })
    setUploading(false)
    setShowUpload(false)
    setFile(null)
    setForm({ property_id: '', tenant_id: '', category: 'other', notes: '' })
    load()
  }

  async function deleteDoc(doc: any) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    await supabase.storage.from('documents').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    load()
  }

  async function download(doc: any) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); setShowUpload(true) }
  }

  const filtered = filterProp ? docs.filter(d => d.property_id === filterProp) : docs
  const filteredTenants = form.property_id ? tenants.filter(t => t.property_id === form.property_id) : tenants

  return (
    <div className="p-4 lg:p-8" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500 mt-1">{docs.length} files stored</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          <select
            value={filterProp}
            onChange={e => setFilterProp(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 lg:px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-600 max-w-[120px] lg:max-w-none"
          >
            <option value="">All properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Upload size={15} /> Upload
          </button>
        </div>
      </div>

      {/* Drag zone hint */}
      <div className="mb-5 border-2 border-dashed border-gray-200 rounded-xl py-4 text-center text-sm text-gray-400">
        Drag and drop any file here to upload
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText size={44} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm mt-1">Upload leases, receipts, inspection reports, photos</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {fileIcon(doc.file_type)}
                    <span className="text-sm font-medium text-gray-900 truncate">{doc.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => download(doc)} className="text-gray-400 hover:text-blue-600"><Download size={15} /></button>
                    <button onClick={() => deleteDoc(doc)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{doc.category}</span>
                  {doc.properties?.name && <span className="text-xs text-gray-400">{doc.properties.name}</span>}
                  {doc.file_size && <span className="text-xs text-gray-400">{formatSize(doc.file_size)}</span>}
                  <span className="text-xs text-gray-400">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['File', 'Property', 'Tenant', 'Category', 'Size', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {fileIcon(doc.file_type)}
                        <span className="text-sm font-medium text-gray-900 max-w-[180px] truncate">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{doc.properties?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500">{doc.tenants?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{doc.category}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-400">{doc.file_size ? formatSize(doc.file_size) : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-400">{format(new Date(doc.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => download(doc)} className="text-gray-400 hover:text-blue-600"><Download size={15} /></button>
                        <button onClick={() => deleteDoc(doc)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
              <button onClick={() => { setShowUpload(false); setFile(null) }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {/* File picker */}
              {!file ? (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Click to select a file</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, images, spreadsheets, etc.</p>
                  <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                  {fileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                  </div>
                  <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-400"><X size={15} /></button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value, tenant_id: '' }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">None</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {form.property_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant (optional)</label>
                  <select value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">None</option>
                    {filteredTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowUpload(false); setFile(null) }} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={upload} disabled={!file || uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
