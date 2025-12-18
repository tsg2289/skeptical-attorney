'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, Scale, Plus, X } from 'lucide-react'

interface Attorney {
  id: string
  name: string
  barNumber: string
  firm: string
  address: string
  phone: string
  fax: string
  email: string
}

export interface CaseCaptionData {
  attorneys: Attorney[]
  plaintiffs: string[]
  defendants: string[]
  includeDoes: boolean
  county: string
  caseNumber: string
  judgeName: string
  departmentNumber: string
  documentType: string
  demandJuryTrial: boolean
  complaintFiledDate: string
  trialDate: string
  causesOfAction: string[] // List of cause of action names for caption
}

interface CaseCaptionCardProps {
  initialData: Partial<CaseCaptionData>
  onChange: (data: CaseCaptionData) => void
  disabled?: boolean
}

const createEmptyAttorney = (): Attorney => ({
  id: String(Date.now()),
  name: '',
  barNumber: '',
  firm: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
})

export default function CaseCaptionCard({ initialData, onChange, disabled }: CaseCaptionCardProps) {
  const [data, setData] = useState<CaseCaptionData>({
    attorneys: initialData.attorneys?.length ? initialData.attorneys : [createEmptyAttorney()],
    plaintiffs: initialData.plaintiffs?.length ? initialData.plaintiffs : [''],
    defendants: initialData.defendants?.length ? initialData.defendants : [''],
    includeDoes: initialData.includeDoes ?? true,
    county: initialData.county || 'Los Angeles',
    caseNumber: initialData.caseNumber || '',
    judgeName: initialData.judgeName || '',
    departmentNumber: initialData.departmentNumber || '',
    documentType: initialData.documentType || 'COMPLAINT',
    demandJuryTrial: initialData.demandJuryTrial ?? true,
    complaintFiledDate: initialData.complaintFiledDate || '',
    trialDate: initialData.trialDate || '',
    causesOfAction: initialData.causesOfAction || [],
  })

  // Track if this is first render to avoid calling onChange on mount
  const isInitialMount = useRef(true)
  const isUpdatingFromProps = useRef(false)

  // Only call onChange when user makes changes (not on mount or prop sync)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (isUpdatingFromProps.current) {
      isUpdatingFromProps.current = false
      return
    }
    onChange(data)
  }, [data, onChange])

  // Update from initialData when it changes (but don't trigger onChange)
  useEffect(() => {
    const hasData = initialData.attorneys?.length || initialData.plaintiffs?.length || 
                    initialData.defendants?.length || initialData.county || initialData.caseNumber || initialData.judgeName || initialData.departmentNumber
    if (hasData && !isInitialMount.current) {
      isUpdatingFromProps.current = true
      setData(prev => ({
        ...prev,
        attorneys: initialData.attorneys?.length ? initialData.attorneys : prev.attorneys,
        plaintiffs: initialData.plaintiffs?.length ? initialData.plaintiffs : prev.plaintiffs,
        defendants: initialData.defendants?.length ? initialData.defendants : prev.defendants,
        includeDoes: initialData.includeDoes ?? prev.includeDoes,
        county: initialData.county ?? prev.county,
        caseNumber: initialData.caseNumber ?? prev.caseNumber,
        judgeName: initialData.judgeName ?? prev.judgeName,
        departmentNumber: initialData.departmentNumber ?? prev.departmentNumber,
        complaintFiledDate: initialData.complaintFiledDate ?? prev.complaintFiledDate,
        trialDate: initialData.trialDate ?? prev.trialDate,
      }))
    }
  }, [initialData.attorneys, initialData.plaintiffs, initialData.defendants, initialData.county, initialData.caseNumber, initialData.judgeName, initialData.departmentNumber, initialData.complaintFiledDate, initialData.trialDate])

  const updateField = (field: keyof CaseCaptionData, value: string | boolean) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  // Attorney handlers
  const updateAttorney = (index: number, field: keyof Attorney, value: string) => {
    setData(prev => ({
      ...prev,
      attorneys: prev.attorneys.map((att, i) => 
        i === index ? { ...att, [field]: value } : att
      )
    }))
  }

  const addAttorney = () => {
    if (data.attorneys.length < 5) {
      setData(prev => ({
        ...prev,
        attorneys: [...prev.attorneys, createEmptyAttorney()]
      }))
    }
  }

  const removeAttorney = (index: number) => {
    if (data.attorneys.length > 1) {
      setData(prev => ({
        ...prev,
        attorneys: prev.attorneys.filter((_, i) => i !== index)
      }))
    }
  }

  // Plaintiff handlers
  const updatePlaintiff = (index: number, value: string) => {
    setData(prev => ({
      ...prev,
      plaintiffs: prev.plaintiffs.map((p, i) => i === index ? value : p)
    }))
  }

  const addPlaintiff = () => {
    if (data.plaintiffs.length < 10) {
      setData(prev => ({
        ...prev,
        plaintiffs: [...prev.plaintiffs, '']
      }))
    }
  }

  const removePlaintiff = (index: number) => {
    if (data.plaintiffs.length > 1) {
      setData(prev => ({
        ...prev,
        plaintiffs: prev.plaintiffs.filter((_, i) => i !== index)
      }))
    }
  }

  // Defendant handlers
  const updateDefendant = (index: number, value: string) => {
    setData(prev => ({
      ...prev,
      defendants: prev.defendants.map((d, i) => i === index ? value : d)
    }))
  }

  const addDefendant = () => {
    if (data.defendants.length < 10) {
      setData(prev => ({
        ...prev,
        defendants: [...prev.defendants, '']
      }))
    }
  }

  const removeDefendant = (index: number) => {
    if (data.defendants.length > 1) {
      setData(prev => ({
        ...prev,
        defendants: prev.defendants.filter((_, i) => i !== index)
      }))
    }
  }

  const inputStyle = "w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
  const labelStyle = "block text-xs font-medium text-gray-500 mb-1.5"

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Attorney Information Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Attorney Information
          </h4>
          {data.attorneys.length < 5 && (
            <button
              type="button"
              onClick={addAttorney}
              disabled={disabled}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Attorney
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {data.attorneys.map((attorney, index) => (
            <div key={attorney.id} className="bg-gray-50/50 rounded-lg border border-gray-100 p-4 space-y-4">
              {/* Attorney Header */}
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-600">Attorney {index + 1}</span>
                {data.attorneys.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttorney(index)}
                    disabled={disabled}
                    className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Row 1: Name & Bar Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Attorney Name</label>
                  <input
                    type="text"
                    value={attorney.name}
                    onChange={(e) => updateAttorney(index, 'name', e.target.value)}
                    placeholder="Full Name"
                    disabled={disabled}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>State Bar Number</label>
                  <input
                    type="text"
                    value={attorney.barNumber}
                    onChange={(e) => updateAttorney(index, 'barNumber', e.target.value)}
                    placeholder="123456"
                    disabled={disabled}
                    className={inputStyle}
                  />
                </div>
              </div>

              {/* Row 2: Firm & Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Law Firm / Company</label>
                  <input
                    type="text"
                    value={attorney.firm}
                    onChange={(e) => updateAttorney(index, 'firm', e.target.value)}
                    placeholder="Law Firm Name"
                    disabled={disabled}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Address</label>
                  <input
                    type="text"
                    value={attorney.address}
                    onChange={(e) => updateAttorney(index, 'address', e.target.value)}
                    placeholder="Street, City, State ZIP"
                    disabled={disabled}
                    className={inputStyle}
                  />
                </div>
              </div>

              {/* Row 3: Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Phone</label>
                  <input
                    type="text"
                    value={attorney.phone}
                    onChange={(e) => updateAttorney(index, 'phone', e.target.value)}
                    placeholder="(555) 555-5555"
                    disabled={disabled}
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={attorney.email}
                    onChange={(e) => updateAttorney(index, 'email', e.target.value)}
                    placeholder="attorney@lawfirm.com"
                    disabled={disabled}
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Court & Case Information Section */}
      <div className="p-6 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Scale className="w-4 h-4 text-blue-600" />
          Court & Case Information
        </h4>
        
        <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-4 space-y-4">
          {/* Row 1: County & Case Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>California County</label>
              <input
                type="text"
                value={data.county}
                onChange={(e) => updateField('county', e.target.value)}
                placeholder="Los Angeles"
                disabled={disabled}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Case Number</label>
              <input
                type="text"
                value={data.caseNumber}
                onChange={(e) => updateField('caseNumber', e.target.value)}
                placeholder="24STCV00000"
                disabled={disabled}
                className={inputStyle}
              />
            </div>
          </div>

          {/* Row 2: Assigned Judge & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Assigned Judge</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-medium whitespace-nowrap">Honorable</span>
                <input
                  type="text"
                  value={data.judgeName}
                  onChange={(e) => updateField('judgeName', e.target.value)}
                  placeholder="Judge Name"
                  disabled={disabled}
                  className={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className={labelStyle}>Department</label>
              <input
                type="text"
                value={data.departmentNumber}
                onChange={(e) => updateField('departmentNumber', e.target.value)}
                placeholder="Dept. Number"
                disabled={disabled}
                className={inputStyle}
              />
            </div>
          </div>

          {/* Row 3: Document Type & Jury Demand */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Document Type</label>
              <input
                type="text"
                value={data.documentType}
                onChange={(e) => updateField('documentType', e.target.value)}
                disabled={disabled}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Jury Trial</label>
              <label className="flex items-center gap-3 h-[42px] px-4 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={data.demandJuryTrial}
                  onChange={(e) => updateField('demandJuryTrial', e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Demand for Jury Trial</span>
              </label>
            </div>
          </div>

          {/* Complaint Filed Date & Trial Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Complaint Filed Date</label>
              <input
                type="date"
                value={data.complaintFiledDate}
                onChange={(e) => updateField('complaintFiledDate', e.target.value)}
                disabled={disabled}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Trial Date</label>
              <input
                type="date"
                value={data.trialDate}
                onChange={(e) => updateField('trialDate', e.target.value)}
                disabled={disabled}
                className={inputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plaintiffs Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Plaintiffs
          </h4>
          {data.plaintiffs.length < 10 && (
            <button
              type="button"
              onClick={addPlaintiff}
              disabled={disabled}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Plaintiff
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {data.plaintiffs.map((plaintiff, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={plaintiff}
                  onChange={(e) => updatePlaintiff(index, e.target.value)}
                  placeholder={`Plaintiff ${index + 1} Name`}
                  disabled={disabled}
                  className={inputStyle}
                />
              </div>
              {data.plaintiffs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlaintiff(index)}
                  disabled={disabled}
                  className="px-3 py-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Defendants Section */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Defendants
          </h4>
          {data.defendants.length < 10 && (
            <button
              type="button"
              onClick={addDefendant}
              disabled={disabled}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Defendant
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {data.defendants.map((defendant, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={defendant}
                  onChange={(e) => updateDefendant(index, e.target.value)}
                  placeholder={`Defendant ${index + 1} Name`}
                  disabled={disabled}
                  className={inputStyle}
                />
              </div>
              {data.defendants.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDefendant(index)}
                  disabled={disabled}
                  className="px-3 py-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          
          {/* Does 1-50 Toggle */}
          <label className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={data.includeDoes}
              onChange={(e) => updateField('includeDoes', e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Include <span className="font-medium">DOES 1 through 50, inclusive</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
