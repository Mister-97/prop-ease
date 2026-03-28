'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Wrench, Users, DollarSign,
  HardHat, ChevronRight, Sparkles, FolderOpen, Menu, X, CircleDollarSign, MessageSquare,
  ClipboardList, BarChart3
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

const nav = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/properties',  label: 'Properties',   icon: Building2 },
  { href: '/rent',        label: 'Rent',         icon: CircleDollarSign },
  { href: '/maintenance', label: 'Maintenance',  icon: Wrench },
  { href: '/tenants',     label: 'Tenants',      icon: Users },
  { href: '/expenses',    label: 'Expenses',     icon: DollarSign },
  { href: '/vendors',     label: 'Vendors',      icon: HardHat },
  { href: '/documents',   label: 'Documents',    icon: FolderOpen },
  { href: '/messages',    label: 'Messages',     icon: MessageSquare },
  { href: '/listings',    label: 'Listings',     icon: ClipboardList },
  { href: '/reports',     label: 'Reports',      icon: BarChart3 },
]

function NavLinks({ path, onNav }: { path: string; onNav?: () => void }) {
  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onNav}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group ${
                active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} className={active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto text-blue-400" />}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 pb-4 space-y-2">
        <Link
          href="/assistant"
          onClick={onNav}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            path === '/assistant' ? 'bg-violet-100 text-violet-700' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
          }`}
        >
          <Sparkles size={17} className="text-violet-500" />
          Personal Assistant
          {path === '/assistant' && <ChevronRight size={14} className="ml-auto text-violet-400" />}
        </Link>
        <a
          href="/portal"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNav}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        >
          <Users size={17} className="text-blue-500" />
          Tenant Portal ↗
        </a>
      </div>
    </>
  )
}

export default function Sidebar() {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  const logo = (
    <div className="flex items-center gap-1">
      <Image src="/logo.png" alt="PropEase" width={80} height={80} className="rounded-lg object-contain" />
      <span className="font-bold text-lg text-gray-900 -ml-2">PropEase</span>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col h-full shrink-0">
        <div className="px-6 py-5 border-b border-gray-100">{logo}</div>
        <NavLinks path={path} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        {logo}
        <button onClick={() => setOpen(true)} className="text-gray-600 p-1">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-64 bg-white flex flex-col h-full shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              {logo}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <NavLinks path={path} onNav={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  )
}
