import 'bootstrap/dist/css/bootstrap.min.css'
import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import ClientBootstrap from '@/components/ClientBootstrap'

export const metadata: Metadata = {
  title: 'Form Factory',
  description: 'Create and manage dynamic forms easily',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientBootstrap />
        <Navbar />
        {children}
      </body>
    </html>
  )
}
