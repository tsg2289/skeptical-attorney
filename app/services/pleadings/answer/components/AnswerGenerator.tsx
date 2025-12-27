'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Scale, Users, Copy, Download, FileDown, Plus, X, Edit2, Save, RotateCcw, GripVertical, Sparkles, Eye, Check, ChevronDown, ChevronUp, CheckCircle, Folder, FolderPlus } from 'lucide-react'
import { DocumentCategory, DOCUMENT_CATEGORIES } from '@/lib/supabase/documentStorage'
import { aiDocumentStorage } from '@/lib/supabase/aiDocumentStorage'
import toast from 'react-hot-toast'
import { downloadWordDocument as generateWordDoc } from '@/lib/docx-generator'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabaseCaseStorage, AnswerSections, AnswerDefense, CaseFrontend } from '@/lib/supabase/caseStorage'
import { createClient } from '@/lib/supabase/client'
import { userProfileStorage } from '@/lib/supabase/userProfileStorage'
import AnswerPreviewModal from './AnswerPreviewModal'
import AIEditChatModal from './AIEditChatModal'
import CaseCaptionCard, { CaseCaptionData } from '../../complaint/components/CaseCaptionCard'

// Type alias for backward compatibility in this file
type Defense = AnswerDefense

// Document interface for AI generation
interface CaseDocumentForAI {
  id: string;
  fileName: string;
  category: DocumentCategory;
  extractionStatus: 'pending' | 'completed' | 'failed' | 'not_applicable';
  hasExtractedText: boolean;
}

// Parse the generated answer into sections
function parseAnswer(answer: string): AnswerSections {
  const sections: AnswerSections = {
    preamble: '',
    defenses: [],
    prayer: '',
    signature: '',
    aiAnalysis: '',
  }

  // Pattern to match defense headers (FIRST, SECOND, THIRD, etc. up to THIRTIETH)
  const defensePattern = /(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH|SIXTEENTH|SEVENTEENTH|EIGHTEENTH|NINETEENTH|TWENTIETH|TWENTY-FIRST|TWENTY-SECOND|TWENTY-THIRD|TWENTY-FOURTH|TWENTY-FIFTH|TWENTY-SIXTH|TWENTY-SEVENTH|TWENTY-EIGHTH|TWENTY-NINTH|THIRTIETH)\s+AFFIRMATIVE\s+DEFENSE/gi
  
  // Find all defense matches
  const matches = [...answer.matchAll(defensePattern)]
  
  if (matches.length === 0) {
    // If no defenses found, treat entire answer as preamble
    sections.preamble = answer
    return sections
  }

  // Extract preamble (everything before first defense)
  sections.preamble = answer.substring(0, matches[0].index).trim()

  // Extract each defense
  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index!
    const endIndex = i < matches.length - 1 ? matches[i + 1].index! : answer.length
    
    const defenseText = answer.substring(startIndex, endIndex).trim()
    const lines = defenseText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    const number = matches[i][1]
    let causesOfAction = ''
    let title = ''
    let content = ''
    
    // Get all content after defense header
    const contentAfterHeader = lines.slice(1).join('\n').trim()
    const contentLines = contentAfterHeader.split('\n').map(line => line.trim())
    
    // Extract "To All Causes of Action" and title from parenthetical lines
    for (let j = 0; j < contentLines.length; j++) {
      const line = contentLines[j]
      if (line.startsWith('(') && line.endsWith(')')) {
        // Check if it's "To All Causes of Action"
        if (line.toLowerCase().includes('to all causes of action')) {
          causesOfAction = line.replace(/[()]/g, '').trim()
          continue
        }
        // This is the title
        if (!title) {
          title = line.replace(/[()]/g, '').trim()
        }
      }
    }
    
    // Remove both "To All Causes of Action" and title lines from content
    content = contentLines
      .filter(line => {
        if (line.startsWith('(') && line.endsWith(')')) {
          const lineLower = line.toLowerCase()
          return !lineLower.includes('to all causes of action') && line.replace(/[()]/g, '').trim() !== title
        }
        return true
      })
      .join('\n')
      .trim()
    
    // If no content after removing parenthetical lines, use all content
    if (!content) {
      content = contentAfterHeader
    }
    
    sections.defenses.push({
      id: `defense-${i}`,
      number,
      causesOfAction,
      title,
      content,
      fullText: defenseText,
    })
  }

  // Extract prayer (everything after last defense)
  const lastDefenseEnd = matches[matches.length - 1].index! + matches[matches.length - 1][0].length
  
  // Extract AI Analysis section first (separated by "---")
  let afterLastDefense = answer.substring(lastDefenseEnd).trim()
  const aiAnalysisMatch = answer.match(/---\s*\n?\s*AI ANALYSIS AND SUGGESTIONS:\s*\n?([\s\S]*?)(?:\s*---|$)/i)
  if (aiAnalysisMatch) {
    sections.aiAnalysis = aiAnalysisMatch[1].trim()
    // Remove AI analysis section from the answer text
    const aiStart = answer.indexOf(aiAnalysisMatch[0])
    if (aiStart !== -1) {
      afterLastDefense = answer.substring(lastDefenseEnd, aiStart).trim()
    }
  }
  
  // Check if there's a "WHEREFORE" pattern for prayer
  let prayerText = ''
  let signatureText = ''
  const prayerMatch = afterLastDefense.match(/WHEREFORE/i)
  if (prayerMatch) {
    const fullPrayerText = afterLastDefense.substring(prayerMatch.index!).trim()
    
    // Extract signature block (everything after "Dated:")
    const datedIndex = fullPrayerText.indexOf('Dated:')
    if (datedIndex !== -1) {
      prayerText = fullPrayerText.substring(0, datedIndex).trim()
      signatureText = fullPrayerText.substring(datedIndex).trim()
      
      // Remove "---" separators from signature
      signatureText = signatureText.replace(/---+/g, '').trim()
      
      // Remove AI analysis if it somehow got into signature
      const aiInSignature = signatureText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
      if (aiInSignature !== -1) {
        signatureText = signatureText.substring(0, aiInSignature).trim()
      }
    } else {
      prayerText = fullPrayerText
    }
    
    // Remove any remaining "---" separators from prayer
    prayerText = prayerText.replace(/---+/g, '').trim()
    
    // Remove AI analysis if it somehow got into prayer
    const aiInPrayer = prayerText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
    if (aiInPrayer !== -1) {
      prayerText = prayerText.substring(0, aiInPrayer).trim()
    }

    // Also remove prayer from last defense content if it got included there
    const lastDefense = sections.defenses[sections.defenses.length - 1]
    if (lastDefense && lastDefense.content.includes('WHEREFORE')) {
      const prayerStart = lastDefense.content.indexOf('WHEREFORE')
      lastDefense.content = lastDefense.content.substring(0, prayerStart).trim()
      lastDefense.fullText = `${lastDefense.number} AFFIRMATIVE DEFENSE${lastDefense.causesOfAction ? `\n(${lastDefense.causesOfAction})` : ''}${lastDefense.title ? `\n(${lastDefense.title})` : ''}\n${lastDefense.content}`
    }
  } else {
    // Check if prayer content is in the last defense
    const lastDefense = sections.defenses[sections.defenses.length - 1]
    if (lastDefense.content.includes('WHEREFORE')) {
      const prayerStart = lastDefense.content.indexOf('WHEREFORE')
      const fullPrayerText = lastDefense.content.substring(prayerStart).trim()
      
      // Extract signature block
      const datedIndex = fullPrayerText.indexOf('Dated:')
      if (datedIndex !== -1) {
        prayerText = fullPrayerText.substring(0, datedIndex).trim()
        signatureText = fullPrayerText.substring(datedIndex).trim()
        
        // Remove "---" separators from signature
        signatureText = signatureText.replace(/---+/g, '').trim()
        
        // Remove AI analysis if present
        const aiInSignature = signatureText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
        if (aiInSignature !== -1) {
          signatureText = signatureText.substring(0, aiInSignature).trim()
        }
      } else {
        prayerText = fullPrayerText
      }
      
      // Remove any "---" separators from prayer
      prayerText = prayerText.replace(/---+/g, '').trim()
      
      // Remove AI analysis if present
      const aiInPrayer = prayerText.indexOf('AI ANALYSIS AND SUGGESTIONS:')
      if (aiInPrayer !== -1) {
        prayerText = prayerText.substring(0, aiInPrayer).trim()
      }
      
      lastDefense.content = lastDefense.content.substring(0, prayerStart).trim()
      lastDefense.fullText = `${lastDefense.number} AFFIRMATIVE DEFENSE\n${lastDefense.title ? `(${lastDefense.title})\n` : ''}${lastDefense.content}`
    }
  }
  
  // Also clean up any defense content that might have this text
  sections.defenses.forEach(defense => {
    // Remove attorney signature block from defense content
    if (defense.content.includes('Dated:')) {
      const datedIndex = defense.content.indexOf('Dated:')
      defense.content = defense.content.substring(0, datedIndex).trim()
      defense.fullText = `${defense.number} AFFIRMATIVE DEFENSE${defense.causesOfAction ? `\n(${defense.causesOfAction})` : ''}${defense.title ? `\n(${defense.title})` : ''}\n${defense.content}`
    }
    
    // Remove "---" separators from defense content
    defense.content = defense.content.replace(/---+/g, '').trim()
    
    // Remove AI analysis from defense content
    const aiInDefense = defense.content.indexOf('AI ANALYSIS AND SUGGESTIONS:')
    if (aiInDefense !== -1) {
      defense.content = defense.content.substring(0, aiInDefense).trim()
      defense.fullText = `${defense.number} AFFIRMATIVE DEFENSE${defense.causesOfAction ? `\n(${defense.causesOfAction})` : ''}${defense.title ? `\n(${defense.title})` : ''}\n${defense.content}`
    }
  })
  
  sections.prayer = prayerText
  sections.signature = signatureText

  return sections
}

