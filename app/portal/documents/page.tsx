'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPortalTenant } from '@/lib/portal'
import PortalShell from '@/components/PortalShell'
import { FileText, ImageIcon, File, Download, FolderOpen } from 'lucide-react'
import { format } from 'date-fns'

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

export default function PortalDocuments() {
  const [tenant, setTenant] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const t = await getPortalTenant()
      if (!t) { router.replace('/portal/login'); return }
      setTenant(t)
      const { data } = await supabase
        .from('documents')
        .select('*')
        .or(`tenant_id.eq.${t.id},property_id.eq.${t.property_id}`)
        .order('created_at', { ascending: false })
      setDocs(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function download(doc: any) {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (loading || !tenant) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <PortalShell tenantName={tenant.name}>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your lease and property documents</p>
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm mt-1">Your landlord will share documents here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-3">
              <div className="shrink-0">{fileIcon(doc.file_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{doc.category}</span>
                  {doc.file_size && <span className="text-xs text-gray-400">{formatSize(doc.file_size)}</span>}
                  <span className="text-xs text-gray-400">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <button onClick={() => download(doc)} className="text-gray-400 hover:text-blue-600 shrink-0">
                <Download size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
    </PortalShell>
  )
}
