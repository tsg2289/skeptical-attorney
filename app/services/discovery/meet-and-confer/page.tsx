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
import { Edit2 } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function MeetAndConferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <Header />
          <div className="p-6 text-gray-600">Loading meet and confer...</div>
          <Footer />
        </div>
      }
    >
      <MeetAndConferPageContent />
    </Suspense>
  )
}

function MeetAndConferPageContent() {
  const searchParams = useSearchParams()
  const { isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId, loadFromTrial, saveToTrial } = useTrialMode()
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null)
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)

  // Trial mode case editing state
  const [isEditingTrialCase, setIsEditingTrialCase] = useState(false)
  const [trialCaseForm, setTrialCaseForm] = useState({
    caseName: '',
    caseNumber: '',
    court: '',
    plaintiffName: '',
    defendantName: '',
  })

  useEffect(() => {
    const loadCase = async () => {
      const caseId = searchParams?.get('caseId')
      
      // SECURITY: Block real case IDs in trial mode
      if (caseId && isTrialMode && !isTrialCaseId(caseId)) {
        console.warn('[SECURITY] Attempted to access real case ID in trial mode - blocked')
        setLoading(false)
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
            console.log(`[AUDIT] Meet and Confer page accessed for case: ${caseId}`)
          }
        }
      } else if (isTrialMode) {
        setCurrentCaseId(trialCaseId)
        
        // Load saved trial case data from session storage
        const savedTrialCase = loadFromTrial<CaseFrontend | null>('trial-case-data', null)
        if (savedTrialCase) {
          setCurrentCase(savedTrialCase)
        }
      }
      
      setLoading(false)
    }
    
    loadCase()
  }, [searchParams, isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId, loadFromTrial])

  // Save trial case data to session storage
  const handleSaveTrialCase = () => {
    if (!trialCaseForm.caseName.trim()) {
      toast.error('Please enter a case name')
      return
    }
    
    const newCase: CaseFrontend = {
      id: trialCaseId,
      caseName: trialCaseForm.caseName.trim(),
      caseNumber: trialCaseForm.caseNumber.trim() || undefined,
      court: trialCaseForm.court.trim() || undefined,
      plaintiffs: trialCaseForm.plaintiffName.trim() 
        ? [{ id: 'trial-p-1', name: trialCaseForm.plaintiffName.trim(), type: 'individual' as const }] 
        : [],
      defendants: trialCaseForm.defendantName.trim() 
        ? [{ id: 'trial-d-1', name: trialCaseForm.defendantName.trim(), type: 'individual' as const }] 
        : [],
      deadlines: [],
      createdAt: new Date().toISOString(),
      userId: 'trial-user',
    }
    
    saveToTrial('trial-case-data', newCase)
    setCurrentCase(newCase)
    setIsEditingTrialCase(false)
    toast.success('Case information saved!')
  }

  // Start editing trial case
  const handleEditTrialCase = () => {
    if (currentCase) {
      setTrialCaseForm({
        caseName: currentCase.caseName || '',
        caseNumber: currentCase.caseNumber || '',
        court: currentCase.court || '',
        plaintiffName: currentCase.plaintiffs?.[0]?.name || '',
        defendantName: currentCase.defendants?.[0]?.name || '',
      })
    }
    setIsEditingTrialCase(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="p-6 text-gray-600">Loading meet and confer...</div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <TrialModeBanner />
      <Toaster position="top-right" />
      
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

      {/* Trial Mode Case Header */}
      {currentCase && isTrialMode && !isEditingTrialCase && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{currentCase.caseName}</h2>
                {currentCase.caseNumber && (
                  <p className="text-sm text-amber-100">Case #: {currentCase.caseNumber}</p>
                )}
              </div>
              <button
                onClick={handleEditTrialCase}
                className="text-sm flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Edit Case
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 leading-tight">
              <span className="gradient-text">Meet and Confer</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed">
              Generate meet and confer letters and documentation with proper formatting automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Trial Mode Case Input Form */}
      {isTrialMode && (!currentCase || isEditingTrialCase) ? (
        <section className="py-12">
          <div className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📋</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {isEditingTrialCase ? 'Edit Case Information' : 'Enter Your Case Information'}
                </h2>
                <p className="text-gray-600">
                  Your data is saved in your browser only and will be cleared when you close the browser.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Name *</label>
                  <input
                    type="text"
                    value={trialCaseForm.caseName}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, caseName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Smith v. ABC Corporation"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                  <input
                    type="text"
                    value={trialCaseForm.caseNumber}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, caseNumber: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., 24STCV12345"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Court/County</label>
                  <input
                    type="text"
                    value={trialCaseForm.court}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, court: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., Los Angeles"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plaintiff Name</label>
                  <input
                    type="text"
                    value={trialCaseForm.plaintiffName}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, plaintiffName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., John Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Defendant Name</label>
                  <input
                    type="text"
                    value={trialCaseForm.defendantName}
                    onChange={(e) => setTrialCaseForm(prev => ({ ...prev, defendantName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., ABC Corporation"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveTrialCase}
                    disabled={!trialCaseForm.caseName.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEditingTrialCase ? 'Save Changes' : 'Continue'}
                  </button>
                  {isEditingTrialCase && (
                    <button
                      onClick={() => setIsEditingTrialCase(false)}
                      className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 text-center mt-6">
                <Link href="/login" className="text-blue-600 hover:underline">Sign up</Link> to save your work permanently across sessions.
              </p>
            </div>
          </div>
        </section>
      ) : (
        /* Coming Soon Section */
        <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-12">
                <div className="text-6xl mb-6">🚧</div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Coming Soon
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  We&apos;re working hard to bring you the Meet and Confer tool. Check back soon!
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
