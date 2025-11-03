'use client'

import React from "react"
import { AuthProvider } from './contexts/AuthContext'
import { DevDataProvider } from './contexts/DevDataContext'
import Providers from './providers'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function DepositionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Providers>
        <AuthProvider>
          <DevDataProvider>
            {children}
          </DevDataProvider>
        </AuthProvider>
      </Providers>
      <Footer />
    </div>
  )
}

