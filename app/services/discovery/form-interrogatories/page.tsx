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
import { STANDARD_INTERROGATORIES } from '@/lib/pdf-form-filler'
import { FileText, Download, CheckSquare, Square, ArrowLeft, Loader2, Users, Scale } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

export default function FormInterrogatoriesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <FormInterrogatoriesPageContent />
    </Suspense>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="p-6 text-gray-600 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading Form Interrogatories...
      </div>
      <Footer />
    </div>
  )
}

function FormInterrogatoriesPageContent() {
  const searchParams = useSearchParams()
  const { isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId } = useTrialMode()
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null)
  const [currentCase, setCurrentCase] = useState<CaseFrontend | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Form state
  const [propoundingParty, setPropoundingParty] = useState<'plaintiff' | 'defendant'>('plaintiff')
  const [setNumber, setSetNumber] = useState(1)
  const [selectedInterrogatories, setSelectedInterrogatories] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [useOfficialForm, setUseOfficialForm] = useState(true)

  // Group interrogatories by category
  const interrogatoryCategories = Object.entries(STANDARD_INTERROGATORIES).reduce((acc, [num, data]) => {
    const category = data.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push({ num: num, ...data })
    return acc
  }, {} as Record<string, Array<{ num: string; category: string; text: string }>>)

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
            console.log(`[AUDIT] Form Interrogatories page accessed for case: ${caseId}`)
          }
        }
      } else if (isTrialMode) {
        setCurrentCaseId(trialCaseId)
      }
      
      setLoading(false)
    }
    
    loadCase()
  }, [searchParams, isTrialMode, trialCaseId, canAccessDatabase, isTrialCaseId])

  const toggleInterrogatory = (num: string) => {
    setSelectedInterrogatories(prev => 
      prev.includes(num) 
        ? prev.filter(n => n !== num)
        : [...prev, num].sort((a, b) => parseFloat(a) - parseFloat(b))
    )
  }

  const selectAllInCategory = (category: string) => {
    const nums = interrogatoryCategories[category].map(i => i.num)
    const allSelected = nums.every(n => selectedInterrogatories.includes(n))
    
    if (allSelected) {
      setSelectedInterrogatories(prev => prev.filter(n => !nums.includes(n)))
    } else {
      setSelectedInterrogatories(prev => [...new Set([...prev, ...nums])].sort((a, b) => parseFloat(a) - parseFloat(b)))
    }
  }

  const selectAllCommon = () => {
    // Common interrogatories for personal injury cases
    const common = ['1', '2', '6', '6.1', '6.2', '6.3', '6.5', '6.6', '7', '10', '10.1', '12.1', '12.4', '17']
    setSelectedInterrogatories(common)
  }

  const handleGenerate = async () => {
    if (!currentCaseId) {
      toast.error('Please select a case first')
      return
    }

    if (selectedInterrogatories.length === 0) {
      toast.error('Please select at least one interrogatory')
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-form-interrogatories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCaseId,
          propoundingParty,
          selectedInterrogatories,
          setNumber,
          useOfficialForm
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate')
      }

      const result = await response.json()
      
      // Download the PDF
      const pdfBytes = Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0))
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success('Form Interrogatories generated successfully!')
      
    } catch (error) {
      console.error('Generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate document')
    } finally {
      setIsGenerating(false)
    }
  }

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />
      <TrialModeBanner />
      <Toaster position="top-right" />
      
      {/* Case Name Header */}
      {currentCase && !isTrialMode && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link 
                  href={`/dashboard/cases/${currentCase.id}`}
                  className="hover:opacity-80 transition-opacity"
                >
                  <ArrowLeft className="w-5 h-5" />
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
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Scale className="h-10 w-10 text-blue-600" />
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="gradient-text">Form Interrogatories</span>
              </h1>
            </div>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
              Generate California Judicial Council Form Interrogatories (DISC-001) 
              with your case data automatically populated.
            </p>
          </div>
        </div>
      </section>

      {!currentCase ? (
        <section className="py-12">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Case Selected</h2>
              <p className="text-gray-600 mb-6">
                Please access this page from a case dashboard to generate Form Interrogatories.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column - Settings */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Case Info Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Case Information
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Case Name:</span>
                      <p className="font-medium text-gray-900">{currentCase.caseName}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Case Number:</span>
                      <p className="font-medium text-gray-900">{currentCase.caseNumber || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Court:</span>
                      <p className="font-medium text-gray-900">
                        {currentCase.court ? `${currentCase.court} County` : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Plaintiffs:</span>
                      <p className="font-medium text-gray-900">
                        {currentCase.plaintiffs?.map(p => p.name).join(', ') || 'Not set'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Defendants:</span>
                      <p className="font-medium text-gray-900">
                        {currentCase.defendants?.map(d => d.name).join(', ') || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Settings Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Discovery Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Propounding Party
                      </label>
                      <select
                        value={propoundingParty}
                        onChange={(e) => setPropoundingParty(e.target.value as 'plaintiff' | 'defendant')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      >
                        <option value="plaintiff">Plaintiff</option>
                        <option value="defendant">Defendant</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Set Number
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={setNumber}
                        onChange={(e) => setSetNumber(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Type Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Output Format</h3>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        checked={useOfficialForm}
                        onChange={() => setUseOfficialForm(true)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Official DISC-001</p>
                        <p className="text-xs text-gray-500">Fill the official California Judicial Council form</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        checked={!useOfficialForm}
                        onChange={() => setUseOfficialForm(false)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Custom Format</p>
                        <p className="text-xs text-gray-500">Generate a clean, formatted document</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Quick Select Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Select</h3>
                  <div className="space-y-2">
                    <button
                      onClick={selectAllCommon}
                      className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      Common Personal Injury Set
                    </button>
                    <button
                      onClick={() => setSelectedInterrogatories([])}
                      className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-blue-600">{selectedInterrogatories.length}</p>
                    <p className="text-sm text-gray-500">Interrogatories Selected</p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedInterrogatories.length === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5" />
                        Generate PDF
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column - Interrogatories Selection */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Select Interrogatories</h3>
                  
                  <div className="space-y-8">
                    {Object.entries(interrogatoryCategories).map(([category, interrogatories]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-800">{category}</h4>
                          <button
                            onClick={() => selectAllInCategory(category)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {interrogatories.every(i => selectedInterrogatories.includes(i.num))
                              ? 'Deselect All'
                              : 'Select All'}
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {interrogatories.map(interrog => (
                            <div
                              key={interrog.num}
                              onClick={() => toggleInterrogatory(interrog.num)}
                              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedInterrogatories.includes(interrog.num)
                                  ? 'border-blue-300 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {selectedInterrogatories.includes(interrog.num) ? (
                                  <CheckSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Square className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">
                                    Interrogatory No. {interrog.num}
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {interrog.text}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}

