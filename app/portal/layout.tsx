import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import '../globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PropEase — Tenant Portal',
  description: 'Your tenant portal',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} bg-gray-50 text-gray-900 h-full`}>
        {children}
      </body>
    </html>
  )
}
