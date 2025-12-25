'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Scale, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { CaseFrontend, MotionCaseCitation } from '@/lib/supabase/caseStorage'
import { userProfileStorage } from '@/lib/supabase/userProfileStorage'
import { CaseCaptionData } from '../../pleadings/complaint/components/CaseCaptionCard'

interface MotionFormProps {
  onMotionGenerated: (motion: string, motionType: string, motionData: MotionFormData) => void
  isGenerating: boolean
  setIsGenerating: (val: boolean) => void
  caseData?: CaseFrontend | null
  fromCaseDashboard?: boolean
  isTrialMode?: boolean
}

// Types for the structure
export interface ArgumentSubsection {
  id: string
  letter: string
  title: string
  content: string
}

export interface MemorandumData {
  introduction: string
  // Ex parte specific fields (only used when motionType === 'ex-parte-application')
  exigentCircumstances?: string
  irreparableHarm?: string
  // Timely Notice fields (ex parte)
  noticeDate?: string
  noticeTime?: string
  noticeMethod?: string
  facts: string
  law: string
  argument: string
  argumentSubsections: ArgumentSubsection[]
  // Demurrer specific - Leave to Amend section
  leaveToAmend?: string
  conclusion: string
}

export interface DeclarationFact {
  id: string
  number: number
  content: string
}

export interface DeclarationData {
  declarantName: string
  barNumber: string
  facts: DeclarationFact[]
}

export interface NoticeOfMotionData {
  hearingDate: string
  hearingTime: string
  department: string
  reliefSought: string
  reliefSoughtSummary: string  // AI-summarized version for Notice of Motion
  argumentSummary: string
  applicableRule: string
}

export interface MotionFormData {
  motionType: string
  captionData: CaseCaptionData
  noticeOfMotion: NoticeOfMotionData
  memorandum: MemorandumData
  declaration: DeclarationData
  caseCitations: MotionCaseCitation[]
}

// Motion types
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
]

// Motion type to California Rules of Court mapping
const MOTION_RULES: Record<string, string> = {
  'motion-to-compel-discovery': '3.1345',
  'motion-to-compel-deposition': '3.1345',
  'demurrer': '3.1320',
  'motion-to-strike': '3.1322',
  'motion-for-summary-judgment': '3.1350',
  'motion-for-summary-adjudication': '3.1350',
  'motion-in-limine': '3.1112',
  'motion-for-protective-order': '3.1345',
  'motion-to-quash-subpoena': '3.1345',
  'motion-for-sanctions': '3.1345',
  'ex-parte-application': '3.1200',
}

