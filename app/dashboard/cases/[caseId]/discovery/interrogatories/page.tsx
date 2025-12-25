'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import InterrogatoriesCanvas from './components/InterrogatoriesCanvas'

export default function InterrogatoriesPage() {
  const params = useParams()
  const caseId = params?.caseId as string
  
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCase = async () => {
      if (!caseId) return
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // CRITICAL: Only retrieve the specific case by ID (RLS enforced)
        const foundCase = await supabaseCaseStorage.getCase(caseId)
        if (foundCase) {
          setCurrentCase(foundCase)
          console.log(`[AUDIT] Interrogatories accessed for case: ${caseId}`)
        }
      }
      setLoading(false)
    }
    
    loadCase()
  }, [caseId])

  // Handle case updates (when saving)
  const handleCaseUpdate = (updatedCase: CaseFrontend) => {
    setCurrentCase(updatedCase)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!currentCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Case Not Found</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      
      {/* Case Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link 
                href={`/dashboard/cases/${currentCase.id}/discovery`}
                className="hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h2 className="text-xl font-bold">{currentCase.caseName}</h2>
                <p className="text-sm text-blue-100">Case #: {currentCase.caseNumber} • Special Interrogatories</p>
              </div>
            </div>
            <Link
              href={`/dashboard/cases/${currentCase.id}/discovery`}
              className="text-sm hover:underline text-blue-100"
            >
              Back to Discovery
            </Link>
          </div>
        </div>
      </div>

      {/* Main Builder */}
      <InterrogatoriesCanvas 
        caseData={currentCase} 
        onCaseUpdate={handleCaseUpdate}
      />

      <Footer />
    </div>
  )
}















