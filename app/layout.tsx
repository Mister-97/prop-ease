import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import MorningReport from '@/components/MorningReport'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PropEase — Property Management',
  description: 'Manage your properties with ease',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} bg-gray-50 text-gray-900 h-full`}>
        <div className="flex h-full overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
            {children}
          </main>
        </div>
        <MorningReport />
      </body>
    </html>
  )
}