export default function MotionForm({
  onMotionGenerated,
  isGenerating,
  setIsGenerating,
  caseData,
  fromCaseDashboard = false,
  isTrialMode = false,
}: MotionFormProps) {
  // Motion type selection
  const [motionType, setMotionType] = useState('')

  // Simplified inputs - plain English
  const [motionDescription, setMotionDescription] = useState('')
  const [reliefSought, setReliefSought] = useState('')
  
  // Moving party
  const [movingParty, setMovingParty] = useState<'plaintiff' | 'defendant'>('defendant')

  // Document upload
  const [uploadedDocument, setUploadedDocument] = useState<{
    fileName: string
    content: string
  } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Caption Data (auto-populated for logged-in users)
  const [captionData, setCaptionData] = useState<CaseCaptionData>({
    attorneys: [{
      id: '1',
      name: '',
      barNumber: '',
      firm: '',
      address: '',
      phone: '',
      fax: '',
      email: '',
    }],
    plaintiffs: [''],
    defendants: [''],
    includeDoes: true,
    county: 'Los Angeles',
    caseNumber: '',
    judgeName: '',
    departmentNumber: '',
    documentType: 'MOTION',
    demandJuryTrial: false,
    complaintFiledDate: '',
    trialDate: '',
    causesOfAction: [],
    hearingDate: '',
    hearingTime: '08:30',
  })

  // Load case data if available
  useEffect(() => {
    if (caseData) {
      const allAttorneys = caseData.plaintiffs?.flatMap(p => 
        p.attorneys?.map(att => ({
          id: att.id || String(Date.now()),
          name: att.name || '',
          barNumber: att.barNumber || '',
          firm: att.firm || '',
          address: att.address || '',
          phone: att.phone || '',
          fax: '',
          email: att.email || '',
        })) || []
      ) || []

      setCaptionData(prev => ({
        ...prev,
        attorneys: allAttorneys.length > 0 ? allAttorneys : prev.attorneys,
        plaintiffs: caseData.plaintiffs?.map(p => p.name).filter(Boolean) || prev.plaintiffs,
        defendants: caseData.defendants?.map(d => d.name).filter(Boolean) || prev.defendants,
        includeDoes: caseData.includeDoes ?? prev.includeDoes,
        county: caseData.courtCounty || 'Los Angeles',
        caseNumber: caseData.caseNumber || '',
        judgeName: caseData.judgeName || prev.judgeName,
        departmentNumber: caseData.departmentNumber || prev.departmentNumber,
        complaintFiledDate: caseData.complaintFiledDate || prev.complaintFiledDate,
        trialDate: caseData.trialDate || prev.trialDate,
      }))
    }
  }, [caseData])

  // Load user profile for auto-population
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isTrialMode) {
        try {
          const profile = await userProfileStorage.getProfile()
          if (profile) {
            setCaptionData(prev => {
              const hasAttorneys = prev.attorneys.some(a => a.name.trim() !== '')
              if (!hasAttorneys) {
                return {
                  ...prev,
                  attorneys: [{
                    id: '1',
                    name: profile.fullName || '',
                    barNumber: profile.barNumber || '',
                    firm: profile.firmName || '',
                    address: profile.firmAddress || '',
                    phone: profile.firmPhone || '',
                    fax: '',
                    email: profile.firmEmail || '',
                  }],
                }
              }
              return prev
            })
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
        }
      }
    }
    loadUserProfile()
  }, [isTrialMode])

  // Auto-resize textarea helper
  const autoResizeTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  // Get selected motion info
  const selectedMotionInfo = MOTION_TYPES.find(m => m.id === motionType)

  // Handle document upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['.pdf', '.docx', '.doc', '.txt']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!validTypes.includes(fileExt)) {
      toast.error('Please upload a PDF, Word document, or text file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to parse document')
      }

      const data = await response.json()
      setUploadedDocument({
        fileName: data.fileName,
        content: data.text,
      })
      toast.success(`Document uploaded: ${data.fileName}`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  const removeUploadedDocument = () => {
    setUploadedDocument(null)
  }

  // Generate motion
  const handleGenerate = async () => {
    if (!motionType) {
      toast.error('Please select a motion type')
      return
    }
    if (!motionDescription.trim()) {
      toast.error('Please describe what the motion is about')
      return
    }
    // Relief is now combined with motion description - use motionDescription for both
    const combinedRelief = reliefSought.trim() || motionDescription

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-motion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Motion type from dropdown
          motionType,
          // Simplified inputs - combined facts and relief
          motionDescription,
          reliefSought: combinedRelief,
          autoDetectType: false, // Use the selected type
          // Uploaded document content
          uploadedDocumentContent: uploadedDocument?.content || null,
          uploadedDocumentName: uploadedDocument?.fileName || null,
          // Case context for data isolation
          caseId: caseData?.id,
          // Caption data
          county: captionData.county,
          plaintiffs: captionData.plaintiffs.filter(p => p.trim()).map(name => ({ name })),
          defendants: captionData.defendants.filter(d => d.trim()).map(name => ({ name })),
          caseNumber: captionData.caseNumber,
          caseName: caseData?.caseName,
          hearingDate: captionData.hearingDate,
          hearingTime: captionData.hearingTime,
          department: captionData.departmentNumber,
          movingParty,
          opposingParty: movingParty === 'plaintiff' ? 'defendant' : 'plaintiff',
          attorneys: captionData.attorneys,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to generate motion')
      }

      const data = await response.json()
      
      // Build motion form data for output
      const motionFormData: MotionFormData = {
        motionType,
        captionData,
        noticeOfMotion: {
          hearingDate: captionData.hearingDate || '',
          hearingTime: captionData.hearingTime || '08:30',
          department: captionData.departmentNumber || '',
          reliefSought: combinedRelief,
          reliefSoughtSummary: data.noticeReliefSummary || combinedRelief, // Use AI summary if available
          argumentSummary: motionDescription,
          applicableRule: data.applicableRule || MOTION_RULES[motionType] || '',
        },
        memorandum: {
          introduction: '',
          facts: motionDescription,
          law: '',
          argument: '',
          argumentSubsections: [],
          conclusion: '',
        },
        declaration: {
          declarantName: captionData.attorneys?.[0]?.name || '',
          barNumber: captionData.attorneys?.[0]?.barNumber || '',
          facts: [{ id: 'fact-1', number: 1, content: '' }],
        },
        caseCitations: [],
      }
      
      onMotionGenerated(data.motion, motionType, motionFormData)
      toast.success('Motion generated successfully!')
    } catch (error) {
      console.error('Error generating motion:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate motion')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Motion Type Selection - Dropdown */}
      <div className="glass-card p-6 rounded-2xl shadow-lg border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-md">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Select Motion Type</h3>
            <p className="text-sm text-gray-600">Choose the type of motion you need to file</p>
          </div>
        </div>

        <select
          value={motionType}
          onChange={(e) => setMotionType(e.target.value)}
          className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 text-lg transition-all cursor-pointer"
        >
          <option value="">Select Motion Type...</option>
          {MOTION_TYPES.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </select>

        {selectedMotionInfo && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <div className="font-semibold text-blue-900">{selectedMotionInfo.name}</div>
            <div className="text-sm text-blue-700 mt-1">{selectedMotionInfo.description}</div>
            <div className="text-xs text-gray-500 mt-2">
              California Rules of Court: Rule {MOTION_RULES[motionType] || 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Document Upload Card */}
      <div className="glass-card p-6 rounded-2xl shadow-lg border border-amber-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Upload Supporting Document</h3>
            <p className="text-sm text-gray-600">Optional: Upload a document for the AI to reference (pleadings, discovery, etc.)</p>
          </div>
        </div>

        {!uploadedDocument ? (
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleDocumentUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isUploading ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
            }`}>
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <svg className="w-8 h-8 animate-spin text-amber-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-amber-700 font-medium">Processing document...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-gray-600 font-medium">Drop a file here or click to upload</span>
                  <span className="text-sm text-gray-500">PDF, Word (.docx), or Text files up to 10MB</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{uploadedDocument.fileName}</p>
                  <p className="text-sm text-gray-600">{uploadedDocument.content.length.toLocaleString()} characters extracted</p>
                </div>
              </div>
              <button
                onClick={removeUploadedDocument}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-3 p-3 bg-white rounded-lg border border-amber-100 max-h-32 overflow-y-auto">
              <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">
                {uploadedDocument.content.substring(0, 500)}
                {uploadedDocument.content.length > 500 && '...'}
              </p>
            </div>
            <p className="text-xs text-amber-700 mt-2">
              ✓ This document will be used as reference when generating your motion
            </p>
          </div>
        )}
      </div>

      {/* Case Information Card */}
      <div className="glass-card p-6 rounded-2xl shadow-lg border border-purple-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Case Information</h3>
            <p className="text-sm text-gray-600">Enter the case caption details for your motion</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plaintiff(s) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Plaintiff(s) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={captionData.plaintiffs[0] || ''}
              onChange={(e) => setCaptionData(prev => ({
                ...prev,
                plaintiffs: [e.target.value]
              }))}
              placeholder="e.g., John Smith"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Defendant(s) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Defendant(s) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={captionData.defendants[0] || ''}
              onChange={(e) => setCaptionData(prev => ({
                ...prev,
                defendants: [e.target.value]
              }))}
              placeholder="e.g., ABC Corporation"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* County */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              County
            </label>
            <input
              type="text"
              value={captionData.county || ''}
              onChange={(e) => setCaptionData(prev => ({
                ...prev,
                county: e.target.value
              }))}
              placeholder="e.g., Los Angeles"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Case Number */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Case Number
            </label>
            <input
              type="text"
              value={captionData.caseNumber || ''}
              onChange={(e) => setCaptionData(prev => ({
                ...prev,
                caseNumber: e.target.value
              }))}
              placeholder="e.g., 24STCV12345"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Hearing Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hearing Date
            </label>
            <input
              type="date"
              value={captionData.hearingDate || ''}
              onChange={(e) => setCaptionData(prev => ({
                ...prev,
                hearingDate: e.target.value
              }))}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Department
            </label>
            <input
              type="text"
              value={captionData.departmentNumber || ''}
              onChange={(e) => setCaptionData(prev => ({
                ...prev,
                departmentNumber: e.target.value
              }))}
              placeholder="e.g., 32"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        {/* Attorney Information */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Attorney Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attorney Name
              </label>
              <input
                type="text"
                value={captionData.attorneys[0]?.name || ''}
                onChange={(e) => setCaptionData(prev => ({
                  ...prev,
                  attorneys: [{
                    ...prev.attorneys[0],
                    name: e.target.value
                  }]
                }))}
                placeholder="e.g., Jane Doe, Esq."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                State Bar Number
              </label>
              <input
                type="text"
                value={captionData.attorneys[0]?.barNumber || ''}
                onChange={(e) => setCaptionData(prev => ({
                  ...prev,
                  attorneys: [{
                    ...prev.attorneys[0],
                    barNumber: e.target.value
                  }]
                }))}
                placeholder="e.g., 123456"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Law Firm
              </label>
              <input
                type="text"
                value={captionData.attorneys[0]?.firm || ''}
                onChange={(e) => setCaptionData(prev => ({
                  ...prev,
                  attorneys: [{
                    ...prev.attorneys[0],
                    firm: e.target.value
                  }]
                }))}
                placeholder="e.g., Smith & Associates"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={captionData.attorneys[0]?.phone || ''}
                onChange={(e) => setCaptionData(prev => ({
                  ...prev,
                  attorneys: [{
                    ...prev.attorneys[0],
                    phone: e.target.value
                  }]
                }))}
                placeholder="e.g., (555) 123-4567"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              <input
                type="text"
                value={captionData.attorneys[0]?.address || ''}
                onChange={(e) => setCaptionData(prev => ({
                  ...prev,
                  attorneys: [{
                    ...prev.attorneys[0],
                    address: e.target.value
                  }]
                }))}
                placeholder="e.g., 123 Main Street, Suite 100, Los Angeles, CA 90001"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all"
              />
            </div>
          </div>
          </div>

          {/* Moving Party Selection */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className="text-base font-semibold text-gray-700">You are filing on behalf of:</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  value="plaintiff"
                  checked={movingParty === 'plaintiff'}
                  onChange={() => setMovingParty('plaintiff')}
                  className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-700 group-hover:text-purple-600 transition-colors font-medium">Plaintiff</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  value="defendant"
                  checked={movingParty === 'defendant'}
                  onChange={() => setMovingParty('defendant')}
                  className="w-5 h-5 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-700 group-hover:text-purple-600 transition-colors font-medium">Defendant</span>
            </label>
            </div>
          </div>
        </div>
      </div>

      {/* Motion Details Card - Combined Facts and Relief */}
      <div className="glass-card p-8 rounded-2xl shadow-xl border border-blue-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Motion Details</h3>
            <p className="text-gray-600">Describe your situation and what you're asking the Court to do</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Combined Motion Description and Relief */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-2">
              Facts and Relief Sought <span className="text-red-500">*</span>
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Describe the situation, the facts, why you need this motion, and what you want the Court to order. Be as detailed as possible.
            </p>
            <textarea
              value={motionDescription}
              onChange={(e) => {
                setMotionDescription(e.target.value)
                autoResizeTextarea(e)
              }}
              placeholder="Example: The defendant has refused to respond to our discovery requests for over 60 days. We served interrogatories and document requests on March 1, 2024, and despite multiple meet and confer attempts via email and phone calls, they have not provided any responses. The discovery is critical to proving our case because it will reveal the defendant's financial records showing the fraud.

We request the Court order the defendant to provide complete responses to all outstanding discovery requests within 10 days, and award us monetary sanctions in the amount of $3,500 for the attorney's fees and costs incurred in bringing this motion."
              rows={12}
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 resize-none text-base leading-relaxed transition-all"
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Tip: Include the facts of your case AND what specific relief you're seeking from the Court. The more detail you provide, the better your motion will be.
            </p>
          </div>

        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !motionType || !motionDescription.trim()}
          className={`mt-8 w-full py-5 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
            isGenerating || !motionType || !motionDescription.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-1'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Generating Your Motion...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6" />
              <span>Generate AI-Powered Motion</span>
            </>
          )}
        </button>
      </div>


      {/* Security Note */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Your data is secure and isolated. No data is shared between users or cases.</span>
      </div>
    </div>
  )
}
