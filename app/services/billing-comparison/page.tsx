'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BillingGenerator from './BillingGenerator'

export default function BillingComparison() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Legal Billing</span> Generator
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              AI-powered billing entry generation with professional formatting and organization tools.
            </p>
          </div>
        </div>
      </section>

      {/* Billing Generator App */}
      <section className="py-12 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BillingGenerator />
        </div>
      </section>

      <Footer />
    </div>
  )
}