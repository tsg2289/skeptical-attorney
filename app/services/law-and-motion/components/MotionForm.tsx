'use client'

import { useState, useEffect } from 'react'
import { FileText, Sparkles, Plus, Trash2, Search, X, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { CaseFrontend, MotionCaseCitation } from '@/lib/supabase/caseStorage'
import CaseLawSearch from './CaseLawSearch'

interface MotionFormProps {
  onMotionGenerated: (motion: string, motionType: string) => void
  isGenerating: boolean
  setIsGenerating: (val: boolean) => void
  caseData?: CaseFrontend | null
  fromCaseDashboard?: boolean
}

const MOTION_TYPES = [
  { id: 'motion-to-compel-discovery', name: 'Motion to Compel Discovery', description: 'Compel responses to interrogatories, document requests, or admissions' },
  { id: 'motion-to-compel-deposition', name: 'Motion to Compel Deposition', description: 'Compel attendance at deposition or production of documents' },
  { id: 'demurrer', name: 'Demurrer', description: 'Challenge legal sufficiency of a pleading' },
  { id: 'motion-to-strike', name: 'Motion to Strike', description: 'Strike irrelevant, false, or improper matter from pleading' },
  { id: 'motion-for-summary-judgment', name: 'Motion for Summary Judgment', description: 'Judgment as a matter of law when no triable issues exist' },
  { id: 'motion-for-summary-adjudication', name: 'Motion for Summary Adjudication', description: 'Adjudicate specific issues or causes of action' },
  { id: 'motion-in-limine', name: 'Motion in Limine', description: 'Exclude or limit evidence at trial' },
  { id: 'motion-for-protective-order', name: 'Motion for Protective Order', description: 'Protect party from burdensome or improper discovery' },
  { id: 'motion-to-quash-subpoena', name: 'Motion to Quash Subpoena', description: 'Challenge validity of a subpoena' },
  { id: 'motion-for-sanctions', name: 'Motion for Sanctions', description: 'Seek sanctions for discovery abuse or bad faith conduct' },
  { id: 'ex-parte-application', name: 'Ex Parte Application', description: 'Emergency relief without full notice' },
  { id: 'opposition', name: 'Opposition to Motion', description: 'Oppose a pending motion' },
  { id: 'reply', name: 'Reply Brief', description: 'Reply to opposition arguments' },
]

export default function MotionForm({
  onMotionGenerated,
  isGenerating,
  setIsGenerating,
  caseData,
  fromCaseDashboard = false,
}: MotionFormProps) {
  const [motionType, setMotionType] = useState('')
  const [facts, setFacts] = useState('')
  const [legalIssues, setLegalIssues] = useState('')
  const [reliefSought, setReliefSought] = useState('')
  const [hearingDate, setHearingDate] = useState('')
  const [hearingTime, setHearingTime] = useState('08:30')
  const [department, setDepartment] = useState('')
  const [movingParty, setMovingParty] = useState<'plaintiff' | 'defendant'>('plaintiff')
  const [selectedCitations, setSelectedCitations] = useState<MotionCaseCitation[]>([])
  const [showCaseLawSearch, setShowCaseLawSearch] = useState(false)
  
  // For standalone use (not from case dashboard)
  const [county, setCounty] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [plaintiffName, setPlaintiffName] = useState('')
  const [defendantName, setDefendantName] = useState('')

  // Load case data
  useEffect(() => {
    if (caseData) {
      setFacts(caseData.facts || '')
      setCounty(caseData.courtCounty || '')
      setCaseNumber(caseData.caseNumber || '')
      if (caseData.plaintiffs?.length) {
        setPlaintiffName(caseData.plaintiffs.map(p => p.name).join(', '))
      }
      if (caseData.defendants?.length) {
        setDefendantName(caseData.defendants.map(d => d.name).join(', '))
      }
    }
  }, [caseData])

  const handleAddCitation = (citation: MotionCaseCitation) => {
    if (!selectedCitations.find(c => c.id === citation.id)) {
      setSelectedCitations(prev => [...prev, citation])
      toast.success(`Added: ${citation.caseName}`)
    }
  }

  const handleRemoveCitation = (id: string) => {
    setSelectedCitations(prev => prev.filter(c => c.id !== id))
  }

  const handleGenerate = async () => {
    if (!motionType) {
      toast.error('Please select a motion type')
      return
    }
    if (!facts.trim()) {
      toast.error('Please provide case facts')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motionType,
          facts,
          legalIssues,
          reliefSought,
          caseId: caseData?.id,
          county: caseData?.courtCounty || county,
          plaintiffs: caseData?.plaintiffs || [{ name: plaintiffName }],
          defendants: caseData?.defendants || [{ name: defendantName }],
          caseNumber: caseData?.caseNumber || caseNumber,
          caseName: caseData?.caseName,
          hearingDate,
          hearingTime,
          department,
          movingParty,
          opposingParty: movingParty === 'plaintiff' ? 'defendant' : 'plaintiff',
          caseCitations: selectedCitations.map(c => ({
            caseName: c.caseName,
            citation: c.citation,
            relevantText: c.relevantText,
          })),
          attorneys: caseData?.plaintiffs?.[0]?.attorneys || caseData?.defendants?.[0]?.attorneys || [],
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate motion')
      }

      const data = await response.json()
      onMotionGenerated(data.motion, motionType)
      toast.success('Motion generated successfully!')
    } catch (error) {
      console.error('Error generating motion:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate motion')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedMotionInfo = MOTION_TYPES.find(m => m.id === motionType)

  return (
    <div className="space-y-6">
      {/* Motion Type Selection */}
      <div className="glass-card p-6 rounded-2xl shadow-lg border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <FileText className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Select Motion Type</h3>
            <p className="text-sm text-gray-600">Choose the type of motion to generate</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MOTION_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setMotionType(type.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                motionType === type.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900 text-sm">{type.name}</div>
              <div className="text-xs text-gray-500 mt-1">{type.description}</div>
            </button>
          ))}
        </div>

        {selectedMotionInfo && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="font-semibold text-blue-900">{selectedMotionInfo.name}</div>
            <div className="text-sm text-blue-700 mt-1">{selectedMotionInfo.description}</div>
          </div>
        )}
      </div>

      {/* Case Information - only show if not from dashboard */}
      {!fromCaseDashboard && (
        <div className="glass-card p-6 rounded-2xl shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Case Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="Los Angeles"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
              <input
                type="text"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="23STCV00000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plaintiff(s)</label>
              <input
                type="text"
                value={plaintiffName}
                onChange={(e) => setPlaintiffName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Defendant(s)</label>
              <input
                type="text"
                value={defendantName}
                onChange={(e) => setDefendantName(e.target.value)}
                placeholder="ACME Corporation"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* Hearing Information */}
      <div className="glass-card p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Hearing Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hearing Date</label>
            <input
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hearing Time</label>
            <input
              type="time"
              value={hearingTime}
              onChange={(e) => setHearingTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Dept. 1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Moving Party</label>
            <select
              value={movingParty}
              onChange={(e) => setMovingParty(e.target.value as 'plaintiff' | 'defendant')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="plaintiff">Plaintiff</option>
              <option value="defendant">Defendant</option>
            </select>
          </div>
        </div>
      </div>

      {/* Facts and Legal Issues */}
      <div className="glass-card p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Motion Details</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Case Facts <span className="text-red-500">*</span>
            </label>
            <textarea
              value={facts}
              onChange={(e) => setFacts(e.target.value)}
              placeholder="Describe the relevant facts of the case that support your motion..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Issues to Address
            </label>
            <textarea
              value={legalIssues}
              onChange={(e) => setLegalIssues(e.target.value)}
              placeholder="What legal issues should this motion address? (e.g., Defendant failed to respond to interrogatories within 30 days...)"
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relief Sought
            </label>
            <textarea
              value={reliefSought}
              onChange={(e) => setReliefSought(e.target.value)}
              placeholder="What relief are you seeking? (e.g., Order compelling responses, monetary sanctions...)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-vertical"
            />
          </div>
        </div>
      </div>

      {/* Case Law Citations */}
      <div className="glass-card p-6 rounded-2xl shadow-lg border border-purple-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <BookOpen className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">California Case Law</h3>
              <p className="text-sm text-gray-600">Search CourtListener for relevant authority</p>
            </div>
          </div>
          <button
            onClick={() => setShowCaseLawSearch(!showCaseLawSearch)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors"
          >
            <Search className="w-4 h-4" />
            {showCaseLawSearch ? 'Hide Search' : 'Search Case Law'}
          </button>
        </div>

        {/* Selected Citations */}
        {selectedCitations.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-sm font-medium text-gray-700">Selected Citations ({selectedCitations.length})</div>
            {selectedCitations.map((citation) => (
              <div key={citation.id} className="flex items-start justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{citation.caseName}</div>
                  <div className="text-sm text-purple-600">{citation.citation}</div>
                  <div className="text-xs text-gray-500 mt-1">{citation.relevantText}</div>
                </div>
                <button
                  onClick={() => handleRemoveCitation(citation.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Case Law Search Component */}
        {showCaseLawSearch && (
          <CaseLawSearch
            onSelectCitation={handleAddCitation}
            selectedCitations={selectedCitations}
            motionType={motionType}
            legalIssues={legalIssues}
          />
        )}
      </div>

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !motionType}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg shadow-lg transition-all duration-300 ${
            isGenerating || !motionType
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:scale-105'
          }`}
        >
          <Sparkles className={`w-6 h-6 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating Motion...' : 'Generate Motion'}
        </button>
      </div>
    </div>
  )
}

