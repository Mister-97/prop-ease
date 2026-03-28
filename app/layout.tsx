import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import AppShell from './AppShell'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PropEase — Property Management',
  description: 'Manage your properties with ease',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} bg-gray-50 text-gray-900 h-full`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
