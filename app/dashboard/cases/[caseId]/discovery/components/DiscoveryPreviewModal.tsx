'use client'

import { useState } from 'react'
import { X, FileDown } from 'lucide-react'
import { downloadDiscoveryDocument, DiscoveryDocumentData } from '@/lib/docx-generator'

interface DiscoveryItem {
  number: number
  content: string
}

interface DiscoveryCategory {
  title: string
  items: DiscoveryItem[]
}

interface PreviewModalProps {
  isOpen: boolean
  onClose: () => void
  discoveryType: 'interrogatories' | 'rfp' | 'rfa'
  propoundingParty: 'plaintiff' | 'defendant'
  respondingParty: 'plaintiff' | 'defendant'
  setNumber: number
  plaintiffName: string
  defendantName: string
  caseName: string
  caseNumber: string
  definitions: string[]
  categories?: DiscoveryCategory[]
  items?: DiscoveryItem[] // For RFA
  // Attorney/Court info (optional)
  attorneyName?: string
  stateBarNumber?: string
  lawFirmName?: string
  address?: string
  phone?: string
  email?: string
  county?: string
}

const TYPE_TITLES: Record<string, string> = {
  interrogatories: 'Special Interrogatories',
  rfp: 'Requests for Production of Documents',
  rfa: 'Requests for Admission'
}

