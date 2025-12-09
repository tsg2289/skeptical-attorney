'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import BillingGenerator from './BillingGenerator'
import { userStorage } from '@/lib/utils/userStorage'
import { caseStorage, Case } from '@/lib/utils/caseStorage'

export default function BillingComparison() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="p-6 text-gray-600">Loading billing comparison...</div>
          <Footer />
        </div>
      }
    >
      <BillingComparisonContent />
    </Suspense>
  )
}

function BillingComparisonContent() {
  const searchParams = useSearchParams()
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null)
  const [currentCase, setCurrentCase] = useState<Case | null>(null)

  useEffect(() => {
    const caseId = searchParams?.get('caseId')
    if (caseId) {
      const currentUser = userStorage.getCurrentUser()
      if (currentUser) {
        // CRITICAL: Only retrieve the specific case by ID to prevent cross-contamination
        const foundCase = caseStorage.getCase(currentUser.username, caseId)
        if (foundCase) {
          setCurrentCaseId(caseId)
          setCurrentCase(foundCase)
          // Log for audit trail
          console.log(`[AUDIT] Billing Generator page accessed for case: ${caseId}`)
        }
      }
    }
  }, [searchParams])
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Case Name Header - Only show when accessed from case dashboard */}
      {currentCase && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link 
                  href={`/dashboard/cases/${currentCase.id}`}
                  className="hover:opacity-80 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <div>
                  <h2 className="text-xl font-bold">{currentCase.caseName}</h2>
                  {currentCase.caseNumber && (
                    <p className="text-sm text-blue-100">Case #: {currentCase.caseNumber}</p>
                  )}
                </div>
              </div>
              <Link
                href={`/dashboard/cases/${currentCase.id}`}
                className="text-sm hover:underline text-blue-100"
              >
                Back to Case
              </Link>
            </div>
          </div>
        </div>
      )}
      
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
          <BillingGenerator caseId={currentCaseId} />
        </div>
      </section>

      <Footer />
    </div>
  )
}