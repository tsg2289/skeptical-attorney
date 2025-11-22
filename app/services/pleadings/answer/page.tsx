'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AnswerGenerator from './components/AnswerGenerator'
import { Toaster } from 'react-hot-toast'

export default function AnswerPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Answer</span> Generator
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed">
              Create court-ready answers with proper formatting and legal citations automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Answer Generator App */}
      <section className="py-12 bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnswerGenerator />
        </div>
      </section>

      <Footer />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e3a8a',
            border: '1px solid #2563eb',
          },
        }}
      />
    </div>
  )
}