const TYPE_COLORS: Record<string, { gradient: string; bg: string; border: string }> = {
  interrogatories: { gradient: 'from-blue-600 to-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  rfp: { gradient: 'from-emerald-600 to-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  rfa: { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
}

const SET_NUMBER_WORDS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']

export default function DiscoveryPreviewModal({
  isOpen,
  onClose,
  discoveryType,
  propoundingParty,
  respondingParty,
  setNumber,
  plaintiffName,
  defendantName,
  caseName,
  caseNumber,
  definitions,
  categories,
  items,
  attorneyName,
  stateBarNumber,
  lawFirmName,
  address,
  phone,
  email,
  county = 'Los Angeles'
}: PreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen) return null

  const colors = TYPE_COLORS[discoveryType]
  const propoundingPartyName = propoundingParty === 'plaintiff' ? plaintiffName : defendantName
  const respondingPartyName = respondingParty === 'plaintiff' ? plaintiffName : defendantName

  // Get all items for counting
  const allItems = categories 
    ? categories.flatMap(c => c.items) 
    : items || []

  const handleGenerateWord = async () => {
    setIsGenerating(true)
    try {
      const docData: DiscoveryDocumentData = {
        discoveryType,
        propoundingParty,
        respondingParty,
        setNumber,
        plaintiffName,
        defendantName,
        caseName,
        caseNumber,
        definitions,
        categories: categories?.map(c => ({
          title: c.title,
          items: c.items.map(i => ({ number: i.number, content: i.content }))
        })),
        items: items?.map(i => ({ number: i.number, content: i.content })),
        attorneyName,
        stateBarNumber,
        lawFirmName,
        address,
        phone,
        email,
        county,
      }

      await downloadDiscoveryDocument(docData)
    } catch (error) {
      console.error('Error generating Word document:', error)
      alert('Failed to generate Word document. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Clean item content (remove embedded headers)
  const cleanContent = (content: string) => {
    return content
      .replace(/^(SPECIAL INTERROGATORY NO\.|REQUEST FOR PRODUCTION NO\.|REQUEST FOR ADMISSION NO\.)\s*\[?X?\]?:?\s*/i, '')
      .trim()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r ${colors.gradient} text-white`}>
            <div>
              <h2 className="text-2xl font-bold">{TYPE_TITLES[discoveryType]} Preview</h2>
              <p className="text-sm text-white/80 mt-1">
                {caseName} • Set {SET_NUMBER_WORDS[setNumber - 1] || setNumber} • {allItems.length} items
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg rounded-lg">
              {/* Document Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-2">SUPERIOR COURT OF THE STATE OF CALIFORNIA</p>
                <p className="text-sm text-gray-600 mb-4">COUNTY OF {county.toUpperCase()}</p>
                
                <div className="my-4 text-left">
                  <p className="text-sm">{plaintiffName}, <span className="text-gray-500">Plaintiff,</span></p>
                  <p className="text-sm text-center my-2">vs.</p>
                  <p className="text-sm">{defendantName}, <span className="text-gray-500">Defendant.</span></p>
                </div>

                <p className="text-sm font-semibold mt-4">Case No.: {caseNumber}</p>
              </div>

              {/* Document Title */}
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                  {TYPE_TITLES[discoveryType].toUpperCase()}
                </h1>
                <p className="text-sm text-gray-600 mt-2">
                  SET {SET_NUMBER_WORDS[setNumber - 1] || setNumber}
                </p>
              </div>

              {/* Party Info */}
              <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 mb-6 text-sm font-mono`}>
                <p><strong>PROPOUNDING PARTY:</strong> {propoundingParty.toUpperCase()}</p>
                <p><strong>RESPONDING PARTY:</strong> {respondingParty.toUpperCase()}</p>
                <p><strong>SET NO.:</strong> {SET_NUMBER_WORDS[setNumber - 1] || setNumber}</p>
              </div>

              {/* Introduction */}
              <p className="text-sm text-gray-700 mb-6 leading-relaxed">
                {propoundingPartyName} ("{propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'}") requests, 
                pursuant to California Code of Civil Procedure section {
                  discoveryType === 'interrogatories' ? '2030.030' : 
                  discoveryType === 'rfp' ? '2031.010' : '2033.010'
                }, that {respondingPartyName} ("{respondingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'}" or "Responding Party") 
                {discoveryType === 'interrogatories' 
                  ? ' answer under oath, and within the time provided by law, the following Special Interrogatories:' 
                  : discoveryType === 'rfp' 
                  ? ' produce, within the time provided by law, the following documents and things:' 
                  : ' admit the truth of the following matters:'}
              </p>

              {/* Definitions (for interrogatories and RFP) */}
              {(discoveryType === 'interrogatories' || discoveryType === 'rfp') && definitions.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 uppercase mb-4 border-b border-gray-200 pb-2">
                    Definitions
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-xs text-gray-700">
                    {definitions.map((def, i) => (
                      <li key={i} className="leading-relaxed">{def}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Discovery Items */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase mb-4 border-b border-gray-200 pb-2">
                  {discoveryType === 'interrogatories' ? 'Special Interrogatories' : 
                   discoveryType === 'rfp' ? 'Requests for Production' : 'Requests for Admission'}
                </h3>

                {/* Categorized Items */}
                {categories && categories.map(category => (
                  category.items.length > 0 && (
                    <div key={category.title} className="mb-6">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3 italic">
                        {category.title}
                      </h4>
                      <div className="space-y-4">
                        {category.items.map(item => (
                          <div key={item.number} className="pl-4 border-l-2 border-gray-200">
                            <p className="text-sm font-semibold text-gray-900">
                              {discoveryType === 'interrogatories' ? 'SPECIAL INTERROGATORY' : 
                               discoveryType === 'rfp' ? 'REQUEST FOR PRODUCTION' : 'REQUEST FOR ADMISSION'} NO. {item.number}:
                            </p>
                            <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">
                              {cleanContent(item.content)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}

                {/* Non-categorized Items (RFA) */}
                {items && items.length > 0 && (
                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.number} className="pl-4 border-l-2 border-amber-200">
                        <p className="text-sm font-semibold text-gray-900">
                          REQUEST FOR ADMISSION NO. {item.number}:
                        </p>
                        <p className="text-sm text-gray-700 mt-1 leading-relaxed whitespace-pre-wrap">
                          {cleanContent(item.content)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {allItems.length === 0 && (
                  <p className="text-sm text-gray-400 italic text-center py-8">
                    No {discoveryType === 'interrogatories' ? 'interrogatories' : 
                         discoveryType === 'rfp' ? 'requests' : 'admissions'} drafted yet.
                  </p>
                )}
              </div>

              {/* Signature Block */}
              <div className="mt-12 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Dated: ________________</p>
                <p className="text-sm text-gray-600 mb-8">Respectfully submitted,</p>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">{lawFirmName || '[Law Firm Name]'}</p>
                  <p className="text-sm text-gray-600 mt-8">_________________________________</p>
                  <p className="text-sm text-gray-600">{attorneyName || '[Attorney Name]'}</p>
                  {stateBarNumber && <p className="text-sm text-gray-600">State Bar No. {stateBarNumber}</p>}
                  <p className="text-sm text-gray-600">Attorney for {propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-white">
            <p className="text-sm text-gray-500">
              {allItems.length} {discoveryType === 'interrogatories' ? 'interrogatories' : 
                               discoveryType === 'rfp' ? 'requests' : 'admissions'} in this set
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-full font-semibold hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleGenerateWord}
                disabled={isGenerating || allItems.length === 0}
                className={`px-6 py-2 bg-gradient-to-r ${colors.gradient} text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 ${
                  isGenerating || allItems.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    Export to Word
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


