'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Wrench, Users, DollarSign,
  HardHat, ChevronRight, Sparkles, FolderOpen
} from 'lucide-react'
import Image from 'next/image'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/properties',  label: 'Properties',   icon: Building2 },
  { href: '/maintenance', label: 'Maintenance',  icon: Wrench },
  { href: '/tenants',     label: 'Tenants',      icon: Users },
  { href: '/expenses',    label: 'Expenses',     icon: DollarSign },
  { href: '/vendors',     label: 'Vendors',      icon: HardHat },
  { href: '/documents',   label: 'Documents',    icon: FolderOpen },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <Image src="/logo.png" alt="PropEase" width={80} height={80} className="rounded-lg object-contain" />
          <span className="font-bold text-lg text-gray-900 -ml-2">PropEase</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto text-blue-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Personal Assistant */}
      <div className="px-3 pb-4">
        <Link
          href="/assistant"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            path === '/assistant'
              ? 'bg-violet-100 text-violet-700'
              : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
          }`}
        >
          <Sparkles size={17} className="text-violet-500" />
          Personal Assistant
          {path === '/assistant' && <ChevronRight size={14} className="ml-auto text-violet-400" />}
        </Link>
      </div>
    </aside>
  )
}
