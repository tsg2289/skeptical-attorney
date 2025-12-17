'use client'

import { useState, useEffect } from 'react'
import { FileText, Copy, Check, RotateCcw, Plus, FileIcon, ChevronDown, ChevronUp, X, Save, BookOpen } from 'lucide-react'
import { CaseFrontend, supabaseCaseStorage, MotionSection, MotionDocument } from '@/lib/supabase/caseStorage'
import { downloadMotionDocument, MotionData } from '@/lib/docx-generator'
import { userProfileStorage } from '@/lib/supabase/userProfileStorage'
import AIEditChatModal from './AIEditChatModal'

interface MotionOutputProps {
  motion: string
  motionType: string
  onNewMotion: () => void
  caseData?: CaseFrontend | null
  isTrialMode?: boolean
}

export default function MotionOutput({ motion, motionType, onNewMotion, caseData, isTrialMode = false }: MotionOutputProps) {
  const [copied, setCopied] = useState(false)
  const [sections, setSections] = useState<MotionSection[]>([])
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // AI Edit Modal state
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<MotionSection | null>(null)

  // State for saving
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load saved sections or parse from motion
  useEffect(() => {
    // Check if there's an existing motion document of this type
    const existingMotion = caseData?.motionDocuments?.find(m => m.motionType === motionType)
    
    if (existingMotion?.sections && existingMotion.sections.length > 0) {
      setSections(existingMotion.sections)
    } else if (motion) {
      const parsedSections = parseMotionIntoSections(motion)
      setSections(parsedSections)
    }
  }, [motion, caseData?.motionDocuments, motionType])

  // Auto-resize textarea helper
  const autoResizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  // Parse motion text into structured sections
  const parseMotionIntoSections = (text: string): MotionSection[] => {
    const cleanedText = cleanMotionText(text)
    const lines = cleanedText.split('\n')
    
    const result: MotionSection[] = []
    let currentSection: { id: string; title: string; lines: string[]; type: MotionSection['type'] } | null = null
    let sectionId = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const cleanLine = line.replace(/\*+/g, '').replace(/_+/g, '').replace(/#+/g, '').trim()

      // Detect section headers
      if (cleanLine.match(/^NOTICE\s+OF\s+MOTION/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Notice of Motion', lines: [lines[i]], type: 'notice' }
      }
      else if (cleanLine.match(/^MEMORANDUM\s+OF\s+POINTS\s+AND\s+AUTHORITIES/i) || 
               cleanLine.match(/^POINTS\s+AND\s+AUTHORITIES/i) ||
               cleanLine.match(/^MEMO(RANDUM)?\s+P\s*&\s*A/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Memorandum of Points and Authorities', lines: [lines[i]], type: 'memorandum' }
      }
      else if (cleanLine.match(/^I\.\s*INTRODUCTION/i) || cleanLine.match(/^INTRODUCTION/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Introduction', lines: [lines[i]], type: 'introduction' }
      }
      else if (cleanLine.match(/^II\.\s*STATEMENT\s+OF\s+FACTS/i) || 
               cleanLine.match(/^STATEMENT\s+OF\s+FACTS/i) ||
               cleanLine.match(/^FACTUAL\s+BACKGROUND/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Statement of Facts', lines: [lines[i]], type: 'statement-of-facts' }
      }
      else if (cleanLine.match(/^III\.\s*(LEGAL\s+)?ARGUMENT/i) || 
               cleanLine.match(/^(LEGAL\s+)?ARGUMENT/i) ||
               cleanLine.match(/^LEGAL\s+ANALYSIS/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Legal Argument', lines: [lines[i]], type: 'legal-argument' }
      }
      else if (cleanLine.match(/^[A-Z]\.\s+[A-Z]/i) && cleanLine.length > 5) {
        // Point heading (A., B., C., etc.)
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: cleanLine, lines: [lines[i]], type: 'point-heading' }
      }
      else if (cleanLine.match(/^IV\.\s*CONCLUSION/i) || cleanLine.match(/^CONCLUSION/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Conclusion', lines: [lines[i]], type: 'conclusion' }
      }
      else if (cleanLine.match(/^DECLARATION/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Declaration', lines: [lines[i]], type: 'declaration' }
      }
      else if (cleanLine.match(/^PROOF\s+OF\s+SERVICE/i)) {
        if (currentSection) {
          result.push(createSection(sectionId++, currentSection))
        }
        currentSection = { id: String(sectionId), title: 'Proof of Service', lines: [lines[i]], type: 'proof-of-service' }
      }
      else if (currentSection) {
        currentSection.lines.push(lines[i])
      }
      else {
        // Start with caption/header
        if (!currentSection) {
          currentSection = { id: String(sectionId), title: 'Caption', lines: [lines[i]], type: 'caption' }
        }
      }
    }

    // Add final section
    if (currentSection) {
      result.push(createSection(sectionId++, currentSection))
    }

    return result
  }

  const createSection = (id: number, section: { title: string; lines: string[]; type: MotionSection['type'] }): MotionSection => ({
    id: String(id),
    title: section.title,
    content: section.lines.join('\n'),
    isExpanded: true,
    type: section.type,
  })

  const cleanMotionText = (text: string) => {
    return text
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/```\s*$/m, '')
      .trim()
  }

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s))
  }

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id))
  }

  const addSection = () => {
    const newId = String(Date.now())
    setSections(prev => [...prev, {
      id: newId,
      title: 'New Section',
      content: '',
      isExpanded: true,
      type: 'standard'
    }])
  }

  const getFullMotion = () => {
    return sections.map(s => s.content).join('\n\n')
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      setSections(prev => {
        const newSections = [...prev]
        const [draggedSection] = newSections.splice(draggedIndex, 1)
        newSections.splice(dropIndex, 0, draggedSection)
        return newSections
      })
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  // Save draft to Supabase
  const handleSaveDraft = async () => {
    if (!caseData?.id) {
      setSaveError('No case selected. Please access this page from the case dashboard.')
      setTimeout(() => setSaveError(null), 5000)
      return
    }

    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      // Create or update motion document
      const motionDoc: MotionDocument = {
        id: `motion_${motionType}_${Date.now()}`,
        motionType,
        title: getMotionTitle(motionType),
        sections,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
      }

      // Get existing motion documents or initialize empty array
      const existingMotions = caseData.motionDocuments || []
      
      // Replace existing motion of same type or add new
      const motionIndex = existingMotions.findIndex(m => m.motionType === motionType)
      let updatedMotions: MotionDocument[]
      
      if (motionIndex >= 0) {
        updatedMotions = [...existingMotions]
        updatedMotions[motionIndex] = { ...existingMotions[motionIndex], ...motionDoc, updatedAt: new Date().toISOString() }
      } else {
        updatedMotions = [...existingMotions, motionDoc]
      }

      const result = await supabaseCaseStorage.updateCase(caseData.id, {
        motionDocuments: updatedMotions,
      })

      if (result) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        setSaveError('Failed to save draft. Please try again.')
        setTimeout(() => setSaveError(null), 5000)
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      setSaveError('An error occurred while saving. Please try again.')
      setTimeout(() => setSaveError(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  const getMotionTitle = (type: string): string => {
    const titles: Record<string, string> = {
      'motion-to-compel-discovery': 'Motion to Compel Discovery',
      'motion-to-compel-deposition': 'Motion to Compel Deposition',
      'demurrer': 'Demurrer',
      'motion-to-strike': 'Motion to Strike',
      'motion-for-summary-judgment': 'Motion for Summary Judgment',
      'motion-for-summary-adjudication': 'Motion for Summary Adjudication',
      'motion-in-limine': 'Motion in Limine',
      'motion-for-protective-order': 'Motion for Protective Order',
      'motion-to-quash-subpoena': 'Motion to Quash Subpoena',
      'motion-for-sanctions': 'Motion for Sanctions',
      'ex-parte-application': 'Ex Parte Application',
      'opposition': 'Opposition',
      'reply': 'Reply Brief',
    }
    return titles[type] || 'Motion'
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullMotion())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownloadWord = async () => {
    try {
      const profile = await userProfileStorage.getProfile()
      const cleanedMotion = cleanMotionText(getFullMotion())
      
      const plaintiffName = caseData?.plaintiffs?.map(p => p.name).filter(Boolean).join(', ') || '[PLAINTIFF]'
      const defendantName = caseData?.defendants?.map(d => d.name).filter(Boolean).join(', ') || '[DEFENDANT]'
      
      const motionData: MotionData = {
        motionType,
        plaintiffName,
        defendantName,
        motionText: cleanedMotion,
        attorneyName: profile?.fullName || undefined,
        stateBarNumber: profile?.barNumber || undefined,
        email: profile?.firmEmail || undefined,
        lawFirmName: profile?.firmName || undefined,
        address: profile?.firmAddress || undefined,
        phone: profile?.firmPhone || undefined,
        county: caseData?.courtCounty || 'LOS ANGELES',
        caseNumber: caseData?.caseNumber || undefined,
      }
      
      await downloadMotionDocument(motionData)
    } catch (err) {
      console.error('Failed to generate Word document:', err)
      alert('Failed to generate Word document. Please try copying the text instead.')
    }
  }

  // AI Edit handlers
  const handleOpenAIChat = (section: MotionSection) => {
    setEditingSection(section)
    setAiChatOpen(true)
  }

  const handleApplyAIEdit = (newContent: string) => {
    if (editingSection) {
      updateSection(editingSection.id, 'content', newContent)
    }
  }

  // Get section badge color based on type
  const getSectionBadge = (type: MotionSection['type']) => {
    switch (type) {
      case 'caption':
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Caption' }
      case 'notice':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Notice' }
      case 'memorandum':
        return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Memo P&A' }
      case 'introduction':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Introduction' }
      case 'statement-of-facts':
        return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Facts' }
      case 'legal-argument':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Argument' }
      case 'point-heading':
        return { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Point' }
      case 'conclusion':
        return { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Conclusion' }
      case 'declaration':
        return { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Declaration' }
      case 'proof-of-service':
        return { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Proof of Service' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Section' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="glass p-6 rounded-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Generated Motion</h2>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {getMotionTitle(motionType)}
            </span>
          </div>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="text-sm">{copied ? 'Copied!' : 'Copy All'}</span>
            </button>
            {/* Save Draft Button - Only for authenticated users */}
            {!isTrialMode && (
              <button
                onClick={handleSaveDraft}
                disabled={saving || !caseData?.id}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-semibold transition-all duration-300 ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                } ${!caseData?.id 
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200' 
                  : saveSuccess 
                    ? 'bg-green-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                title={!caseData?.id ? 'Access from case dashboard to enable saving' : 'Save your draft'}
              >
                {saving ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm">Saving...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span className="text-sm">Save Draft</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleDownloadWord}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FileIcon className="w-4 h-4" />
              <span className="text-sm">Download Word</span>
            </button>
            <button
              onClick={onNewMotion}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">New Motion</span>
            </button>
          </div>
        </div>

        {/* Save Error Message - Only for authenticated users */}
        {!isTrialMode && saveError && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-800 text-sm font-medium">{saveError}</span>
            </div>
          </div>
        )}

        {/* Success Message */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">Motion generated successfully!</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Edit each section below. Drag and drop to reorder sections.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
        <span className="text-gray-600 text-sm font-medium">Motion Sections</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
      </div>

      {/* Section Cards - Drag and Drop */}
      <div className="flex flex-col gap-6">
        {sections.map((section, index) => {
          const badge = getSectionBadge(section.type)
          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 relative cursor-move ${
                draggedIndex === index ? 'opacity-50 scale-95' : ''
              } ${
                dragOverIndex === index && draggedIndex !== index ? 'border-2 border-blue-500 border-dashed scale-105' : ''
              }`}
            >
              {/* Section Header */}
              <div className="flex justify-between items-start mb-4 gap-3">
                {/* Drag Handle */}
                <div className="text-gray-400 hover:text-gray-600 transition-colors flex items-center pt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
                
                {/* Collapse Toggle */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {section.isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                
                {/* Title Input */}
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                  className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1 placeholder-gray-400"
                  placeholder="Section Title"
                />
                
                {/* Badge */}
                <span className={`px-3 py-1 ${badge.bg} ${badge.text} text-sm font-medium rounded-full whitespace-nowrap`}>
                  {badge.label}
                </span>
                
                {/* Remove Button */}
                {sections.length > 1 && (
                  <button
                    onClick={() => removeSection(section.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    aria-label="Remove section"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Section Content */}
              {section.isExpanded && (
                <div className="relative">
                  <textarea
                    value={section.content}
                    onChange={(e) => {
                      updateSection(section.id, 'content', e.target.value)
                      autoResizeTextarea(e.target)
                    }}
                    onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
                    ref={(textarea) => {
                      if (textarea) {
                        autoResizeTextarea(textarea)
                      }
                    }}
                    className="w-full min-h-48 p-4 pr-14 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-hidden"
                    placeholder="Enter section content here..."
                  />
                  {/* AI Edit Chat Button */}
                  <button
                    onClick={() => handleOpenAIChat(section)}
                    disabled={!caseData?.id}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-purple-800 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${
                      !caseData?.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label="AI Edit Assistant"
                    title={caseData?.id ? 'Open AI Edit Assistant' : 'Access from case dashboard to enable AI editing'}
                  >
                    <svg 
                      className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                      <path d="M6 4L6.5 6.5L9 7L6.5 7.5L6 10L5.5 7.5L3 7L5.5 6.5L6 4Z" />
                      <path d="M18 14L18.5 16.5L21 17L18.5 17.5L18 20L17.5 17.5L15 17L17.5 16.5L18 14Z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Section Button */}
      <div className="flex justify-center">
        <button
          onClick={addSection}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          + Add Section
        </button>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-medium text-amber-800 mb-2">⚠️ Legal Disclaimer</h4>
        <p className="text-amber-800 text-sm">
          This document is AI-generated and should be reviewed by a qualified attorney before filing. 
          The content may require modifications to meet specific jurisdictional requirements, local rules, 
          and case-specific details. Always verify citations and legal arguments.
        </p>
      </div>

      {/* AI Edit Chat Modal */}
      <AIEditChatModal
        isOpen={aiChatOpen}
        onClose={() => {
          setAiChatOpen(false)
          setEditingSection(null)
        }}
        sectionId={editingSection?.id || ''}
        sectionTitle={editingSection?.title || ''}
        currentContent={editingSection?.content || ''}
        caseFacts={caseData?.facts || ''}
        caseId={caseData?.id || ''}
        parties={{
          client: caseData?.client,
          plaintiffs: caseData?.plaintiffs,
          defendants: caseData?.defendants
        }}
        onApplyEdit={handleApplyAIEdit}
        documentType="motion"
      />
    </div>
  )
}


