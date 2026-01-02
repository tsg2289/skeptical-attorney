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
  fax?: string
  email?: string
  county?: string
  judgeName?: string
  departmentNumber?: string
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
  fax,
  email,
  county = 'Los Angeles',
  judgeName,
  departmentNumber
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
            <div className="max-w-3xl mx-auto bg-white shadow-lg font-serif text-black p-8">
              {/* Attorney Header - Left Aligned (Pleading Paper Style) */}
              <div className="mb-6 space-y-0 text-sm leading-6">
                <div className="text-black">
                  <p>{attorneyName || '[ATTORNEY NAME]'}, State Bar No. {stateBarNumber || '[BAR NUMBER]'}</p>
                  <p>{lawFirmName || '[LAW FIRM]'}</p>
                  <p>{address || '[ADDRESS]'}</p>
                  <p>Telephone: {phone || '[PHONE]'}</p>
                  <p>Facsimile: {fax || '[Fax Number]'}</p>
                  <p>{email || '[EMAIL]'}</p>
                </div>
                <p className="mt-2 text-black">
                  Attorney for {propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'} {propoundingPartyName}
                </p>
              </div>

              {/* Court Header */}
              <div className="text-center mb-8 uppercase font-bold text-black">
                <p>SUPERIOR COURT OF THE STATE OF CALIFORNIA</p>
                <p>COUNTY OF {county.toUpperCase()}</p>
              </div>

              {/* Case Caption Table */}
              <div className="mb-8 border-2 border-black">
                <div className="flex">
                  {/* Left side - Parties */}
                  <div className="w-1/2 p-4 border-r-2 border-black">
                    <div className="mb-4">
                      <p className="text-sm text-black">{plaintiffName},</p>
                      <p className="text-sm indent-8 text-black">Plaintiff(s),</p>
                    </div>
                    <p className="text-sm my-4 text-black">vs.</p>
                    <div>
                      <p className="text-sm text-black">{defendantName},</p>
                      <p className="text-sm indent-8 text-black">Defendant(s).</p>
                    </div>
                  </div>
                  
                  {/* Right side - Case Info */}
                  <div className="w-1/2 p-4 space-y-2">
                    <p className="text-sm text-black">Case No.: {caseNumber || '[CASE NUMBER]'}</p>
                    {judgeName && (
                      <p className="text-sm text-black">Honorable {judgeName}</p>
                    )}
                    {departmentNumber && (
                      <p className="text-sm text-black">Dept. {departmentNumber}</p>
                    )}
                    <p className="text-sm font-bold text-black mt-4 uppercase">
                      {TYPE_TITLES[discoveryType].toUpperCase()}
                    </p>
                    <p className="text-sm text-black">
                      SET {SET_NUMBER_WORDS[setNumber - 1] || setNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Party Info Box */}
              <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 mb-6 text-sm font-mono`}>
                <p className="text-black"><strong>PROPOUNDING PARTY:</strong> {propoundingParty.toUpperCase()}</p>
                <p className="text-black"><strong>RESPONDING PARTY:</strong> {respondingParty.toUpperCase()}</p>
                <p className="text-black"><strong>SET NO.:</strong> {SET_NUMBER_WORDS[setNumber - 1] || setNumber}</p>
              </div>

              {/* Introduction */}
              <p className="text-sm text-black mb-6 leading-relaxed">
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
              {(discoveryType === 'interrogatories' || discoveryType === 'rfp' || discoveryType === 'rfa') && definitions.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-black uppercase mb-4 border-b border-black pb-2">
                    DEFINITIONS
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-black">
                    {definitions.map((def, i) => (
                      <li key={i} className="leading-relaxed">{def}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Discovery Items */}
              <div>
                <h3 className="text-sm font-bold text-black uppercase mb-4 border-b border-black pb-2">
                  {discoveryType === 'interrogatories' ? 'SPECIAL INTERROGATORIES' : 
                   discoveryType === 'rfp' ? 'REQUESTS FOR PRODUCTION' : 'REQUESTS FOR ADMISSION'}
                </h3>

                {/* Categorized Items */}
                {categories && categories.map(category => (
                  category.items.length > 0 && (
                    <div key={category.title} className="mb-6">
                      <h4 className="text-xs font-semibold text-black uppercase tracking-wide mb-3 italic">
                        {category.title}
                      </h4>
                      <div className="space-y-4">
                        {category.items.map(item => (
                          <div key={item.number} className="pl-4 border-l-2 border-black">
                            <p className="text-sm font-semibold text-black">
                              {discoveryType === 'interrogatories' ? 'SPECIAL INTERROGATORY' : 
                               discoveryType === 'rfp' ? 'REQUEST FOR PRODUCTION' : 'REQUEST FOR ADMISSION'} NO. {item.number}:
                            </p>
                            <p className="text-sm text-black mt-1 leading-relaxed whitespace-pre-wrap">
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
                      <div key={item.number} className="pl-4 border-l-2 border-black">
                        <p className="text-sm font-semibold text-black">
                          REQUEST FOR ADMISSION NO. {item.number}:
                        </p>
                        <p className="text-sm text-black mt-1 leading-relaxed whitespace-pre-wrap">
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
              <div className="mt-12 pt-6 border-t border-black">
                <p className="text-sm text-black mb-2">Dated: ________________</p>
                <p className="text-sm text-black mb-8">Respectfully submitted,</p>
                <div className="space-y-1">
                  <p className="text-sm text-black">{lawFirmName || '[Law Firm Name]'}</p>
                  <p className="text-sm text-black mt-8">_________________________________</p>
                  <p className="text-sm text-black">{attorneyName || '[Attorney Name]'}</p>
                  {stateBarNumber && <p className="text-sm text-black">State Bar No. {stateBarNumber}</p>}
                  <p className="text-sm text-black">Attorney for {propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'}</p>
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























