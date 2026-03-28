'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Home, Wrench, FileText, MessageSquare, LogOut } from 'lucide-react'
import Image from 'next/image'

const nav = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/portal/documents', label: 'Documents', icon: FileText },
  { href: '/portal/messages', label: 'Messages', icon: MessageSquare },
]

export default function PortalShell({ children, tenantName }: { children: React.ReactNode; tenantName: string }) {
  const path = usePathname()
  const router = useRouter()

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="PropEase" width={32} height={32} className="rounded-lg object-contain" />
            <span className="font-bold text-gray-900 text-sm">PropEase</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{tenantName}</span>
            <button onClick={signOut} className="text-gray-400 hover:text-gray-700 flex items-center gap-1 text-xs">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
        {/* Bottom nav tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon size={15} /> {label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  )
}