// Parse bullet-point format suggestions from AI (e.g., "- **Fair Use**: Description...")
function parseBulletPointSuggestions(text: string): Defense[] {
  const defenses: Defense[] = []
  
  // Match patterns like:
  // - **Title**: Content
  // * **Title**: Content  
  // **Title**: Content
  const lines = text.split('\n')
  let index = 0
  
  for (const line of lines) {
    // Match: - **Title**: Content or * **Title**: Content or **Title**: Content
    const match = line.match(/^[\-\*•]?\s*\*\*([^*]+)\*\*\s*:\s*(.+)$/)
    if (match) {
      const title = match[1].trim()
      const content = match[2].trim()
      
      if (title && content && content.length > 10) {
        defenses.push({
          id: `suggestion-${index}`,
          number: '',
          causesOfAction: 'To All Causes of Action',
          title: title,
          content: content,
          fullText: `(To All Causes of Action)\n(${title})\n${content}`,
        })
        index++
      }
    }
  }
  
  return defenses
}

// Reconstruct full answer from sections
function reconstructAnswer(sections: AnswerSections): string {
  const defensesText = sections.defenses
    .map(def => def.fullText)
    .join('\n\n')
  
  return [
    sections.preamble,
    defensesText,
    sections.prayer,
  ]
    .filter(Boolean)
    .join('\n\n')
}

// Helper function to get ordinal number from index
function getOrdinalNumber(index: number): string {
  const ordinals = [
    'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 
    'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 
    'FIFTEENTH', 'SIXTEENTH', 'SEVENTEENTH', 'EIGHTEENTH', 'NINETEENTH', 'TWENTIETH',
    'TWENTY-FIRST', 'TWENTY-SECOND', 'TWENTY-THIRD', 'TWENTY-FOURTH', 'TWENTY-FIFTH',
    'TWENTY-SIXTH', 'TWENTY-SEVENTH', 'TWENTY-EIGHTH', 'TWENTY-NINTH', 'THIRTIETH'
  ]
  return ordinals[index] || `${index + 1}TH`
}

// Sortable Defense Card Component - Matching Complaint/Demand UI Pattern
function SortableDefenseCard({ defense, onDelete, onUpdate, onAIEdit }: {
  defense: Defense
  onDelete: (defenseId: string) => void
  onUpdate: (defenseId: string, field: string, value: string) => void
  onAIEdit: (defense: Defense) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: defense.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Auto-resize textarea
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = textarea.scrollHeight + 'px'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 relative cursor-move"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4 gap-3">
        {/* Drag Handle - Left side with two lines */}
        <div 
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 transition-colors flex items-center pt-1 cursor-grab active:cursor-grabbing"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>
        
        {/* Title and Defense Number - Display Only */}
        <div className="flex-1 space-y-2">
          <h4 className="text-xl font-bold text-primary-700">
            {defense.number} AFFIRMATIVE DEFENSE
          </h4>
          <input
            type="text"
            value={defense.title || ''}
            onChange={(e) => onUpdate(defense.id, 'title', e.target.value)}
            className="w-full text-sm text-gray-600 bg-transparent border-none outline-none placeholder-gray-400 italic"
            placeholder="Defense Title (e.g., Statute of Limitations)"
          />
          <input
            type="text"
            value={defense.causesOfAction || ''}
            onChange={(e) => onUpdate(defense.id, 'causesOfAction', e.target.value)}
            className="w-full text-sm text-gray-500 bg-transparent border-none outline-none placeholder-gray-400"
            placeholder="Causes of Action Applied (e.g., As to All Causes of Action)"
          />
        </div>
        
        {/* Delete Button - Gray X in top right */}
        <button
          onClick={() => onDelete(defense.id)}
          className="text-gray-400 hover:text-red-600 transition-colors p-1"
          aria-label="Remove defense"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content - Always editable textarea */}
      <div className="relative">
        <textarea
          value={defense.content}
          onChange={(e) => {
            onUpdate(defense.id, 'content', e.target.value)
            autoResizeTextarea(e.target)
          }}
          onInput={(e) => autoResizeTextarea(e.target as HTMLTextAreaElement)}
          ref={(textarea) => {
            if (textarea) {
              autoResizeTextarea(textarea)
            }
          }}
          className="w-full min-h-24 p-4 pr-14 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-hidden"
          placeholder="Enter defense content here..."
        />
        {/* AI Edit Button - Bottom right of content */}
        <button
          onClick={() => onAIEdit(defense)}
          className="absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
          aria-label="AI Edit Assistant"
          title="Open AI Edit Assistant"
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
    </div>
  )
}

