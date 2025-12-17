'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { FileText, Scale, Shield } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import MotionForm from './components/MotionForm'
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

  const handleMotionGenerated = (motion: string, motionType: string) => {
    setGeneratedMotion(motion)
    setCurrentMotionType(motionType)
    setShowForm(false)
  }

  const handleNewMotion = () => {
    setGeneratedMotion('')
    setCurrentMotionType('')
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Hero Card */}
        <div className="glass-card p-8 rounded-2xl shadow-2xl border border-white/20">
          <div className="flex items-center space-x-3 mb-4">
            <Scale className="w-8 h-8 text-purple-600" />
            <h2 className="text-3xl font-bold text-gray-900">Law & Motion Generator</h2>
          </div>
          <p className="text-gray-700 text-lg">
            Generate professional California motion papers with AI assistance and integrated case law research from CourtListener.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-xl inline-flex border border-purple-700 shadow-md">
              <Shield className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Secure & Confidential</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl inline-flex border border-blue-200">
              <FileText className="w-5 h-5" />
              <span className="font-medium">California Case Law</span>
            </div>
          </div>
        </div>

        {/* Motion Types Quick Reference - Show only when form is visible */}
        {showForm && (
          <div className="glass-card p-6 rounded-2xl border border-purple-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Available Motion Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-700">Motion to Compel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-700">Demurrer</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-700">Summary Judgment</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-gray-700">Motion in Limine</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-gray-700">Motion to Strike</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <span className="text-gray-700">Protective Order</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <span className="text-gray-700">Motion for Sanctions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                <span className="text-gray-700">Ex Parte Application</span>
              </div>
            </div>
          </div>
        )}

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
          />
        )}
      </div>

      <Footer />
    </div>
  )
}
