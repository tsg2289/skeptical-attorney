'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit2 } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import TrialModeBanner from '@/components/TrialModeBanner'
import { supabaseCaseStorage, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { useTrialMode } from '@/lib/contexts/TrialModeContext'
import InterrogatoriesCanvas from './components/InterrogatoriesCanvas'
import toast, { Toaster } from 'react-hot-toast'

export default function InterrogatoriesPage() {
  const params = useParams()
  const caseId = params?.caseId as string
  const { isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId, loadFromTrial, saveToTrial } = useTrialMode()
  
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
      if (!caseId) {
        setLoading(false)
        return
      }
      
      // Check if this is a trial case ID when in trial mode
      if (isTrialMode) {
        if (!isTrialCaseId(caseId)) {
          console.warn('[SECURITY] Attempted to access real case ID in trial mode - blocked')
          setLoading(false)
          return
        }
        
        // Load from session storage for trial mode
        const savedTrialCase = loadFromTrial<CaseFrontend | null>('trial-case-data', null)
        if (savedTrialCase) {
          setCurrentCase(savedTrialCase)
        }
        setLoading(false)
        return
      }
      
      // Authenticated mode - load from database
      if (canAccessDatabase()) {
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
      }
      setLoading(false)
    }
    
    loadCase()
  }, [caseId, isTrialMode, canAccessDatabase, isTrialCaseId, loadFromTrial])

  // Save trial case data to session storage
  const handleSaveTrialCase = () => {
    if (!trialCaseForm.caseName.trim()) {
      toast.error('Please enter a case name')
      return
    }
    
    const newCase: CaseFrontend = {
      id: trialCaseId,
      caseName: trialCaseForm.caseName.trim(),
      caseNumber: trialCaseForm.caseNumber.trim() || '',
      court: trialCaseForm.court.trim() || undefined,
      plaintiffs: trialCaseForm.plaintiffName.trim() 
        ? [{ id: 'trial-p-1', name: trialCaseForm.plaintiffName.trim(), type: 'individual' as const, attorneys: [] }] 
        : [],
      defendants: trialCaseForm.defendantName.trim() 
        ? [{ id: 'trial-d-1', name: trialCaseForm.defendantName.trim(), type: 'individual' as const, attorneys: [] }] 
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

  // Handle case updates (when saving)
  const handleCaseUpdate = (updatedCase: CaseFrontend) => {
    setCurrentCase(updatedCase)
    // In trial mode, also save to session storage
    if (isTrialMode) {
      saveToTrial('trial-case-data', updatedCase)
    }
  }

  // Get the effective case ID for links
  const effectiveCaseId = isTrialMode ? trialCaseId : caseId

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header />
        <TrialModeBanner />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </div>
    )
  }

  // Trial mode - show case input form if no case data
  if (isTrialMode && (!currentCase || isEditingTrialCase)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header />
        <TrialModeBanner />
        <Toaster position="top-right" />
        
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
                    {isEditingTrialCase ? 'Save Changes' : 'Continue to Interrogatories'}
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
        
        <Footer />
      </div>
    )
  }

  if (!currentCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Header />
        <TrialModeBanner />
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
      <TrialModeBanner />
      <Toaster position="top-right" />
      
      {/* Case Header Banner */}
      {isTrialMode ? (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link 
                  href={`/dashboard/cases/${effectiveCaseId}/discovery`}
                  className="hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h2 className="text-xl font-bold">{currentCase.caseName}</h2>
                  <p className="text-sm text-amber-100">
                    {currentCase.caseNumber ? `Case #: ${currentCase.caseNumber} • ` : ''}Special Interrogatories
                  </p>
                </div>
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
      ) : (
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
      )}

      {/* Main Builder */}
      <InterrogatoriesCanvas 
        caseData={currentCase} 
        onCaseUpdate={handleCaseUpdate}
        isTrialMode={isTrialMode}
      />

      <Footer />
    </div>
  )
}