interface AnswerGeneratorProps {
  caseId?: string | null
  isTrialMode?: boolean
}

export default function AnswerGenerator({ caseId, isTrialMode = false }: AnswerGeneratorProps) {
  const [formData, setFormData] = useState({
    plaintiffName: '',
    defendantName: '',
    complaintText: '',
    isMultipleDefendants: false,
    // Attorney/Firm Information
    attorneyName: '',
    stateBarNumber: '',
    attorneyEmail: '',
    lawFirmName: '',
    addressLine1: '',
    addressLine2: '',
    phone: '',
    fax: '',
    // Court Information
    county: '',
    courtDistrict: '',
    caseNumber: '',
    judgeName: '',
    department: '',
    actionFiled: '',
    trialDate: '',
    // Document Options
    useGeneralDenial: true,
  })
  const [generatedAnswer, setGeneratedAnswer] = useState('')
  const [answerSections, setAnswerSections] = useState<AnswerSections | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showAddDefense, setShowAddDefense] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savingToRepo, setSavingToRepo] = useState(false)
  const [repoSaveSuccess, setRepoSaveSuccess] = useState(false)
  const [newDefense, setNewDefense] = useState({
    number: '',
    causesOfAction: '',
    title: '',
    content: ''
  })
  const [editingDefenseId, setEditingDefenseId] = useState<string | null>(null)
  const [editingDefense, setEditingDefense] = useState({
    number: '',
    causesOfAction: '',
    title: '',
    content: ''
  })

  // State for AI Edit modal
  const [showAIEdit, setShowAIEdit] = useState(false)
  const [aiEditSection, setAIEditSection] = useState<{
    id: string
    title: string
    content: string
  } | null>(null)
  
  // State for parties data (for AI modal)
  const [partiesData, setPartiesData] = useState<{
    plaintiffs?: { name: string }[]
    defendants?: { name: string }[]
  }>({})

  // State for case data reference
  const [caseData, setCaseData] = useState<CaseFrontend | null>(null)

  // State for caption data (attorney header, like complaint)
  const [captionData, setCaptionData] = useState<Partial<CaseCaptionData>>({
    attorneys: [],
    plaintiffs: [],
    defendants: [],
    includeDoes: true,
    county: 'Los Angeles',
    caseNumber: '',
    judgeName: '',
    departmentNumber: '',
    documentType: 'ANSWER TO COMPLAINT',
    demandJuryTrial: false,
    complaintFiledDate: '',
    trialDate: '',
  })

  // Ref for debouncing caption saves
  const saveCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // State for proof of service
  const [showProofOfService, setShowProofOfService] = useState(false)

  // Document selection for AI generation
  const [caseDocuments, setCaseDocuments] = useState<CaseDocumentForAI[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [showDocumentSelector, setShowDocumentSelector] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  // Handler for CaseCaptionCard changes
  const handleCaptionChange = useCallback((newCaptionData: CaseCaptionData) => {
    setCaptionData(newCaptionData)
    
    // SYNC parties to formData for preamble generation
    const plaintiffNames = newCaptionData.plaintiffs?.filter(Boolean).join(', ') || ''
    const defendantNames = newCaptionData.defendants?.filter(Boolean).join(', ') || ''
    const hasMultipleDefendants = (newCaptionData.defendants?.filter(Boolean).length || 0) > 1
    
    setFormData(prev => ({
      ...prev,
      plaintiffName: plaintiffNames,
      defendantName: defendantNames,
      isMultipleDefendants: hasMultipleDefendants,
    }))
    
    // Update parties data for AI modal
    setPartiesData({
      plaintiffs: newCaptionData.plaintiffs?.filter(Boolean).map(name => ({ name })) || [],
      defendants: newCaptionData.defendants?.filter(Boolean).map(name => ({ name })) || [],
    })
    
    // Debounced auto-save to case if we have a caseId
    if (caseId && caseData) {
      if (saveCaptionTimeoutRef.current) {
        clearTimeout(saveCaptionTimeoutRef.current)
      }
      saveCaptionTimeoutRef.current = setTimeout(async () => {
        try {
          await supabaseCaseStorage.updateCase(caseId, {
            judgeName: newCaptionData.judgeName,
            departmentNumber: newCaptionData.departmentNumber,
            courtCounty: newCaptionData.county,
          })
        } catch (error) {
          console.error('Error auto-saving caption:', error)
        }
      }, 1000)
    }
  }, [caseId, caseData])

  // Populate form data from case if caseId is provided
  useEffect(() => {
    const loadCase = async () => {
      if (caseId) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const foundCase = await supabaseCaseStorage.getCase(caseId)
          if (foundCase) {
            console.log(`[AUDIT] Answer generator initialized for case: ${caseId}`)
            
            // Store case data reference
            setCaseData(foundCase)
            
            // Get plaintiff names
            const plaintiffs = foundCase.plaintiffs || []
            const plaintiffNames = plaintiffs
              .map(p => p.name)
              .filter(Boolean)
              .join(', ') || ''
            
            // Get defendant names
            const defendants = foundCase.defendants || []
            const defendantNames = defendants
              .map(d => d.name)
              .filter(Boolean)
              .join(', ') || ''
            
            // AUTO-DETECT multiple defendants
            const hasMultipleDefendants = defendants.length > 1
            
            // Get defendant's attorney info (first attorney of first defendant)
            const defendantAttorney = defendants[0]?.attorneys?.[0]
            
            // Store parties data for AI modal
            setPartiesData({
              plaintiffs: plaintiffs.map(p => ({ name: p.name })),
              defendants: defendants.map(d => ({ name: d.name })),
            })
            
            // Extract all attorneys from all defendants (for caption card)
            const allDefendantAttorneys = defendants.flatMap(d => 
              d.attorneys?.map(att => ({
                id: att.id || String(Date.now()),
                name: att.name || '',
                barNumber: att.barNumber || '',
                firm: att.firm || '',
                address: att.address || '',
                phone: att.phone || '',
                fax: '',
                email: att.email || '',
              })) || []
            )
            
            // Populate caption data from case
            setCaptionData(prev => ({
              ...prev,
              attorneys: allDefendantAttorneys.length > 0 ? allDefendantAttorneys : prev.attorneys,
              plaintiffs: plaintiffs.map(p => p.name).filter(Boolean),
              defendants: defendants.map(d => d.name).filter(Boolean),
              includeDoes: foundCase.includeDoes ?? true,
              county: foundCase.courtCounty || foundCase.court || 'Los Angeles',
              caseNumber: foundCase.caseNumber || '',
              judgeName: foundCase.judgeName || '',
              departmentNumber: foundCase.departmentNumber || '',
              documentType: 'ANSWER TO COMPLAINT',
              complaintFiledDate: foundCase.complaintFiledDate || '',
              trialDate: foundCase.trialDate || '',
            }))
            
            // Populate form with case data including auto-detected multiple defendants
            setFormData(prev => ({
              ...prev,
              plaintiffName: plaintiffNames,
              defendantName: defendantNames,
              isMultipleDefendants: hasMultipleDefendants, // Auto-detect!
              caseNumber: foundCase.caseNumber || '',
              county: foundCase.courtCounty || '',
              judgeName: foundCase.judgeName || '',
              department: foundCase.departmentNumber || '',
              // Attorney info from defendant's counsel
              attorneyName: defendantAttorney?.name || '',
              stateBarNumber: defendantAttorney?.barNumber || '',
              attorneyEmail: defendantAttorney?.email || '',
              lawFirmName: defendantAttorney?.firm || '',
              addressLine1: defendantAttorney?.address || '',
              phone: defendantAttorney?.phone || '',
            }))
            
            // Load saved answer sections if they exist
            if (foundCase.answerSections && foundCase.answerSections.defenses && foundCase.answerSections.defenses.length > 0) {
              // Clean up any prayer content from defenses (it's already in the prayer field)
              const cleanedSections = {
                ...foundCase.answerSections,
                defenses: foundCase.answerSections.defenses.map(defense => {
                  let content = defense.content
                  // Remove prayer if it's in the defense content
                  if (content.includes('WHEREFORE')) {
                    content = content.substring(0, content.indexOf('WHEREFORE')).trim()
                  }
                  return {
                    ...defense,
                    content
                  }
                })
              }
              setAnswerSections(cleanedSections)
              const fullAnswer = reconstructAnswer(cleanedSections)
              setGeneratedAnswer(fullAnswer)
              toast.success('Loaded saved answer draft')
            }
          }
        }
      }
    }
    
    loadCase()
  }, [caseId])

  // Fetch documents for the current case
  const fetchCaseDocuments = async (targetCaseId: string) => {
    if (!targetCaseId) return
    setLoadingDocuments(true)
    try {
      const response = await fetch(`/api/documents?caseId=${targetCaseId}`)
      if (response.ok) {
        const data = await response.json()
        // Filter to only show documents with extracted text (usable for AI)
        const docsWithText = (data.documents || []).filter(
          (doc: any) => doc.extractionStatus === 'completed' && doc.hasExtractedText
        )
        setCaseDocuments(docsWithText)
      }
    } catch (error) {
      console.error('Error fetching case documents:', error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  // Load documents when case is available
  useEffect(() => {
    if (caseId && !isTrialMode) {
      fetchCaseDocuments(caseId)
    }
  }, [caseId, isTrialMode])

  // Load user profile on mount to pre-populate attorney info
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await userProfileStorage.getProfile()
        if (profile) {
          setFormData(prev => ({
            ...prev,
            attorneyName: prev.attorneyName || profile.fullName || '',
            lawFirmName: prev.lawFirmName || profile.firmName || '',
            stateBarNumber: prev.stateBarNumber || profile.barNumber || '',
            addressLine1: prev.addressLine1 || profile.firmAddress || '',
            phone: prev.phone || profile.firmPhone || '',
            attorneyEmail: prev.attorneyEmail || profile.firmEmail || '',
          }))
          
          // Also populate captionData with user profile if no case attorneys
          setCaptionData(prev => {
            // Only set if no attorneys already loaded from case
            if (!prev.attorneys || prev.attorneys.length === 0) {
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
    loadUserProfile()
  }, [])

  // Update full answer when defenses are reordered
  useEffect(() => {
    if (answerSections) {
      const fullAnswer = reconstructAnswer(answerSections)
      setGeneratedAnswer(fullAnswer)
    }
  }, [answerSections])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const generateAnswer = async () => {
    if (!formData.plaintiffName || !formData.defendantName || !formData.complaintText) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    try {
      // CRITICAL: Include caseId in API call for scoping
      const response = await fetch('/api/generate-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          caseId: caseId, // Explicitly scope to this case
          isMultipleDefendants: formData.isMultipleDefendants
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate answer')
      }

      const data = await response.json()
      const parsed = parseAnswer(data.answer)
      setAnswerSections(parsed)
      setGeneratedAnswer(data.answer)
      toast.success('Answer generated successfully!')
    } catch (error) {
      console.error('Error generating answer:', error)
      toast.error('Failed to generate answer. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedAnswer)
    toast.success('Answer copied to clipboard!')
  }

  const downloadAnswer = () => {
    const element = document.createElement('a')
    const file = new Blob([generatedAnswer], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `answer_${formData.defendantName}_${new Date().toLocaleDateString()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Answer downloaded as text!')
  }

  // Save answer draft to the case in Supabase
  const handleSaveDraft = async () => {
    if (!caseId) {
      toast.error('No case selected. Please access this page from the case dashboard.')
      return
    }

    if (!answerSections) {
      toast.error('No answer to save. Please generate an answer first.')
      return
    }

    setSaving(true)
    setSaveSuccess(false)

    try {
      const result = await supabaseCaseStorage.updateCase(caseId, {
        answerSections: answerSections,
      })

      if (result) {
        setSaveSuccess(true)
        toast.success('Answer draft saved!')
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        toast.error('Failed to save draft. Please try again.')
      }
    } catch (error) {
      console.error('Error saving answer draft:', error)
      toast.error('An error occurred while saving. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Save to AI Document Repository
  const handleSaveToRepository = async () => {
    if (!caseId) {
      toast.error('No case selected. Please access this page from the case dashboard.')
      return
    }

    if (!answerSections) {
      toast.error('No answer to save. Please generate an answer first.')
      return
    }

    if (isTrialMode) {
      toast.error('Saving to repository is disabled in trial mode.')
      return
    }

    setSavingToRepo(true)
    setRepoSaveSuccess(false)

    try {
      // Build document title
      const caseName = caseData?.caseName || 'Untitled Case'
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const title = `Answer - ${caseName} (${dateStr})`

      // Save to repository
      const result = await aiDocumentStorage.createDocument({
        caseId: caseId,
        documentType: 'answer',
        title,
        description: captionData?.caseNumber ? `Case No. ${captionData.caseNumber}` : undefined,
        content: {
          answerSections: answerSections,
          captionData: captionData,
          generatedAnswer: generatedAnswer,
        },
        status: 'draft',
      })

      if (result) {
        setRepoSaveSuccess(true)
        toast.success('Answer saved to repository!')
        console.log(`[AUDIT] Answer saved to repository for case: ${caseId}`)
        setTimeout(() => setRepoSaveSuccess(false), 3000)
      } else {
        toast.error('Failed to save to repository. Please try again.')
      }
    } catch (error) {
      console.error('Error saving to repository:', error)
      toast.error('An error occurred while saving to repository. Please try again.')
    } finally {
      setSavingToRepo(false)
    }
  }

  const downloadWordDoc = async () => {
    if (!generatedAnswer) {
      toast.error('No answer to download')
      return
    }

    try {
      // Prepare structured answer sections for better Word output
      const answerSectionsData = answerSections ? {
        preamble: answerSections.preamble || '',
        defenses: answerSections.defenses.map(def => ({
          number: def.number,
          causesOfAction: def.causesOfAction || undefined,
          title: def.title || undefined,
          content: def.content
        })),
        prayer: answerSections.prayer || '',
        signature: answerSections.signature || ''
      } : undefined

      await generateWordDoc({
        plaintiffName: formData.plaintiffName,
        defendantName: formData.defendantName,
        generatedAnswer: generatedAnswer,
        answerSections: answerSectionsData,
        isMultipleDefendants: formData.isMultipleDefendants,
        // Attorney/Firm Information
        attorneyName: formData.attorneyName || undefined,
        stateBarNumber: formData.stateBarNumber || undefined,
        email: formData.attorneyEmail || undefined,
        lawFirmName: formData.lawFirmName || undefined,
        addressLine1: formData.addressLine1 || undefined,
        addressLine2: formData.addressLine2 || undefined,
        phone: formData.phone || undefined,
        fax: formData.fax || undefined,
        // Court Information
        county: formData.county || undefined,
        courtDistrict: formData.courtDistrict || undefined,
        caseNumber: formData.caseNumber || undefined,
        judge: formData.judgeName || undefined,
        department: formData.department || undefined,
        actionFiled: formData.actionFiled || undefined,
        trialDate: formData.trialDate || undefined,
        // Document Options
        useGeneralDenial: formData.useGeneralDenial,
      })
      toast.success('Word document downloaded!')
    } catch (error) {
      console.error('Error downloading Word document:', error)
      toast.error('Failed to download Word document')
    }
  }

  const handleAddDefense = () => {
    if (!newDefense.number || !newDefense.content) {
      toast.error('Please fill in defense number and content')
      return
    }

    if (!answerSections) {
      toast.error('Please generate an answer first')
      return
    }

    const defenseNumber = newDefense.number.toUpperCase()
    
    // Build fullText with causesOfAction and title
    let fullText = `${defenseNumber} AFFIRMATIVE DEFENSE`
    if (newDefense.causesOfAction) {
      fullText += `\n(${newDefense.causesOfAction})`
    }
    if (newDefense.title) {
      fullText += `\n(${newDefense.title})`
    }
    fullText += `\n${newDefense.content}`

    const customDefense: Defense = {
      id: `defense-custom-${Date.now()}`,
      number: defenseNumber,
      causesOfAction: newDefense.causesOfAction,
      title: newDefense.title,
      content: newDefense.content,
      fullText: fullText,
    }

    setAnswerSections({
      ...answerSections,
      defenses: [...answerSections.defenses, customDefense],
    })

    setNewDefense({ number: '', causesOfAction: '', title: '', content: '' })
    setShowAddDefense(false)
    toast.success('Defense added successfully!')
  }

  const handleDeleteDefense = (defenseId: string) => {
    if (!answerSections) return

    setAnswerSections({
      ...answerSections,
      defenses: answerSections.defenses.filter(def => def.id !== defenseId),
    })
    toast.success('Defense removed!')
  }

  // Handler for inline field updates (new pattern matching complaint/demand UI)
  const handleUpdateDefenseField = (defenseId: string, field: string, value: string) => {
    if (!answerSections) return

    setAnswerSections({
      ...answerSections,
      defenses: answerSections.defenses.map(def => 
        def.id === defenseId 
          ? { ...def, [field]: value }
          : def
      ),
    })
  }

  const saveDefenseChanges = (defenseId: string, showToast: boolean = true) => {
    if (!answerSections || !editingDefense.number || !editingDefense.content) {
      if (showToast) {
        toast.error('Please fill in defense number and content')
      }
      return false
    }

    const defenseNumber = editingDefense.number.toUpperCase()
    
    // Remove any existing parenthetical lines from content
    let cleanContent = editingDefense.content
    const contentLines = cleanContent.split('\n').map(line => line.trim())
    // Remove all parenthetical lines (they'll be added back from causesOfAction and title)
    cleanContent = contentLines
      .filter(line => !(line.startsWith('(') && line.endsWith(')')))
      .join('\n')
      .trim()
    
    // Build finalContent with causesOfAction and title
    let finalContent = cleanContent
    if (editingDefense.causesOfAction || editingDefense.title) {
      const parts: string[] = []
      if (editingDefense.causesOfAction) {
        parts.push(`(${editingDefense.causesOfAction})`)
      }
      if (editingDefense.title) {
        parts.push(`(${editingDefense.title})`)
      }
      finalContent = parts.join('\n') + '\n' + cleanContent
    }
    
    const fullText = `${defenseNumber} AFFIRMATIVE DEFENSE\n${finalContent}`

    setAnswerSections({
      ...answerSections,
      defenses: answerSections.defenses.map(def =>
        def.id === defenseId
          ? {
              ...def,
              number: defenseNumber,
              causesOfAction: editingDefense.causesOfAction,
              title: editingDefense.title,
              content: cleanContent, // Store content without parenthetical lines
              fullText: fullText,
            }
          : def
      ),
    })

    if (showToast) {
      toast.success('Defense updated successfully!')
    }
    return true
  }

  const handleEditDefense = (defense: Defense) => {
    // If editing another defense, auto-save the current one first
    if (editingDefenseId && editingDefenseId !== defense.id && answerSections) {
      saveDefenseChanges(editingDefenseId, false)
    }

    // Extract causesOfAction and title from content if they exist
    let extractedCausesOfAction = defense.causesOfAction
    let extractedTitle = defense.title
    let cleanContent = defense.content
    
    // Check content for parenthetical lines
    const contentLines = defense.content.split('\n').map(line => line.trim())
    for (const line of contentLines) {
      if (line.startsWith('(') && line.endsWith(')')) {
        const lineText = line.replace(/[()]/g, '').trim()
        // Check if it's "To All Causes of Action"
        if (line.toLowerCase().includes('to all causes of action')) {
          extractedCausesOfAction = lineText
        } else if (!extractedTitle) {
          // This is the title (first non-causes-of-action parenthetical)
          extractedTitle = lineText
        }
      }
    }
    
    // Remove all parenthetical lines from content
    cleanContent = contentLines
      .filter(line => !(line.startsWith('(') && line.endsWith(')')))
      .join('\n')
      .trim()

    setEditingDefenseId(defense.id)
    setEditingDefense({
      number: defense.number,
      causesOfAction: extractedCausesOfAction,
      title: extractedTitle,
      content: cleanContent
    })
  }

  const handleSaveDefense = (defenseId: string) => {
    if (saveDefenseChanges(defenseId, true)) {
      setEditingDefenseId(null)
      setEditingDefense({ number: '', causesOfAction: '', title: '', content: '' })
    }
  }

  const handleCancelEdit = () => {
    setEditingDefenseId(null)
    setEditingDefense({ number: '', causesOfAction: '', title: '', content: '' })
  }

  // Handler for opening AI edit on a defense
  const handleOpenAIEdit = (defense: Defense) => {
    setAIEditSection({
      id: defense.id,
      title: `${defense.number} Affirmative Defense${defense.title ? ` - ${defense.title}` : ''}`,
      content: defense.content,
    })
    setShowAIEdit(true)
  }

  // Handler for opening AI edit on full answer
  const handleOpenAIEditFullAnswer = () => {
    setAIEditSection({
      id: 'full-answer',
      title: 'Full Answer Document',
      content: generatedAnswer,
    })
    setShowAIEdit(true)
  }

  // Generate Proof of Service text
  const generateProofOfServiceText = useCallback(() => {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const primaryAttorney = captionData.attorneys?.[0]
    const countyName = captionData.county?.toUpperCase() || '[COUNTY NAME]'
    const attorneyAddress = primaryAttorney?.address || '[ADDRESS]'
    const attorneyEmail = primaryAttorney?.email || '[EMAIL]'
    const attorneyName = primaryAttorney?.name || '[NAME]'
    // Extract city from address (typically last part before state/zip)
    const cityMatch = attorneyAddress.match(/,\s*([^,]+),?\s*(?:CA|California)/i)
    const cityName = cityMatch ? cityMatch[1].trim() : captionData.county || '[CITY]'

    return `PROOF OF SERVICE

STATE OF CALIFORNIA, COUNTY OF ${countyName}

At the time of service, I was over 18 years of age and not a party to this action. I am employed in the County of ${countyName}, State of California. My business address is ${attorneyAddress}.

On ${currentDate}, I served true copies of the following document(s) described as ANSWER TO COMPLAINT on the interested parties in this action as follows:

BY E-MAIL OR ELECTRONIC TRANSMISSION: I caused a copy of the document(s) to be sent from e-mail address ${attorneyEmail} to the persons at the e-mail addresses listed in the Service List. I did not receive, within a reasonable time after the transmission, any electronic message or other indication that the transmission was unsuccessful.

I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.

Executed on ${currentDate}, at ${cityName}, California.



                                                    ________________________________
                                                    ${attorneyName}`
  }, [captionData])

  // Handler for applying AI edit
  const handleApplyAIEdit = (newContent: string) => {
    if (!aiEditSection) return
    
    if (aiEditSection.id === 'full-answer') {
      // FIRST try to parse bullet-point format (most common for AI suggestions like "- **Fair Use**: ...")
      const bulletDefenses = parseBulletPointSuggestions(newContent)
      
      if (bulletDefenses.length > 0 && answerSections) {
        // Found bullet-point suggestions - ADD them to existing defenses
        const existingDefenseTitles = answerSections.defenses.map(d => d.title?.toLowerCase() || '')
        
        // Filter to only truly new defenses (not duplicates by title)
        const newDefenses = bulletDefenses.filter(newDef => {
          const isDuplicateTitle = newDef.title && existingDefenseTitles.includes(newDef.title.toLowerCase())
          return !isDuplicateTitle
        })
        
        if (newDefenses.length > 0) {
          // Renumber the new defenses to continue from existing
          const startIndex = answerSections.defenses.length
          const timestamp = Date.now()
          
          const renumberedNewDefenses: Defense[] = newDefenses.map((defense, index) => {
            const newNumber = getOrdinalNumber(startIndex + index)
            const newId = `defense-ai-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`
            
            const causesOfAction = defense.causesOfAction || 'To All Causes of Action'
            const title = defense.title || ''
            const content = defense.content || ''
            
            let fullTextContent = ''
            if (causesOfAction) {
              fullTextContent += `(${causesOfAction})\n`
            }
            if (title) {
              fullTextContent += `(${title})\n`
            }
            fullTextContent += content
            
            const fullText = `${newNumber} AFFIRMATIVE DEFENSE\n${fullTextContent}`
            
            return {
              id: newId,
              number: newNumber,
              causesOfAction: causesOfAction,
              title: title,
              content: content,
              fullText: fullText,
            }
          })
          
          // Add to existing defenses (KEEP all existing ones!)
          setAnswerSections({
            ...answerSections,
            defenses: [...answerSections.defenses, ...renumberedNewDefenses],
          })
          
          toast.success(`Added ${renumberedNewDefenses.length} new defense${renumberedNewDefenses.length > 1 ? 's' : ''}!`)
          return
        }
      }
      
      // If no bullet defenses found, try formal defense format
      const newParsed = parseAnswer(newContent)
      
      if (newParsed.defenses.length > 0 && answerSections) {
        // Check if these are truly NEW defenses (not a complete replacement)
        const isLikelyNewDefensesOnly = !newParsed.preamble || newParsed.preamble.length < 100
        
        if (isLikelyNewDefensesOnly) {
          const existingDefenseTitles = answerSections.defenses.map(d => d.title?.toLowerCase() || '')
          
          const newDefenses = newParsed.defenses.filter(newDef => {
            const isDuplicateTitle = newDef.title && existingDefenseTitles.includes(newDef.title.toLowerCase())
            return !isDuplicateTitle
          })
          
          if (newDefenses.length > 0) {
            const startIndex = answerSections.defenses.length
            const timestamp = Date.now()
            
            const renumberedNewDefenses: Defense[] = newDefenses.map((defense, index) => {
              const newNumber = getOrdinalNumber(startIndex + index)
              const newId = `defense-ai-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`
              
              const causesOfAction = defense.causesOfAction || 'To All Causes of Action'
              const title = defense.title || ''
              const content = defense.content || ''
              
              let fullTextContent = ''
              if (causesOfAction) {
                fullTextContent += `(${causesOfAction})\n`
              }
              if (title) {
                fullTextContent += `(${title})\n`
              }
              fullTextContent += content
              
              const fullText = `${newNumber} AFFIRMATIVE DEFENSE\n${fullTextContent}`
              
              return {
                id: newId,
                number: newNumber,
                causesOfAction: causesOfAction,
                title: title,
                content: content,
                fullText: fullText,
              }
            })
            
            setAnswerSections({
              ...answerSections,
              defenses: [...answerSections.defenses, ...renumberedNewDefenses],
            })
            
            toast.success(`Added ${renumberedNewDefenses.length} new defense${renumberedNewDefenses.length > 1 ? 's' : ''}!`)
            return
          }
        }
      }
      
      // Only do full replacement if it's actually a complete answer with substantial preamble AND defenses
      if (newParsed.preamble && newParsed.preamble.length > 100 && newParsed.defenses.length > 0) {
        setAnswerSections(newParsed)
        setGeneratedAnswer(newContent)
        toast.success('Answer replaced!')
      } else {
        toast.error('Could not parse AI response. Try asking for defenses in a different format.')
      }
    } else {
      // Update specific defense
      if (answerSections) {
        setAnswerSections({
          ...answerSections,
          defenses: answerSections.defenses.map(def =>
            def.id === aiEditSection.id
              ? {
                  ...def,
                  content: newContent,
                  fullText: `${def.number} AFFIRMATIVE DEFENSE${def.causesOfAction ? `\n(${def.causesOfAction})` : ''}${def.title ? `\n(${def.title})` : ''}\n${newContent}`,
                }
              : def
          ),
        })
        toast.success('Defense updated!')
      }
    }
  }

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id && answerSections) {
      const oldIndex = answerSections.defenses.findIndex((def) => def.id === active.id)
      const newIndex = answerSections.defenses.findIndex((def) => def.id === over.id)

      // Reorder the defenses
      const reorderedDefenses = arrayMove(answerSections.defenses, oldIndex, newIndex)

      // Renumber all defenses based on their new positions
      const renumberedDefenses = reorderedDefenses.map((defense, index) => {
        const newNumber = getOrdinalNumber(index)
        
        // Build finalContent with causesOfAction and title
        let finalContent = defense.content
        if (defense.causesOfAction || defense.title) {
          const parts: string[] = []
          if (defense.causesOfAction) {
            parts.push(`(${defense.causesOfAction})`)
          }
          if (defense.title) {
            parts.push(`(${defense.title})`)
          }
          finalContent = parts.join('\n') + '\n' + defense.content
        }
        
        const fullText = `${newNumber} AFFIRMATIVE DEFENSE\n${finalContent}`
        
        return {
          ...defense,
          number: newNumber,
          fullText: fullText,
        }
      })

      setAnswerSections({
        ...answerSections,
        defenses: renumberedDefenses,
      })
      toast.success('Defenses reordered and renumbered!')
    }
  }

  // Helper function for edit changes
  const handleEditChange = (field: string, value: string) => {
    setEditingDefense({ ...editingDefense, [field]: value })
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          {/* Input Form - BLUE/WHITE THEME - Only show when no answer generated */}
          {!answerSections && (
          <>
            {/* Case Caption & Attorney Header - Show for logged-in users */}
            {!isTrialMode && (
              <div className="glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 mb-8">
                <div className="flex justify-between items-center mb-4 gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Case Caption & Attorney Header</h3>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded-full whitespace-nowrap">
                    Header
                  </span>
                </div>
                <CaseCaptionCard
                  initialData={{
                    ...captionData,
                    documentType: 'ANSWER TO COMPLAINT',
                  }}
                  onChange={handleCaptionChange}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Divider for logged-in users */}
            {!isTrialMode && (
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                <span className="text-gray-600 text-sm font-medium">Complaint Details</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
              </div>
            )}

            {/* Document Selector for AI - Show for logged-in users with documents */}
            {!isTrialMode && caseId && caseDocuments.length > 0 && (
              <div className="glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300 mb-8">
                <button
                  onClick={() => setShowDocumentSelector(!showDocumentSelector)}
                  className="w-full flex items-center justify-between text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">
                      Include Case Documents in AI Generation
                    </span>
                    {selectedDocumentIds.length > 0 && (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        {selectedDocumentIds.length} selected
                      </span>
                    )}
                  </div>
                  {showDocumentSelector ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>
                
                {showDocumentSelector && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-sm text-gray-600 mb-3">
                      Select documents to include when generating your answer. 
                      The AI will use information from these documents to craft better defenses.
                    </p>
                    {loadingDocuments ? (
                      <div className="text-gray-500 text-sm">Loading documents...</div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {caseDocuments.map((doc) => (
                          <label 
                            key={doc.id}
                            className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDocumentIds.includes(doc.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocumentIds([...selectedDocumentIds, doc.id])
                                } else {
                                  setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id))
                                }
                              }}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {DOCUMENT_CATEGORIES[doc.category]}
                              </p>
                            </div>
                            {selectedDocumentIds.includes(doc.id) && (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                    {caseDocuments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                        <button
                          onClick={() => setSelectedDocumentIds(caseDocuments.map(d => d.id))}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedDocumentIds([])}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Clear Selection
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          <div className="glass rounded-3xl p-8 space-y-6 bg-white/95 border border-primary-200 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="glass rounded-xl p-3 mr-4 bg-primary-50 border border-primary-200">
                <FileText className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800">Document Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary-600" />
                  Plaintiff Name *
                </label>
                <input
                  type="text"
                  name="plaintiffName"
                  value={formData.plaintiffName}
                  onChange={handleInputChange}
                  placeholder="e.g., John Smith"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary-600" />
                  Defendant Name *
                </label>
                <input
                  type="text"
                  name="defendantName"
                  value={formData.defendantName}
                  onChange={handleInputChange}
                  placeholder="e.g., Acme Inc."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary-600" />
                  Complaint Text *
                </label>
                <textarea
                  name="complaintText"
                  value={formData.complaintText}
                  onChange={handleInputChange}
                  placeholder="Paste the full complaint text here..."
                  rows={12}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary-600" />
                  Defendant Representation
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMultipleDefendants"
                      checked={!formData.isMultipleDefendants}
                      onChange={() => setFormData({ ...formData, isMultipleDefendants: false })}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">Single Defendant</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isMultipleDefendants"
                      checked={formData.isMultipleDefendants}
                      onChange={() => setFormData({ ...formData, isMultipleDefendants: true })}
                      className="mr-2 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">Multiple Defendants</span>
                  </label>
                </div>
              </div>

              <button
                onClick={generateAnswer}
                disabled={isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating Answer...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Generate AI-Powered Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>
          </>
          )}

          {/* Generated Answer Header */}
          {answerSections && (
            <>
              <div className="glass rounded-3xl p-8 bg-white/95 border border-primary-200 shadow-lg">
                <div className="flex items-center">
                  <div className="glass rounded-xl p-3 mr-4 bg-primary-50 border border-primary-200">
                    <Scale className="w-6 h-6 text-primary-600" />
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-800">Generated Answer</h2>
                </div>
              </div>

              {/* Case Caption & Attorney Header Card */}
              <div className="glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300">
                <div className="flex justify-between items-center mb-4 gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Case Caption & Attorney Header</h3>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full whitespace-nowrap">
                    Header
                  </span>
                </div>
                <CaseCaptionCard
                  initialData={{
                    ...captionData,
                    documentType: 'ANSWER TO COMPLAINT',
                  }}
                  onChange={handleCaptionChange}
                  disabled={false}
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
                <span className="text-gray-600 text-sm font-medium">Answer Sections</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
              </div>

              {/* Preamble Card */}
              {answerSections.preamble && (
                <div className="glass rounded-2xl p-6 hover:shadow-lg transition-all relative group bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Preamble</h3>
                  <div className="relative">
                    <textarea
                      value={answerSections.preamble}
                      onChange={(e) => {
                        setAnswerSections({
                          ...answerSections,
                          preamble: e.target.value
                        })
                        // Auto-resize
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                      }}
                      onInput={(e) => {
                        const textarea = e.target as HTMLTextAreaElement
                        textarea.style.height = 'auto'
                        textarea.style.height = textarea.scrollHeight + 'px'
                      }}
                      ref={(textarea) => {
                        if (textarea) {
                          textarea.style.height = 'auto'
                          textarea.style.height = textarea.scrollHeight + 'px'
                        }
                      }}
                      className="w-full min-h-24 p-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-hidden"
                      placeholder="Enter preamble content here..."
                    />
                  </div>
                </div>
              )}

              {/* Affirmative Defenses Section Header */}
              {answerSections && (
                <div className="glass rounded-3xl p-6 bg-white/95 border border-primary-200 shadow-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Scale className="w-5 h-5 mr-2 text-primary-600" />
                      Affirmative Defenses
                    </h3>
                  </div>
                </div>
              )}

              {/* Individual Defense Cards */}
              {answerSections.defenses.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={answerSections.defenses.map((def) => def.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {answerSections.defenses.map((defense) => (
                        <SortableDefenseCard
                          key={defense.id}
                          defense={defense}
                          onDelete={handleDeleteDefense}
                          onUpdate={handleUpdateDefenseField}
                          onAIEdit={handleOpenAIEdit}
                        />
                      ))}
                      </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Add Defense Button */}
              {answerSections && (
                <>
                  {!showAddDefense && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setShowAddDefense(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                      >
                        + Add Defense
                      </button>
                    </div>
                  )}
                  
                  {showAddDefense && answerSections && (
                    <div className="glass rounded-2xl p-6 bg-white/95 border-2 border-primary-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-primary-700">Add New Affirmative Defense</h3>
                        <button
                          onClick={() => {
                            setShowAddDefense(false)
                            setNewDefense({ number: '', causesOfAction: '', title: '', content: '' })
                          }}
                          className="p-2 rounded-lg bg-gray-200 text-gray-700 transition-all hover:bg-gray-300 hover:scale-110"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Defense Number (e.g., NINETEENTH, TWENTIETH)
                          </label>
                          <input
                            type="text"
                            value={newDefense.number}
                            onChange={(e) => setNewDefense({ ...newDefense, number: e.target.value })}
                            placeholder="NINETEENTH"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Causes of Action Applied
                          </label>
                          <input
                            type="text"
                            value={newDefense.causesOfAction}
                            onChange={(e) => setNewDefense({ ...newDefense, causesOfAction: e.target.value })}
                            placeholder="Causes of Action Applied"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Defense Title
                          </label>
                          <input
                            type="text"
                            value={newDefense.title}
                            onChange={(e) => setNewDefense({ ...newDefense, title: e.target.value })}
                            placeholder="e.g., Custom Defense"
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Defense Content *
                          </label>
                          <textarea
                            value={newDefense.content}
                            onChange={(e) => setNewDefense({ ...newDefense, content: e.target.value })}
                            placeholder="Enter the defense content here..."
                            rows={6}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical"
                          />
                        </div>
                        <button
                          onClick={handleAddDefense}
                          className="w-full font-semibold py-3 px-6 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white transition-all transform hover:scale-105 hover:shadow-lg"
                        >
                          <Plus className="w-4 h-4 inline mr-2" />
                          Add Defense
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Prayer Card */}
              {answerSections.prayer && (
                <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Prayer</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {answerSections.prayer}
                  </div>
                </div>
              )}

              {/* Signature Card */}
              {answerSections && (
                <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Signature</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {(() => {
                      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      const primaryAttorney = captionData.attorneys?.[0]
                      const attorneyName = primaryAttorney?.name || '[ATTORNEY NAME]'
                      const barNumber = primaryAttorney?.barNumber || '[BAR NUMBER]'
                      const firmName = primaryAttorney?.firm || ''
                      const defendantName = captionData.defendants?.[0] || formData.defendantName || '[DEFENDANT NAME]'
                      
                      return `Dated: ${currentDate}

Respectfully submitted,

${firmName ? firmName + '\n\n' : ''}

________________________________
${attorneyName}
State Bar No. ${barNumber}
Attorney for Defendant ${defendantName}`
                    })()}
                  </div>
                </div>
              )}

              {/* Jury Demand Card */}
              {answerSections.signature && (
                <div className="glass rounded-2xl p-6 bg-white/95 border border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-700 mb-3">Jury Demand</h3>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                    Defendant hereby demands a jury by trial in the above-entitled action
                  </div>
                </div>
              )}

              {/* Add Proof of Service Button */}
              {answerSections && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowProofOfService(!showProofOfService)}
                    className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                      showProofOfService 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                    }`}
                  >
                    {showProofOfService ? '✓ Proof of Service Added' : '+ Add Proof of Service'}
                  </button>
                </div>
              )}

              {/* Proof of Service Card */}
              {showProofOfService && (
                <div className="glass-strong p-6 rounded-2xl border-2 border-dashed border-blue-300">
                  <div className="flex justify-between items-start mb-4 gap-3">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                      <h3 className="text-xl font-semibold text-gray-900">Proof of Service</h3>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                      Added
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      value={generateProofOfServiceText()}
                      readOnly
                      className="w-full min-h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Action Bar - Save Draft, New Answer, and Preview */}
              <div className="glass-strong p-6 rounded-2xl">
                <div className="flex gap-4 justify-end items-center">
                  {/* New Answer Button */}
                  <button
                    onClick={() => {
                      setAnswerSections(null)
                      setGeneratedAnswer('')
                      setSaveSuccess(false)
                      setShowProofOfService(false)
                    }}
                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full font-semibold transition-all duration-300 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Answer</span>
                  </button>

                  {/* Save Draft Button */}
                  {!isTrialMode && (
                    <button 
                      onClick={handleSaveDraft}
                      disabled={saving || !caseId || !answerSections}
                      className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                        saving ? 'opacity-50 cursor-not-allowed' : ''
                      } ${(!caseId || !answerSections)
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200' 
                        : saveSuccess 
                          ? 'bg-green-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      title={!caseId ? 'Access from case dashboard to enable saving' : !answerSections ? 'Generate an answer first' : 'Save draft to case'}
                    >
                      {saving ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                          <span>Save Draft</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Save to Repository Button */}
                  {!isTrialMode && (
                    <button 
                      onClick={handleSaveToRepository}
                      disabled={savingToRepo || !caseId || !answerSections}
                      className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                        savingToRepo ? 'opacity-50 cursor-not-allowed' : ''
                      } ${(!caseId || !answerSections)
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200' 
                        : repoSaveSuccess 
                          ? 'bg-green-600 text-white'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                      title={!caseId ? 'Access from case dashboard to enable saving' : 'Save to document repository'}
                    >
                      {savingToRepo ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : repoSaveSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Saved to Repository!</span>
                        </>
                      ) : (
                        <>
                          <FolderPlus className="w-4 h-4" />
                          <span>Save to Repository</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {/* Preview Button */}
                  <button 
                    onClick={() => setShowPreview(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-medium text-amber-800 mb-2">⚠️ Legal Disclaimer</h4>
                <p className="text-amber-800 text-sm">
                  This document is AI-generated and should be reviewed by a qualified attorney before filing. 
                  The content may require modifications to meet specific jurisdictional requirements and 
                  case-specific details. Always consult with legal counsel for proper legal advice.
                </p>
              </div>
            </>
          )}

        </div>
      </div>
      
      {/* Preview Modal */}
      <AnswerPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        answerSections={answerSections}
        captionData={captionData}
        formData={formData}
        isMultipleDefendants={formData.isMultipleDefendants}
        showProofOfService={showProofOfService}
        proofOfServiceText={showProofOfService ? generateProofOfServiceText() : ''}
      />

      {/* AI Edit Modal */}
      {aiEditSection && (
        <AIEditChatModal
          isOpen={showAIEdit}
          onClose={() => {
            setShowAIEdit(false)
            setAIEditSection(null)
          }}
          sectionId={aiEditSection.id}
          sectionTitle={aiEditSection.title}
          currentContent={aiEditSection.content}
          complaintText={formData.complaintText}
          caseId={caseId || ''}
          parties={partiesData}
          isMultipleDefendants={formData.isMultipleDefendants}
          onApplyEdit={handleApplyAIEdit}
        />
      )}
    </div>
  )
}




