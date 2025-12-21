'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import MotionForm, { MotionFormData } from './components/MotionForm'
import MotionOutput from './components/MotionOutput'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { useTrialMode } from '@/lib/contexts/TrialModeContext'

export default function LawAndMotionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="p-6 text-gray-600">Loading law and motion...</div>
          <Footer />
        </div>
      }
    >
      <LawAndMotionPageContent />
    </Suspense>
  )
}

function LawAndMotionPageContent() {
  const searchParams = useSearchParams()
  const { isTrialMode, trialCaseId, saveToTrial, loadFromTrial, canAccessDatabase, isTrialCaseId } = useTrialMode()
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null)
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [generatedMotion, setGeneratedMotion] = useState<string>('')
  const [currentMotionType, setCurrentMotionType] = useState<string>('')
  const [currentMotionFormData, setCurrentMotionFormData] = useState<MotionFormData | undefined>(undefined)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [showForm, setShowForm] = useState<boolean>(true)

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
            console.log(`[AUDIT] Law and Motion page accessed for case: ${caseId}`)
          }
        }
      } else if (isTrialMode) {
        // Load from session storage in trial mode
        const savedMotion = loadFromTrial('motion-content', '')
        const savedMotionType = loadFromTrial('motion-type', '')
        if (savedMotion) {
          setGeneratedMotion(savedMotion)
          setCurrentMotionType(savedMotionType)
          setShowForm(false)
        }
      }
    }
    
    loadCase()
  }, [searchParams, isTrialMode, canAccessDatabase, isTrialCaseId, loadFromTrial])

  // Auto-save to session storage in trial mode
  useEffect(() => {
    if (isTrialMode && generatedMotion) {
      saveToTrial('motion-content', generatedMotion)
      saveToTrial('motion-type', currentMotionType)
    }
  }, [generatedMotion, currentMotionType, isTrialMode, saveToTrial])

  const handleMotionGenerated = (motion: string, motionType: string, motionFormData?: MotionFormData) => {
    setGeneratedMotion(motion)
    setCurrentMotionType(motionType)
    setCurrentMotionFormData(motionFormData)
    setShowForm(false)
  }

  const handleNewMotion = () => {
    setGeneratedMotion('')
    setCurrentMotionType('')
    setCurrentMotionFormData(undefined)
    setShowForm(true)
    if (isTrialMode) {
      saveToTrial('motion-content', '')
      saveToTrial('motion-type', '')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <TrialModeBanner />
      
      {/* Case Name Header - Only show when accessed from case dashboard (not trial mode) */}
      {currentCase && !isTrialMode && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-4 shadow-md">
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
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Law & Motion</span> <span className="text-gray-900">Generator</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed">
              Generate professional California motion papers with AI assistance and integrated case law research.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Form or Output */}
        {showForm ? (
          <MotionForm
            onMotionGenerated={handleMotionGenerated}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            caseData={currentCase}
            fromCaseDashboard={!!currentCase && !isTrialMode}
            isTrialMode={isTrialMode}
          />
        ) : (
          <MotionOutput
            motion={generatedMotion}
            motionType={currentMotionType}
            onNewMotion={handleNewMotion}
            caseData={currentCase}
            isTrialMode={isTrialMode}
            motionFormData={currentMotionFormData}
          />
        )}
      </div>

      <Footer />
    </div>
  )
}
