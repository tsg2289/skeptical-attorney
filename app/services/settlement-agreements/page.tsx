'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AgreementForm from './components/AgreementForm'

export default function SettlementAgreementsPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Settlement Agreements</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed">
              Draft comprehensive settlement agreements with built-in clause libraries.
            </p>
          </div>
        </div>
      </section>

      {/* Settlement Agreement Application */}
      <section className="py-12 bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AgreementForm />
        </div>
      </section>

      <Footer />
    </div>
  )
}

