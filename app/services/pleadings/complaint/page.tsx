'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, Shield } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ComplaintForm from './components/ComplaintForm'
import ComplaintOutput from './components/ComplaintOutput'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'

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
  const [generatedComplaint, setGeneratedComplaint] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false) // Force show form to start fresh

  // Load case data if accessed from a case
  useEffect(() => {
    const loadCase = async () => {
      const caseId = searchParams?.get('caseId')
      if (caseId) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const foundCase = await supabaseCaseStorage.getCase(caseId)
          if (foundCase) {
            setCurrentCase(foundCase)
            console.log(`[AUDIT] Complaint page accessed for case: ${caseId}`)
          }
        }
      }
    }
    
    loadCase()
  }, [searchParams])

  const handleComplaintGenerated = (complaint: string) => {
    setGeneratedComplaint(complaint)
    setShowForm(false) // Hide form, show output
  }

  const handleNewComplaint = () => {
    setGeneratedComplaint('')
    setShowForm(true) // Force show form to start fresh
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="glass-card p-8 rounded-2xl shadow-2xl border border-white/20">
          <div className="flex items-center space-x-3 mb-4">
            <FileText className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Professional Legal Complaint Generator</h2>
          </div>
          <p className="text-gray-700 text-lg">
            Create comprehensive California Superior Court complaints with AI assistance. Secure, professional, and efficient legal document generation.
          </p>
          <div className="mt-6 flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-xl inline-flex border border-blue-700 shadow-md">
            <Shield className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Secure & Confidential</span>
          </div>
        </div>

        {/* Show form if: showForm is true, OR (NO generated complaint AND NO saved sections) */}
        {(showForm || (!generatedComplaint && !(currentCase?.complaintSections && currentCase.complaintSections.length > 0))) && (
          <ComplaintForm
            onComplaintGenerated={handleComplaintGenerated}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            initialSummary={currentCase?.facts}
            initialPlaintiff={currentCase?.client}
            initialCaseNumber={currentCase?.caseNumber}
            // When from case dashboard, hide top sections (attorney, county, parties, case number)
            fromCaseDashboard={!!currentCase}
            initialCounty={currentCase?.courtCounty}
            initialPlaintiffs={currentCase?.plaintiffs}
            initialDefendants={currentCase?.defendants}
          />
        )}

        {/* Show output if: NOT showForm AND (generated complaint OR saved sections exist) */}
        {!showForm && (generatedComplaint || (currentCase?.complaintSections && currentCase.complaintSections.length > 0)) && (
          <ComplaintOutput
            complaint={generatedComplaint}
            onNewComplaint={handleNewComplaint}
            caseData={currentCase}
          />
        )}
      </div>

      <Footer />
    </div>
  )
}


