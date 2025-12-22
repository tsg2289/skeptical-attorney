'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Copy, Check, RotateCcw, Plus, FileIcon, ChevronDown, ChevronUp, X, Save, BookOpen, Eye, Download, Trash2, Scale } from 'lucide-react'
import { CaseFrontend, supabaseCaseStorage, MotionSection, MotionDocument } from '@/lib/supabase/caseStorage'
import { 
  downloadMotionDocument, 
  downloadMotionDocuments,
  NoticeOfMotionDocumentData,
  MemorandumDocumentData,
  MotionData 
} from '@/lib/docx-generator'
import { userProfileStorage } from '@/lib/supabase/userProfileStorage'
import AIEditChatModal from './AIEditChatModal'
import { MotionFormData, ArgumentSubsection, DeclarationFact } from './MotionForm'
import CaseCaptionCard, { CaseCaptionData } from '../../pleadings/complaint/components/CaseCaptionCard'
import MotionPreviewModal from './MotionPreviewModal'

interface MotionOutputProps {
  motion: string
  motionType: string
  onNewMotion: () => void
  caseData?: CaseFrontend | null
  isTrialMode?: boolean
  motionFormData?: MotionFormData
}

export default function MotionOutput({ 
  motion, 
  motionType, 
  onNewMotion, 
  caseData, 
  isTrialMode = false,
  motionFormData 
}: MotionOutputProps) {
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

  // Proof of Service state
  const [showProofOfService, setShowProofOfService] = useState(false)

  // Local editable copies of form data sections
  const [noticeOfMotion, setNoticeOfMotion] = useState(motionFormData?.noticeOfMotion || {
    hearingDate: '',
    hearingTime: '08:30',
    department: '',
    reliefSought: '',
    reliefSoughtSummary: '',  // AI-summarized version for Notice
    argumentSummary: '',
    applicableRule: '',
  })

  // Full editable notice text
  const [noticeText, setNoticeText] = useState('')

  const [memorandum, setMemorandum] = useState(motionFormData?.memorandum || {
    introduction: '',
    facts: '',
    law: '',
    argument: '',
    argumentSubsections: [] as ArgumentSubsection[],
    conclusion: '',
  })

  const [declaration, setDeclaration] = useState(motionFormData?.declaration || {
    declarantName: '',
    barNumber: '',
    facts: [{ id: `init-fact-${Math.random().toString(36).substr(2, 9)}`, number: 1, content: '' }] as DeclarationFact[],
  })

  const [captionData, setCaptionData] = useState<CaseCaptionData>(motionFormData?.captionData || {
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
    hearingDate: motionFormData?.noticeOfMotion?.hearingDate || '',
    hearingTime: motionFormData?.noticeOfMotion?.hearingTime || '08:30',
  })

  // Section expansion states for structured cards
  const [expandedSections, setExpandedSections] = useState({
    caption: true,
    notice: true,
    memorandum: true,
    declaration: true,
  })

  // Moving party
  const [movingParty, setMovingParty] = useState<'plaintiff' | 'defendant'>('defendant')

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)

  // Toggle section expansion
  const toggleCardSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Argument subsection handlers
  const addArgumentSubsection = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const nextIndex = memorandum.argumentSubsections.length
    const newSubsection: ArgumentSubsection = {
      id: `arg-${letters[nextIndex] || nextIndex}-${Math.random().toString(36).substr(2, 9)}`,
      letter: letters[nextIndex] || `${nextIndex + 1}`,
      title: '',
      content: '',
    }
    setMemorandum(prev => ({
      ...prev,
      argumentSubsections: [...prev.argumentSubsections, newSubsection],
    }))
  }

  const updateArgumentSubsection = (id: string, field: keyof ArgumentSubsection, value: string) => {
    setMemorandum(prev => ({
      ...prev,
      argumentSubsections: prev.argumentSubsections.map(sub =>
        sub.id === id ? { ...sub, [field]: value } : sub
      ),
    }))
  }

  const removeArgumentSubsection = (id: string) => {
    setMemorandum(prev => ({
      ...prev,
      argumentSubsections: prev.argumentSubsections.filter(sub => sub.id !== id),
    }))
  }

  // Declaration fact handlers
  const addDeclarationFact = () => {
    const nextNumber = declaration.facts.length + 1
    setDeclaration(prev => ({
      ...prev,
      facts: [...prev.facts, { id: `fact-${nextNumber}-${Math.random().toString(36).substr(2, 9)}`, number: nextNumber, content: '' }],
    }))
  }

  const updateDeclarationFact = (id: string, content: string) => {
    setDeclaration(prev => ({
      ...prev,
      facts: prev.facts.map(fact =>
        fact.id === id ? { ...fact, content } : fact
      ),
    }))
  }

  const removeDeclarationFact = (id: string) => {
    setDeclaration(prev => ({
      ...prev,
      facts: prev.facts.filter(fact => fact.id !== id).map((fact, index) => ({
        ...fact,
        number: index + 1,
      })),
    }))
  }

  // Auto-resize textarea helper
  const autoResizeTextareaOnChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

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

  // Parse AI-generated motion text and populate structured fields
  useEffect(() => {
    if (!motion) return
    
    // Clean the motion text
    const cleanedMotion = motion
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/```\s*$/m, '')
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\*/g, '') // Remove markdown italic
      .replace(/_+/g, '') // Remove underscores
      .replace(/#+\s*/g, '') // Remove markdown headers
      .trim()
    
    console.log('=== AI Motion Parsing ===')
    console.log('Motion length:', cleanedMotion.length)
    console.log('First 500 chars:', cleanedMotion.substring(0, 500))
    
    // More flexible section extraction using multiple patterns
    const extractSection = (text: string, sectionNames: string[]): string => {
      for (const name of sectionNames) {
        // Try multiple patterns for each section name
        const patterns = [
          // With Roman numerals
          new RegExp(`(?:^|\\n)\\s*(?:I{1,3}V?|V)\\.?\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:I{1,3}V?|V)\\.?\\s*[A-Z]|\\nDECLARATION|\\nPROOF\\s+OF\\s+SERVICE|Respectfully\\s+submitted|$)`, 'i'),
          // Without Roman numerals, just the section name
          new RegExp(`(?:^|\\n)\\s*${name}\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:INTRODUCTION|STATEMENT|FACTS|APPLICABLE|LAW|ARGUMENT|ANALYSIS|CONCLUSION|DECLARATION|PROOF)\\s*\\n|Respectfully\\s+submitted|$)`, 'i'),
          // Section name followed by colon
          new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*\\n([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z\\s]+:\\s*\\n|\\nDECLARATION|$)`, 'i'),
        ]
        
        for (const pattern of patterns) {
          const match = text.match(pattern)
          if (match && match[1]) {
            const content = match[1].trim()
            if (content.length > 20) { // Minimum content length
              console.log(`Found ${name}: ${content.length} chars`)
              return content
            }
          }
        }
      }
      return ''
    }
    
    // Extract each memorandum section with multiple possible names
    const introContent = extractSection(cleanedMotion, ['INTRODUCTION'])
    const factsContent = extractSection(cleanedMotion, ['STATEMENT OF FACTS', 'FACTUAL BACKGROUND', 'FACTS', 'BACKGROUND'])
    const lawContent = extractSection(cleanedMotion, ['APPLICABLE LAW', 'LEGAL STANDARD', 'LAW', 'LEGAL FRAMEWORK'])
    const argumentContent = extractSection(cleanedMotion, ['ARGUMENT', 'LEGAL ARGUMENT', 'ANALYSIS', 'DISCUSSION'])
    const conclusionContent = extractSection(cleanedMotion, ['CONCLUSION'])
    
    console.log('Parsed memorandum sections:', {
      intro: introContent.length,
      facts: factsContent.length,
      law: lawContent.length,
      argument: argumentContent.length,
      conclusion: conclusionContent.length,
    })
    
    // Extract Declaration section and its numbered facts
    const declarationFacts: DeclarationFact[] = []
    
    // Try to find declaration section with multiple patterns
    const declPatterns = [
      /DECLARATION\s+OF\s+[A-Z][A-Za-z\s\.,]+[\s\S]*?(?=PROOF\s+OF\s+SERVICE|---\s*$|$)/i,
      /DECLARATION\s+IN\s+SUPPORT[\s\S]*?(?=PROOF\s+OF\s+SERVICE|---\s*$|$)/i,
      /DECLARATION[\s\S]*?(?=PROOF\s+OF\s+SERVICE|---\s*$|$)/i,
      /SUPPORTING\s+DECLARATION[\s\S]*?(?=PROOF\s+OF\s+SERVICE|---\s*$|$)/i,
    ]
    
    let declarationText = ''
    for (const pattern of declPatterns) {
      const match = cleanedMotion.match(pattern)
      if (match && match[0].length > 50) {
        declarationText = match[0]
        console.log('Found declaration with pattern:', pattern.toString().substring(0, 50))
        break
      }
    }
    
    // Check if declaration exists in the motion
    const hasDeclaration = /DECLARATION/i.test(cleanedMotion)
    console.log('Declaration keyword found in motion:', hasDeclaration)
    
    if (declarationText) {
      console.log('Found declaration section, length:', declarationText.length)
      console.log('Declaration preview:', declarationText.substring(0, 300))
      
      // Extract numbered facts from declaration
      // Match: "1. content" or "1) content" patterns
      const factPatterns = [
        /(\d+)\.\s+([\s\S]*?)(?=\n\s*\d+[\.\)]\s|I declare under penalty|Executed on|Dated:|I am|$)/g,
        /(\d+)\)\s+([\s\S]*?)(?=\n\s*\d+[\.\)]\s|I declare under penalty|Executed on|Dated:|I am|$)/g,
      ]
      
      for (const pattern of factPatterns) {
        const matches = [...declarationText.matchAll(pattern)]
        if (matches.length > 0) {
          console.log('Found', matches.length, 'declaration fact matches')
          matches.forEach((match, idx) => {
            const factNum = parseInt(match[1])
            const factContent = match[2].trim()
            if (factContent && factContent.length > 5 && factNum > 0) {
              declarationFacts.push({
                id: `decl-fact-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                number: factNum,
                content: factContent,
              })
            }
          })
          if (declarationFacts.length > 0) break
        }
      }
      
      console.log('Parsed declaration facts:', declarationFacts.length)
    } else {
      console.log('No declaration section found in AI output')
      // If AI didn't generate declaration but we have caption data, pre-populate first fact
      if (captionData?.attorneys?.[0]?.name) {
        console.log('Pre-populating declaration with attorney info')
      }
    }
    
    // Extract argument subsections (A., B., C., etc.)
    const argumentSubsections: ArgumentSubsection[] = []
    if (argumentContent) {
      const subsectionPattern = /\n\s*([A-Z])\.\s+([^\n]+)\n([\s\S]*?)(?=\n\s*[A-Z]\.\s+[A-Z]|$)/g
      const matches = [...argumentContent.matchAll(subsectionPattern)]
      
      matches.forEach((match, idx) => {
        argumentSubsections.push({
          id: `arg-sub-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          letter: match[1],
          title: match[2].trim(),
          content: match[3].trim(),
        })
      })
      console.log('Parsed argument subsections:', argumentSubsections.length)
    }
    
    // Remove subsection content from main argument if subsections were found
    let mainArgument = argumentContent
    if (argumentSubsections.length > 0) {
      const firstSubsectionMatch = argumentContent.match(/\n\s*[A-Z]\.\s+[A-Z]/i)
      if (firstSubsectionMatch && firstSubsectionMatch.index !== undefined) {
        mainArgument = argumentContent.slice(0, firstSubsectionMatch.index).trim()
      }
    }
    
    // Update memorandum state with parsed content
    setMemorandum(prev => ({
      introduction: introContent || prev.introduction,
      facts: factsContent || prev.facts,
      law: lawContent || prev.law,
      argument: mainArgument || prev.argument,
      argumentSubsections: argumentSubsections.length > 0 ? argumentSubsections : prev.argumentSubsections,
      conclusion: conclusionContent || prev.conclusion,
    }))
    
    // Update declaration state with parsed facts
    if (declarationFacts.length > 0) {
      setDeclaration(prev => ({
        ...prev,
        facts: declarationFacts,
      }))
    }
    
    // Try to extract declarant name from declaration
    const declarantMatch = cleanedMotion.match(/DECLARATION\s+OF\s+([A-Z][A-Za-z\s\.]+?)(?:\n|,)/i)
    if (declarantMatch) {
      setDeclaration(prev => ({
        ...prev,
        declarantName: prev.declarantName || declarantMatch[1].trim(),
      }))
    }
    
    // Extract MOTION SUMMARY section for the Notice card
    // Try multiple patterns to find the summary
    const summaryPatterns = [
      /MOTION\s+SUMMARY:?\s*\n+([\s\S]*?)(?=\n\s*(?:I\.|INTRODUCTION|II\.|STATEMENT|MEMORANDUM|---|\n\n\n))/i,
      /MOTION\s+SUMMARY:?\s*\n+([\s\S]*?)(?=\n[A-Z]{2,})/i,
      /MOTION\s+SUMMARY:?\s*([\s\S]*?)(?=\n\s*I\.\s)/i,
    ]
    
    let summaryText = ''
    for (const pattern of summaryPatterns) {
      const summaryMatch = cleanedMotion.match(pattern)
      if (summaryMatch && summaryMatch[1]) {
        summaryText = summaryMatch[1].trim()
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/^\[.*?\]\s*/g, '') // Remove placeholder brackets
          .trim()
        if (summaryText.length > 50) {
          console.log('Found MOTION SUMMARY with pattern:', summaryText.substring(0, 150))
          break
        }
      }
    }
    
    if (summaryText.length > 50) {
      setNoticeOfMotion(prev => ({
        ...prev,
        argumentSummary: prev.argumentSummary || summaryText,
      }))
    } else if (introContent && introContent.length > 50) {
      // Fallback: Use the introduction content as summary
      // Take first 3-4 sentences for a more complete summary
      const sentences = introContent.split(/\.\s+/).slice(0, 3).join('. ')
      if (sentences.length > 50) {
        console.log('Using INTRODUCTION as fallback summary:', sentences.substring(0, 100))
        setNoticeOfMotion(prev => ({
          ...prev,
          argumentSummary: prev.argumentSummary || (sentences + '.'),
        }))
      }
    }
    
    // Try to extract applicable California Rules of Court reference
    const ruleMatch = cleanedMotion.match(/California\s+Rules?\s+of\s+Court[,\s]+Rule\s+(\d+\.\d+)/i)
    if (ruleMatch) {
      setNoticeOfMotion(prev => ({
        ...prev,
        applicableRule: prev.applicableRule || ruleMatch[1],
      }))
    }
    
    // Also try to extract from CCP or Code of Civil Procedure references
    const ccpMatch = cleanedMotion.match(/(?:CCP|Code\s+of\s+Civil\s+Procedure)\s*(?:§|section)\s*(\d+(?:\.\d+)?)/i)
    if (ccpMatch && !ruleMatch) {
      // Map common CCP sections to Rules of Court
      const ccpToRule: Record<string, string> = {
        '2030': '3.1345', '2031': '3.1345', '2033': '3.1345', // Discovery
        '2025': '3.1345', // Depositions
        '430': '3.1320', // Demurrer
        '435': '3.1322', '436': '3.1322', '437': '3.1322', // Motion to Strike
        '437c': '3.1350', // Summary Judgment
      }
      const sectionPrefix = ccpMatch[1].split('.')[0]
      const mappedRule = ccpToRule[sectionPrefix]
      if (mappedRule) {
        setNoticeOfMotion(prev => ({
          ...prev,
          applicableRule: prev.applicableRule || mappedRule,
        }))
      }
    }
    
  }, [motion])

  // Initialize notice text when data changes
  useEffect(() => {
    const movingPartyName = movingParty === 'plaintiff' 
      ? captionData.plaintiffs.filter(p => p.trim())[0] || '[MOVING PARTY]'
      : captionData.defendants.filter(d => d.trim())[0] || '[MOVING PARTY]'
    
    const formattedDate = captionData.hearingDate 
      ? new Date(captionData.hearingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) 
      : '[DATE]'
    
    // Use the AI-summarized relief for the Notice, falling back to raw input
    const reliefText = noticeOfMotion.reliefSoughtSummary || noticeOfMotion.reliefSought || '[RELIEF SOUGHT]'
    
    const text = `TO ALL PARTIES AND THEIR ATTORNEYS OF RECORD:

PLEASE TAKE NOTICE that on ${formattedDate} at ${captionData.hearingTime || '[TIME]'}, or as soon thereafter as the matter may be heard, in Department ${captionData.departmentNumber || '[DEPT]'} of the above-entitled Court, ${movingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'} ${movingPartyName} will move the Court for an order ${reliefText}.${noticeOfMotion.argumentSummary ? `

${noticeOfMotion.argumentSummary}` : ''}

This motion is based upon this Notice of Motion, the attached Memorandum of Points and Authorities, the Declaration of ${declaration.declarantName || captionData.attorneys?.[0]?.name || '[ATTORNEY]'}, Esq., and upon all of the pleadings and records contained in the Court file herein, and upon such oral and documentary evidence as may be presented at the time of hearing on this motion.`
    
    setNoticeText(text)
  }, [captionData, movingParty, noticeOfMotion.reliefSought, noticeOfMotion.reliefSoughtSummary, noticeOfMotion.argumentSummary, declaration.declarantName])

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

  // Generate Proof of Service text
  const generateProofOfServiceText = useCallback(() => {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const primaryAttorney = captionData.attorneys?.[0]
    const countyName = captionData.county?.toUpperCase() || '[COUNTY NAME]'
    const attorneyAddress = primaryAttorney?.address || '[ADDRESS]'
    const attorneyEmail = primaryAttorney?.email || '[EMAIL]'
    const attorneyName = primaryAttorney?.name || '[NAME]'
    const cityMatch = attorneyAddress.match(/,\s*([^,]+),?\s*(?:CA|California)/i)
    const cityName = cityMatch ? cityMatch[1].trim() : captionData.county || '[CITY]'
    const motionTitle = getMotionTitle(motionType).toUpperCase()

    return `PROOF OF SERVICE

STATE OF CALIFORNIA, COUNTY OF ${countyName}

At the time of service, I was over 18 years of age and not a party to this action. I am employed in the County of ${countyName}, State of California. My business address is ${attorneyAddress}.

On ${currentDate}, I served true copies of the following document(s) described as NOTICE OF ${motionTitle}; MEMORANDUM OF POINTS AND AUTHORITIES; DECLARATION OF ${attorneyName.toUpperCase()} on the interested parties in this action as follows:

BY E-MAIL OR ELECTRONIC TRANSMISSION: I caused a copy of the document(s) to be sent from e-mail address ${attorneyEmail} to the persons at the e-mail addresses listed in the Service List. I did not receive, within a reasonable time after the transmission, any electronic message or other indication that the transmission was unsuccessful.

I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.

Executed on ${currentDate}, at ${cityName}, California.



                                                    ________________________________
                                                    ${attorneyName}`
  }, [captionData, motionType])

  // Download both Word documents (Notice + Memorandum)
  const handleDownloadWordDocuments = async () => {
    try {
      const profile = await userProfileStorage.getProfile()
      
      const primaryAttorney = captionData?.attorneys?.[0]
      const plaintiffName = captionData?.plaintiffs?.filter(p => p.trim())[0] || 
                           caseData?.plaintiffs?.map(p => p.name).filter(Boolean).join(', ') || '[PLAINTIFF]'
      const defendantName = captionData?.defendants?.filter(d => d.trim())[0] || 
                           caseData?.defendants?.map(d => d.name).filter(Boolean).join(', ') || '[DEFENDANT]'
      
      // Prepare Notice data
      const noticeData: NoticeOfMotionDocumentData = {
        motionType,
        plaintiffName,
        defendantName,
        movingParty: 'defendant',
        attorneyName: primaryAttorney?.name || profile?.fullName || undefined,
        stateBarNumber: primaryAttorney?.barNumber || profile?.barNumber || undefined,
        email: primaryAttorney?.email || profile?.firmEmail || undefined,
        lawFirmName: primaryAttorney?.firm || profile?.firmName || undefined,
        address: primaryAttorney?.address || profile?.firmAddress || undefined,
        phone: primaryAttorney?.phone || profile?.firmPhone || undefined,
        county: captionData?.county || caseData?.courtCounty || 'LOS ANGELES',
        caseNumber: captionData?.caseNumber || caseData?.caseNumber || undefined,
        judgeName: captionData?.judgeName || undefined,
        departmentNumber: captionData?.departmentNumber || noticeOfMotion.department || undefined,
        hearingDate: noticeOfMotion.hearingDate || undefined,
        hearingTime: noticeOfMotion.hearingTime || '8:30 a.m.',
        reliefSought: noticeOfMotion.reliefSought || undefined,
        argumentSummary: noticeOfMotion.argumentSummary || undefined,
        includeProofOfService: showProofOfService,
        proofOfServiceText: showProofOfService ? generateProofOfServiceText() : undefined,
      }
      
      // Prepare Memorandum data
      const memoData: MemorandumDocumentData = {
        motionType,
        plaintiffName,
        defendantName,
        movingParty: 'defendant',
        attorneyName: primaryAttorney?.name || profile?.fullName || undefined,
        stateBarNumber: primaryAttorney?.barNumber || profile?.barNumber || undefined,
        email: primaryAttorney?.email || profile?.firmEmail || undefined,
        lawFirmName: primaryAttorney?.firm || profile?.firmName || undefined,
        address: primaryAttorney?.address || profile?.firmAddress || undefined,
        phone: primaryAttorney?.phone || profile?.firmPhone || undefined,
        county: captionData?.county || caseData?.courtCounty || 'LOS ANGELES',
        caseNumber: captionData?.caseNumber || caseData?.caseNumber || undefined,
        judgeName: captionData?.judgeName || undefined,
        departmentNumber: captionData?.departmentNumber || noticeOfMotion.department || undefined,
        hearingDate: noticeOfMotion.hearingDate || undefined,
        hearingTime: noticeOfMotion.hearingTime || '8:30 a.m.',
        introduction: memorandum.introduction || undefined,
        facts: memorandum.facts || undefined,
        law: memorandum.law || undefined,
        argument: memorandum.argument || undefined,
        argumentSubsections: memorandum.argumentSubsections || [],
        conclusion: memorandum.conclusion || undefined,
        declarantName: declaration.declarantName || primaryAttorney?.name || profile?.fullName || undefined,
        declarantBarNumber: declaration.barNumber || primaryAttorney?.barNumber || profile?.barNumber || undefined,
        declarationFacts: declaration.facts?.filter(f => f.content.trim()) || [],
      }
      
      await downloadMotionDocuments(noticeData, memoData)
    } catch (err) {
      console.error('Failed to generate Word documents:', err)
      alert('Failed to generate Word documents. Please try again.')
    }
  }

  // Legacy single document download (fallback)
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
  const [editingStructuredField, setEditingStructuredField] = useState<{
    field: 'introduction' | 'facts' | 'law' | 'argument' | 'conclusion' | 'declaration' | 'summary' | null
    title: string
    content: string
  } | null>(null)

  const handleOpenAIChat = (section: MotionSection) => {
    setEditingStructuredField(null)
    setEditingSection(section)
    setAiChatOpen(true)
  }

  const handleOpenStructuredAIChat = (
    field: 'introduction' | 'facts' | 'law' | 'argument' | 'conclusion' | 'declaration' | 'summary',
    title: string,
    content: string
  ) => {
    setEditingSection(null)
    setEditingStructuredField({ field, title, content })
    setAiChatOpen(true)
  }

  const handleApplyAIEdit = (newContent: string) => {
    if (editingSection) {
      updateSection(editingSection.id, 'content', newContent)
    } else if (editingStructuredField) {
      // Apply to structured memorandum/declaration fields
      switch (editingStructuredField.field) {
        case 'introduction':
          setMemorandum(prev => ({ ...prev, introduction: newContent }))
          break
        case 'facts':
          setMemorandum(prev => ({ ...prev, facts: newContent }))
          break
        case 'law':
          setMemorandum(prev => ({ ...prev, law: newContent }))
          break
        case 'argument':
          setMemorandum(prev => ({ ...prev, argument: newContent }))
          break
        case 'conclusion':
          setMemorandum(prev => ({ ...prev, conclusion: newContent }))
          break
        case 'summary':
          setNoticeText(newContent)
          break
        case 'declaration':
          // For declaration, we update the first fact as a proxy for the whole declaration
          // In a more sophisticated implementation, we could handle individual facts
          break
      }
      setEditingStructuredField(null)
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
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center space-x-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-800 font-medium">Motion generated successfully!</span>
          </div>
        <p className="text-green-700 text-sm mt-1">
          {motionFormData 
            ? 'Review and edit the sections below. Use the Preview button to download Word documents.'
            : 'Edit each section below. Drag and drop to reorder sections.'
          }
        </p>
      </div>

      {/* Document Info Banner */}
      {motionFormData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileIcon className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-blue-900 font-medium">This motion will generate two separate Word documents:</p>
              <ul className="text-blue-700 text-sm mt-1 list-disc list-inside">
                <li>Notice of Motion (with Proof of Service if selected)</li>
                <li>Memorandum of Points and Authorities (with Declaration)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Editable Caption Card */}
            {!isTrialMode && (
        <div className="glass-card p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gray-100 rounded-xl">
              <FileText className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Case Caption & Attorney Header</h3>
              <p className="text-sm text-gray-600">Edit caption information for the Word documents</p>
            </div>
          </div>
          <CaseCaptionCard
            initialData={captionData}
            onChange={(newData) => {
              setCaptionData(newData)
              // Sync hearing date/time/department with noticeOfMotion
              if (newData.hearingDate !== undefined || newData.hearingTime !== undefined || newData.departmentNumber !== undefined) {
                setNoticeOfMotion(prev => ({
                  ...prev,
                  hearingDate: newData.hearingDate || prev.hearingDate,
                  hearingTime: newData.hearingTime || prev.hearingTime,
                  department: newData.departmentNumber || prev.department,
                }))
              }
            }}
            disabled={false}
          />
        </div>
      )}

      {/* Notice of Motion Card */}
      {motionFormData && (
        <div className="glass-card p-6 rounded-2xl shadow-lg border border-blue-100">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleCardSection('notice')}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Notice of Motion</h3>
                <p className="text-sm text-gray-600">Hearing details and relief sought</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                Notice
              </span>
              {expandedSections.notice ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
          
          {expandedSections.notice && (
            <div className="mt-4">
              {/* Editable Notice of Motion */}
              <div className="relative">
                <textarea
                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                  value={noticeText}
                  onChange={(e) => {
                    setNoticeText(e.target.value)
                    autoResizeTextareaOnChange(e)
                  }}
                  rows={12}
                  className="w-full px-4 py-4 pr-14 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none leading-relaxed"
                />
                <button
                  onClick={() => handleOpenStructuredAIChat('summary', 'Notice of Motion', noticeText)}
                  disabled={!caseData?.id}
                  className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-purple-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${!caseData?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={caseData?.id ? 'AI Edit Assistant' : 'Access from case dashboard to enable AI editing'}
                >
                  <svg className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Memorandum of Points and Authorities Card */}
      {motionFormData && (
        <div className="glass-card p-6 rounded-2xl shadow-lg border border-purple-100">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleCardSection('memorandum')}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-xl">
                <BookOpen className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Memorandum of Points and Authorities</h3>
                <p className="text-sm text-gray-600">Legal argument and supporting authority</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                Memo P&A
              </span>
              {expandedSections.memorandum ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
          
          {expandedSections.memorandum && (
            <div className="mt-4 space-y-6">
              {/* Introduction */}
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                <label className="block text-sm font-bold text-indigo-900 mb-2">
                  I. INTRODUCTION
                </label>
                <div className="relative">
                  <textarea
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                    value={memorandum.introduction}
                    onChange={(e) => {
                      setMemorandum(prev => ({ ...prev, introduction: e.target.value }))
                      autoResizeTextareaOnChange(e)
                    }}
                    placeholder="Provide a brief overview of the motion and what the Court should grant..."
                    rows={4}
                    className="w-full px-4 py-3 pr-14 rounded-xl border border-indigo-200 bg-white text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                  />
                  <button
                    onClick={() => handleOpenStructuredAIChat('introduction', 'Introduction', memorandum.introduction)}
                    disabled={!caseData?.id}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${!caseData?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={caseData?.id ? 'AI Edit Assistant' : 'Access from case dashboard to enable AI editing'}
                  >
                    <svg className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Facts */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <label className="block text-sm font-bold text-amber-900 mb-2">
                  II. STATEMENT OF FACTS
                </label>
                <div className="relative">
                  <textarea
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                    value={memorandum.facts}
                    onChange={(e) => {
                      setMemorandum(prev => ({ ...prev, facts: e.target.value }))
                      autoResizeTextareaOnChange(e)
                    }}
                    placeholder="Describe the relevant facts of the case that support your motion..."
                    rows={6}
                    className="w-full px-4 py-3 pr-14 rounded-xl border border-amber-200 bg-white text-gray-900 placeholder-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none"
                  />
                  <button
                    onClick={() => handleOpenStructuredAIChat('facts', 'Statement of Facts', memorandum.facts)}
                    disabled={!caseData?.id}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-amber-600 to-orange-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${!caseData?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={caseData?.id ? 'AI Edit Assistant' : 'Access from case dashboard to enable AI editing'}
                  >
                    <svg className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Law */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <label className="block text-sm font-bold text-green-900 mb-2">
                  III. APPLICABLE LAW
                </label>
                <div className="relative">
                  <textarea
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                    value={memorandum.law}
                    onChange={(e) => {
                      setMemorandum(prev => ({ ...prev, law: e.target.value }))
                      autoResizeTextareaOnChange(e)
                    }}
                    placeholder="Cite the relevant statutes, rules, and case law that apply to your motion..."
                    rows={4}
                    className="w-full px-4 py-3 pr-14 rounded-xl border border-green-200 bg-white text-gray-900 placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 resize-none"
                  />
                  <button
                    onClick={() => handleOpenStructuredAIChat('law', 'Applicable Law', memorandum.law)}
                    disabled={!caseData?.id}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-green-600 to-teal-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${!caseData?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={caseData?.id ? 'AI Edit Assistant' : 'Access from case dashboard to enable AI editing'}
                  >
                    <svg className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Argument */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <label className="block text-sm font-bold text-blue-900 mb-2">
                  IV. ARGUMENT
                </label>
                <div className="relative">
                  <textarea
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                    value={memorandum.argument}
                    onChange={(e) => {
                      setMemorandum(prev => ({ ...prev, argument: e.target.value }))
                      autoResizeTextareaOnChange(e)
                    }}
                    placeholder="Present your main legal argument..."
                    rows={4}
                    className="w-full px-4 py-3 pr-14 rounded-xl border border-blue-200 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                  <button
                    onClick={() => handleOpenStructuredAIChat('argument', 'Legal Argument', memorandum.argument)}
                    disabled={!caseData?.id}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-purple-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${!caseData?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={caseData?.id ? 'AI Edit Assistant' : 'Access from case dashboard to enable AI editing'}
                  >
                    <svg className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                    </svg>
                  </button>
                </div>

                {/* Argument Subsections */}
                {memorandum.argumentSubsections.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {memorandum.argumentSubsections.map((sub) => (
                      <div key={sub.id} className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-blue-800">{sub.letter}.</span>
                          <input
                            type="text"
                            value={sub.title}
                            onChange={(e) => updateArgumentSubsection(sub.id, 'title', e.target.value)}
                            placeholder="Subsection Title"
                            className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          />
            <button
                            onClick={() => removeArgumentSubsection(sub.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            >
                            <Trash2 className="w-4 h-4" />
            </button>
                        </div>
                        <textarea
                          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                          value={sub.content}
                          onChange={(e) => {
                            updateArgumentSubsection(sub.id, 'content', e.target.value)
                            autoResizeTextareaOnChange(e)
                          }}
                          placeholder="Subsection content..."
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-blue-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
                        />
                      </div>
                    ))}
                  </div>
                )}

            <button
                  onClick={addArgumentSubsection}
                  className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
                  <Plus className="w-4 h-4" />
                  Add Argument Subsection
            </button>
          </div>

              {/* Conclusion */}
              <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                <label className="block text-sm font-bold text-rose-900 mb-2">
                  V. CONCLUSION
                </label>
                <div className="relative">
                  <textarea
                    ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                    value={memorandum.conclusion}
                    onChange={(e) => {
                      setMemorandum(prev => ({ ...prev, conclusion: e.target.value }))
                      autoResizeTextareaOnChange(e)
                    }}
                    placeholder="Summarize your argument and request the Court grant the motion..."
                    rows={3}
                    className="w-full px-4 py-3 pr-14 rounded-xl border border-rose-200 bg-white text-gray-900 placeholder-gray-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 resize-none"
                  />
                  <button
                    onClick={() => handleOpenStructuredAIChat('conclusion', 'Conclusion', memorandum.conclusion)}
                    disabled={!caseData?.id}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-rose-600 to-pink-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${!caseData?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={caseData?.id ? 'AI Edit Assistant' : 'Access from case dashboard to enable AI editing'}
                  >
                    <svg className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                    </svg>
                  </button>
                </div>
        </div>
            </div>
          )}
        </div>
      )}

      {/* Attorney Declaration Card */}
      {motionFormData && (
        <div className="glass-card p-6 rounded-2xl shadow-lg border border-cyan-100">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleCardSection('declaration')}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-100 rounded-xl">
                <FileText className="w-6 h-6 text-cyan-700" />
            </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Declaration of Attorney</h3>
                <p className="text-sm text-gray-600">Supporting declaration with numbered facts</p>
          </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-sm font-medium rounded-full">
                Declaration
              </span>
              {expandedSections.declaration ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </div>
          
          {expandedSections.declaration && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Declarant Name</label>
                  <input
                    type="text"
                    value={declaration.declarantName}
                    onChange={(e) => setDeclaration(prev => ({ ...prev, declarantName: e.target.value }))}
                    placeholder="Attorney Name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
          </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State Bar Number</label>
                  <input
                    type="text"
                    value={declaration.barNumber}
                    onChange={(e) => setDeclaration(prev => ({ ...prev, barNumber: e.target.value }))}
                    placeholder="123456"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                  />
        </div>
      </div>

              {/* Declaration Facts */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Declaration Facts (Numbered Paragraphs)</label>
                {declaration.facts.map((fact, index) => (
                  <div key={fact.id} className="flex gap-2 items-start">
                    <span className="pt-3 text-gray-600 font-medium w-8">{fact.number}.</span>
                    <textarea
                      ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
                      value={fact.content}
                      onChange={(e) => {
                        updateDeclarationFact(fact.id, e.target.value)
                        autoResizeTextareaOnChange(e)
                      }}
                      placeholder={index === 0 ? "I am an attorney at law duly admitted to practice before all courts of the State of California..." : "State a fact supporting the motion..."}
                      rows={2}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none"
                    />
                    {declaration.facts.length > 1 && (
                      <button
                        onClick={() => removeDeclarationFact(fact.id)}
                        className="pt-3 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addDeclarationFact}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Fact
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
        <span className="text-gray-600 text-sm font-medium">Motion Sections</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
      </div>

      {/* Section Cards - Drag and Drop (AI-generated sections not covered by structured cards) */}
      <div className="flex flex-col gap-6">
        {sections.filter(s => 
          // Filter out sections covered by the structured cards above
          s.type !== 'caption' && 
          s.type !== 'notice' && 
          s.type !== 'memorandum' && 
          s.type !== 'introduction' && 
          s.type !== 'statement-of-facts' && 
          s.type !== 'legal-argument' && 
          s.type !== 'point-heading' && 
          s.type !== 'conclusion' && 
          s.type !== 'declaration' &&
          s.type !== 'proof-of-service'
        ).map((section, index) => {
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
      <div className="flex justify-center gap-4">
        <button
          onClick={addSection}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          + Add Section
        </button>
        
        {/* Proof of Service Toggle */}
        <button
          onClick={() => setShowProofOfService(!showProofOfService)}
          className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
            showProofOfService 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {showProofOfService ? '✓ Proof of Service Added' : '+ Add Proof of Service'}
        </button>
      </div>

      {/* Proof of Service Card */}
      {showProofOfService && (
        <div className="glass-strong p-6 rounded-2xl border-2 border-dashed border-green-300">
          <div className="flex justify-between items-start mb-4 gap-3">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900">Proof of Service</h3>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
              Added
            </span>
          </div>
          <div className="relative">
            <textarea
              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }}
              value={generateProofOfServiceText()}
              readOnly
              className="w-full min-h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 resize-none"
            />
          </div>
        </div>
      )}

      {/* Bottom Action Bar - Save Draft, New Motion, and Preview */}
      <div className="glass-strong p-6 rounded-2xl">
        {/* Save Error Message */}
        {saveError && (
          <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {saveError}
          </div>
        )}
        
        <div className="flex gap-4 justify-end items-center">
          {/* Save Draft Button */}
          {!isTrialMode && (
            <button 
              onClick={handleSaveDraft}
              disabled={saving || !caseData?.id}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              } ${!caseData?.id 
                ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border border-gray-200' 
                : saveSuccess 
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title={!caseData?.id ? 'Access from case dashboard to enable saving' : 'Save draft to case'}
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
          
          {/* New Motion Button */}
          <button
            onClick={onNewMotion}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Motion</span>
          </button>
          
          {/* Preview Button */}
          <button 
            onClick={() => setShowPreview(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
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
          setEditingStructuredField(null)
        }}
        sectionId={editingSection?.id || editingStructuredField?.field || ''}
        sectionTitle={editingSection?.title || editingStructuredField?.title || ''}
        currentContent={editingSection?.content || editingStructuredField?.content || ''}
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

      {/* Motion Preview Modal */}
      <MotionPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        motionType={motionType}
        captionData={captionData}
        noticeOfMotion={noticeOfMotion}
        memorandum={memorandum}
        declaration={declaration}
        movingParty={movingParty}
        showProofOfService={showProofOfService}
        proofOfServiceText={generateProofOfServiceText()}
      />
    </div>
  )
}
