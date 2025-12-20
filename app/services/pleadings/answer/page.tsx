'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import AnswerGenerator from './components/AnswerGenerator'
import { Toaster } from 'react-hot-toast'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { useTrialMode } from '@/lib/contexts/TrialModeContext'

export default function AnswerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="p-6 text-gray-600">Loading answer generator...</div>
          <Footer />
        </div>
      }
    >
      <AnswerPageContent />
    </Suspense>
  )
}

function AnswerPageContent() {
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
          // CRITICAL: Only retrieve the specific case by ID
          // Row Level Security ensures user can only access their own cases
          const foundCase = await supabaseCaseStorage.getCase(caseId)
          if (foundCase) {
            setCurrentCaseId(caseId)
            setCurrentCase(foundCase)
            // Log for audit trail
            console.log(`[AUDIT] Answer page accessed for case: ${caseId}`)
          }
        }
      } else if (isTrialMode) {
        // Set trial case ID for trial mode
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
              <span className="gradient-text">Answer</span> <span className="text-gray-900">Generator</span>
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
          <AnswerGenerator caseId={currentCaseId} isTrialMode={isTrialMode} />
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
