'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Shield } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import ComplaintForm from './components/ComplaintForm'
import ComplaintOutput from './components/ComplaintOutput'
import { supabaseCaseStorage, CaseFrontend, ComplaintSection } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { useTrialMode } from '@/lib/contexts/TrialModeContext'

export default function ComplaintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="p-6 text-gray-600">Loading complaint generator...</div>
          <Footer />
        </div>
      }
    >
      <ComplaintPageContent />
    </Suspense>
  )
}

function ComplaintPageContent() {
  const searchParams = useSearchParams()
  const { isTrialMode, trialCaseId, loadFromTrial, saveToTrial, isTrialCaseId, canAccessDatabase } = useTrialMode()
  
  const [generatedComplaint, setGeneratedComplaint] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  
  // Trial mode state
  const [trialSections, setTrialSections] = useState<ComplaintSection[]>([])

  // Load case data if accessed from a case OR load trial data
  useEffect(() => {
    const loadData = async () => {
      const caseId = searchParams?.get('caseId')
      
      // SECURITY: If caseId is provided in trial mode, verify it's a trial ID
      if (caseId && isTrialMode) {
        // SECURITY CHECK: Block any attempt to access real case IDs in trial mode
        if (!isTrialCaseId(caseId)) {
          console.warn('[SECURITY] Attempted to access real case ID in trial mode - blocked')
          // Continue in trial mode without the case ID
        }
      }
      
      if (caseId && !isTrialMode && canAccessDatabase()) {
        // Authenticated flow - load from database
        // SECURITY: This only runs when user is authenticated
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Row Level Security in Supabase ensures user can only access their own cases
          const foundCase = await supabaseCaseStorage.getCase(caseId)
          if (foundCase) {
            setCurrentCase(foundCase)
            console.log(`[AUDIT] Complaint page accessed for case: ${caseId}`)
          }
        }
      } else if (isTrialMode) {
        // Trial mode - load from session storage ONLY
        // SECURITY: Never touches the database
        const savedSections = loadFromTrial<ComplaintSection[]>('complaint-sections', [])
        const savedComplaint = loadFromTrial<string>('complaint-text', '')
        
        if (savedSections.length > 0) {
          setTrialSections(savedSections)
        }
        if (savedComplaint) {
          setGeneratedComplaint(savedComplaint)
        }
        
        // Create a mock case for trial mode - NO REAL DATA
        setCurrentCase({
          id: trialCaseId, // This is 'trial-demo-case', not a real UUID
          caseName: 'Trial Mode Case',
          caseNumber: 'TRIAL-00000',
          facts: '',
          plaintiffs: [],
          defendants: [],
          courtCounty: 'Los Angeles',
          deadlines: [],
          createdAt: new Date().toISOString(),
          userId: 'trial-user',
        })
      }
    }
    
    loadData()
  }, [searchParams, isTrialMode, trialCaseId, loadFromTrial, isTrialCaseId, canAccessDatabase])

  const handleComplaintGenerated = (complaint: string) => {
    setGeneratedComplaint(complaint)
    setShowForm(false)
    
    // Auto-save to trial storage
    if (isTrialMode) {
      saveToTrial('complaint-text', complaint)
    }
  }

  const handleNewComplaint = () => {
    setGeneratedComplaint('')
    setShowForm(true)
    setTrialSections([])
    
    // Clear trial storage
    if (isTrialMode) {
      saveToTrial('complaint-text', '')
      saveToTrial('complaint-sections', [])
    }
  }
  
  // Handler for saving sections from ComplaintOutput (trial mode)
  const handleTrialSectionsChange = (sections: ComplaintSection[]) => {
    if (isTrialMode) {
      setTrialSections(sections)
      saveToTrial('complaint-sections', sections)
    }
  }

  // Determine if we should show saved sections
  const hasSavedSections = isTrialMode 
    ? trialSections.length > 0 
    : (currentCase?.complaintSections && currentCase.complaintSections.length > 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      <TrialModeBanner />
      
      {/* Case Name Header - Only show when accessed from case dashboard (not trial mode) */}
      {currentCase && !isTrialMode && searchParams?.get('caseId') && (
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        <div className="glass p-6 rounded-2xl mb-8">
          <div className="flex items-center space-x-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Legal Complaint Generator</h2>
          </div>
        </div>

        {/* Show form if: showForm is true, OR (NO generated complaint AND NO saved sections) */}
        {(showForm || (!generatedComplaint && !hasSavedSections)) && (
          <ComplaintForm
            onComplaintGenerated={handleComplaintGenerated}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            initialSummary={isTrialMode ? '' : currentCase?.facts}
            initialPlaintiff={isTrialMode ? '' : currentCase?.client}
            initialCaseNumber={isTrialMode ? '' : currentCase?.caseNumber}
            fromCaseDashboard={!isTrialMode && !!searchParams?.get('caseId')}
            initialCounty={isTrialMode ? '' : currentCase?.courtCounty}
            initialPlaintiffs={isTrialMode ? [] : currentCase?.plaintiffs}
            initialDefendants={isTrialMode ? [] : currentCase?.defendants}
          />
        )}

        {/* Show output if: NOT showForm AND (generated complaint OR saved sections exist) */}
        {!showForm && (generatedComplaint || hasSavedSections) && (
          <ComplaintOutput
            complaint={generatedComplaint}
            onNewComplaint={handleNewComplaint}
            caseData={currentCase}
            isTrialMode={isTrialMode}
            trialSections={trialSections}
            onTrialSectionsChange={handleTrialSectionsChange}
          />
        )}
      </div>

      <Footer />
    </div>
  )
}
