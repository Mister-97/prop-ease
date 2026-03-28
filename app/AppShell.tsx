'use client'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import MorningReport from '@/components/MorningReport'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  // Portal and public pages get no sidebar
  if (path.startsWith('/portal') || path.startsWith('/apply')) {
    return <>{children}</>
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-20 lg:pt-0">
        {children}
      </main>
      <MorningReport />
    </div>
  )
}
