'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { useTrialMode } from '@/lib/contexts/TrialModeContext'

export default function PropoundDiscoveryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="p-6 text-gray-600">Loading propound discovery...</div>
          <Footer />
        </div>
      }
    >
      <PropoundDiscoveryPageContent />
    </Suspense>
  )
}

function PropoundDiscoveryPageContent() {
  const searchParams = useSearchParams()
  const { isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId } = useTrialMode()
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null)
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)

  useEffect(() => {
    const loadCase = async () => {
      const caseId = searchParams?.get('caseId')
      
      // SECURITY: Block real case IDs in trial mode
      if (caseId && isTrialMode && !isTrialCaseId(caseId)) {
        console.warn('[SECURITY] Attempted to access real case ID in trial mode - blocked')
        return
      }
      
      if (caseId && !isTrialMode && canAccessDatabase()) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const foundCase = await supabaseCaseStorage.getCase(caseId)
          if (foundCase) {
            setCurrentCaseId(caseId)
            setCurrentCase(foundCase)
            console.log(`[AUDIT] Propound Discovery page accessed for case: ${caseId}`)
          }
        }
      } else if (isTrialMode) {
        setCurrentCaseId(trialCaseId)
      }
    }
    
    loadCase()
  }, [searchParams, isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <TrialModeBanner />
      
      {/* Case Name Header - Only show when accessed from case dashboard (not trial mode) */}
      {currentCase && !isTrialMode && (
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
              <span className="gradient-text">Propound Discovery</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              Create and serve discovery requests with proper formatting and legal citations automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12">
              <div className="text-6xl mb-6">🚧</div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Coming Soon
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                We&apos;re working hard to bring you the Propound Discovery tool. Check back soon!
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
