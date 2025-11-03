import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import type { ReactNode } from 'react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Skeptical Attorney - Legal Practice Automation',
  description: 'Professional legal automation services for attorneys. Streamline your practice with automated demand letters, pleadings, discovery, law and motion, and settlement agreements.',
  keywords: 'legal automation, attorney services, demand letters, pleadings, discovery, law and motion, settlement agreements',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
