'use client'

import { useState, useEffect } from 'react'
import { FileText, Copy, Check, RotateCcw, Plus, FileIcon, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { saveAs } from 'file-saver'
import { CaseFrontend, supabaseCaseStorage, ComplaintSection as StoredComplaintSection } from '@/lib/supabase/caseStorage'
import AIEditChatModal from './AIEditChatModal'

interface ComplaintOutputProps {
  complaint: string
  onNewComplaint: () => void
  caseData?: CaseFrontend | null
}

interface ComplaintSection {
  id: string
  title: string
  content: string
  isExpanded: boolean
  type: 'header' | 'jurisdiction' | 'venue' | 'factual' | 'cause' | 'prayer' | 'jury' | 'signature'
}

export default function ComplaintOutput({ complaint, onNewComplaint, caseData }: ComplaintOutputProps) {
  const [copied, setCopied] = useState(false)
  const [showProofOfService, setShowProofOfService] = useState(false)
  const [sections, setSections] = useState<ComplaintSection[]>([])
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // AI Edit Modal state
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<ComplaintSection | null>(null)

  // State for saving
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load saved sections if they exist, otherwise parse from complaint
  useEffect(() => {
    if (caseData?.complaintSections && caseData.complaintSections.length > 0) {
      // Use saved sections from database
      setSections(caseData.complaintSections as ComplaintSection[])
    } else {
      // Parse from generated complaint
      const parsedSections = parseComplaintIntoSections(complaint)
      setSections(parsedSections)
    }
  }, [complaint, caseData?.complaintSections])

  // Auto-resize textarea helper
  const autoResizeTextarea = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }

  // Parse complaint text into structured sections
  // This version merges causes of action with their allegations
  const parseComplaintIntoSections = (text: string): ComplaintSection[] => {
    const cleanedText = cleanComplaintText(text)
    const lines = cleanedText.split('\n')
    
    const result: ComplaintSection[] = []
    let currentSection: { id: string; title: string; lines: string[]; type: ComplaintSection['type'] } | null = null
    let sectionId = 0
    
    // Header section (attorney info + court header + case caption)
    const headerLines: string[] = []
    let i = 0
    
    // Collect header until we hit jurisdictional allegations or parties
    while (i < lines.length) {
      const line = lines[i].trim()
      if (line.match(/^I\.\s*(Jurisdiction|JURISDICTION)/i) || 
          line.match(/^JURISDICTIONAL\s+ALLEGATIONS/i) ||
          line.match(/^PARTIES/i) ||
          line.match(/^\d+\.\s+This Court/i) ||
          line.match(/^(GENERAL\s+)?ALLEGATIONS/i)) {
        break
      }
      headerLines.push(lines[i])
      i++
    }
    
    // Build header from case data if available, otherwise use parsed header
    if (caseData) {
      const attorneyHeader = buildAttorneyHeader(caseData)
      const caseCaption = buildCaseCaption(caseData)
      result.push({
        id: String(sectionId++),
        title: 'Case Caption & Attorney Header',
        content: attorneyHeader + '\n\n' + caseCaption,
        isExpanded: false,
        type: 'header'
      })
    } else if (headerLines.length > 0) {
      result.push({
        id: String(sectionId++),
        title: 'Case Caption & Attorney Header',
        content: headerLines.join('\n'),
        isExpanded: false,
        type: 'header'
      })
    }
    
    // Track if we've seen general factual allegations
    let inGeneralFactual = false
    let generalFactualContent: string[] = []
    
    // Now parse the rest into sections
    while (i < lines.length) {
      const line = lines[i].trim()
      // Clean line for pattern matching (remove markdown formatting)
      const cleanLine = line.replace(/\*+/g, '').replace(/_+/g, '').replace(/#+/g, '').trim()
      
      // Check for Jurisdiction
      if (cleanLine.match(/^I\.\s*(Jurisdiction|JURISDICTION)/i) || 
          cleanLine.match(/^JURISDICTION/i) ||
          cleanLine.match(/^JURISDICTIONAL\s+ALLEGATIONS/i) ||
          cleanLine.match(/^\d+\.\s+This Court has jurisdiction/i)) {
        if (currentSection) {
          result.push({
            id: String(sectionId++),
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            isExpanded: true,
            type: currentSection.type
          })
        }
        currentSection = { id: String(sectionId), title: 'Jurisdiction', lines: [lines[i]], type: 'jurisdiction' }
      }
      // Check for Venue
      else if (cleanLine.match(/^II\.\s*(Venue|VENUE)/i) || 
               cleanLine.match(/^VENUE/i) ||
               cleanLine.match(/^\d+\.\s+Venue is proper/i)) {
        if (currentSection) {
          result.push({
            id: String(sectionId++),
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            isExpanded: true,
            type: currentSection.type
          })
        }
        currentSection = { id: String(sectionId), title: 'Venue', lines: [lines[i]], type: 'venue' }
      }
      // Check for General Factual Allegations / Parties section - MORE PATTERNS
      else if (cleanLine.match(/^III\.\s*(Parties|PARTIES)/i) || 
               cleanLine.match(/^PARTIES/i) ||
               cleanLine.match(/^(GENERAL\s+)?FACTUAL\s+ALLEGATIONS/i) ||
               cleanLine.match(/^(GENERAL\s+)?ALLEGATIONS/i) ||
               cleanLine.match(/^STATEMENT\s+OF\s+FACTS/i) ||
               cleanLine.match(/^FACTS/i) ||
               cleanLine.match(/^COMMON\s+ALLEGATIONS/i) ||
               cleanLine.match(/^BACKGROUND/i)) {
        if (currentSection) {
          result.push({
            id: String(sectionId++),
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            isExpanded: true,
            type: currentSection.type
          })
        }
        inGeneralFactual = true
        generalFactualContent = [lines[i]]
        currentSection = null
      }
      // Check for CAUSE OF ACTION - this ends general factual and starts cause
      // More robust pattern to catch various AI output formats
      else if (
        // Standard ordinal format: "FIRST CAUSE OF ACTION"
        cleanLine.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH)\s+CAUSE\s+OF\s+ACTION/i) ||
        // Numeric ordinal format: "1st CAUSE OF ACTION", "2nd CAUSE OF ACTION"
        cleanLine.match(/^(1st|2nd|3rd|\d+th)\s+CAUSE\s+OF\s+ACTION/i) ||
        // "CAUSE OF ACTION NO. 1" format
        cleanLine.match(/^CAUSE\s+OF\s+ACTION\s+(NO\.?\s*)?\d+/i) ||
        // Roman numeral format: "I. CAUSE OF ACTION"
        cleanLine.match(/^[IVX]+\.\s*CAUSE\s+OF\s+ACTION/i) ||
        // "COUNT ONE", "COUNT 1" format
        cleanLine.match(/^COUNT\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|\d+)/i) ||
        // Format with COLON: "FIRST CAUSE OF ACTION: Negligence" - common AI output format
        cleanLine.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH)\s+CAUSE\s+OF\s+ACTION\s*:/i) ||
        // Format with dash: "FIRST CAUSE OF ACTION - Negligence"
        cleanLine.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH)\s+CAUSE\s+OF\s+ACTION\s*[-–—]/i) ||
        // Numbered with text: "1. FIRST CAUSE OF ACTION"
        cleanLine.match(/^\d+\.\s*(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+CAUSE\s+OF\s+ACTION/i)
      ) {
        // Save general factual if we have it
        if (inGeneralFactual && generalFactualContent.length > 0) {
          result.push({
            id: String(sectionId++),
            title: 'General Factual Allegations',
            content: generalFactualContent.join('\n'),
            isExpanded: true,
            type: 'factual'
          })
          inGeneralFactual = false
          generalFactualContent = []
        }
        
        // Save previous cause if exists
        if (currentSection && currentSection.type === 'cause') {
          result.push({
            id: String(sectionId++),
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            isExpanded: true,
            type: currentSection.type
          })
        }
        
        // Start new cause of action - include the title
        const causeTitle = line.trim()
        currentSection = { 
          id: String(sectionId), 
          title: causeTitle, 
          lines: [lines[i]],
          type: 'cause'
        }
      }
      // Check for Prayer for Relief
      else if (cleanLine.match(/^PRAYER\s+(FOR\s+RELIEF)?/i) || cleanLine.match(/^WHEREFORE/i)) {
        // Save any pending general factual
        if (inGeneralFactual && generalFactualContent.length > 0) {
          result.push({
            id: String(sectionId++),
            title: 'General Factual Allegations',
            content: generalFactualContent.join('\n'),
            isExpanded: true,
            type: 'factual'
          })
          inGeneralFactual = false
          generalFactualContent = []
        }
        
        if (currentSection) {
          result.push({
            id: String(sectionId++),
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            isExpanded: true,
            type: currentSection.type
          })
        }
        currentSection = { id: String(sectionId), title: 'Prayer for Relief', lines: [lines[i]], type: 'prayer' }
      }
      // Check for Jury Demand
      else if (cleanLine.match(/^JURY\s+DEMAND/i) || cleanLine.match(/^DEMAND\s+FOR\s+JURY/i)) {
        if (currentSection) {
          result.push({
            id: String(sectionId++),
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            isExpanded: true,
            type: currentSection.type
          })
        }
        currentSection = { id: String(sectionId), title: 'Jury Demand', lines: [lines[i]], type: 'jury' }
      }
      // Check for Signature block
      else if (cleanLine.match(/^Dated:/i) || cleanLine.match(/^Respectfully\s+submitted/i)) {
        if (currentSection) {
          result.push({
            id: String(sectionId++),
            title: currentSection.title,
            content: currentSection.lines.join('\n'),
            isExpanded: true,
            type: currentSection.type
          })
        }
        currentSection = { id: String(sectionId), title: 'Signature Block', lines: [lines[i]], type: 'signature' }
      }
      // Continue adding to current section or general factual
      else {
        if (inGeneralFactual) {
          generalFactualContent.push(lines[i])
        } else if (currentSection) {
          currentSection.lines.push(lines[i])
        }
      }
      
      i++
    }
    
    // Add any remaining general factual
    if (inGeneralFactual && generalFactualContent.length > 0) {
      result.push({
        id: String(sectionId++),
        title: 'General Factual Allegations',
        content: generalFactualContent.join('\n'),
        isExpanded: true,
        type: 'factual'
      })
    }
    
    // Add final section
    if (currentSection) {
      result.push({
        id: String(sectionId++),
        title: currentSection.title,
        content: currentSection.lines.join('\n'),
        isExpanded: true,
        type: currentSection.type
      })
    }
    
    return result
  }

  // Build attorney header from case data
  const buildAttorneyHeader = (caseData: CaseFrontend): string => {
    const lines: string[] = []
    
    // Get attorneys from plaintiffs
    if (caseData.plaintiffs && caseData.plaintiffs.length > 0) {
      for (const plaintiff of caseData.plaintiffs) {
        if (plaintiff.attorneys && plaintiff.attorneys.length > 0) {
          for (const attorney of plaintiff.attorneys) {
            if (attorney.name) {
              lines.push(attorney.name.toUpperCase())
              if (attorney.barNumber) {
                lines.push(`(California State Bar No. ${attorney.barNumber})`)
              }
              if (attorney.email) {
                lines.push(attorney.email)
              }
              if (attorney.firm) {
                lines.push(attorney.firm.toUpperCase())
              }
              if (attorney.address) {
                lines.push(attorney.address)
              }
              if (attorney.phone) {
                lines.push(`Telephone: ${attorney.phone}`)
              }
              lines.push('')
            }
          }
        }
      }
    }
    
    if (lines.length === 0) {
      // Default placeholder
      lines.push('[ATTORNEY NAME]')
      lines.push('(California State Bar No. [BAR NUMBER])')
      lines.push('[EMAIL]')
      lines.push('[LAW FIRM NAME]')
      lines.push('[ADDRESS]')
      lines.push('Telephone: [PHONE]')
      lines.push('')
    }
    
    lines.push('Attorney for Plaintiff')
    
    return lines.join('\n')
  }

  // Build case caption from case data
  const buildCaseCaption = (caseData: CaseFrontend): string => {
    const lines: string[] = []
    
    lines.push('SUPERIOR COURT OF CALIFORNIA')
    lines.push(`COUNTY OF ${(caseData.courtCounty || '[COUNTY]').toUpperCase()}`)
    lines.push('')
    
    // Plaintiffs
    if (caseData.plaintiffs && caseData.plaintiffs.length > 0) {
      lines.push(caseData.plaintiffs.map(p => p.name).join(',\n'))
    } else if (caseData.client) {
      lines.push(caseData.client)
    } else {
      lines.push('[PLAINTIFF NAME]')
    }
    lines.push('    Plaintiff' + ((caseData.plaintiffs?.length || 0) > 1 ? 's' : '') + ',')
    lines.push('')
    lines.push('v.')
    lines.push('')
    
    // Defendants
    if (caseData.defendants && caseData.defendants.length > 0) {
      lines.push(caseData.defendants.map(d => d.name).join(',\n'))
    } else {
      lines.push('[DEFENDANT NAME]')
    }
    lines.push('    Defendant' + ((caseData.defendants?.length || 0) > 1 ? 's' : '') + '.')
    lines.push('')
    lines.push(`Case No. ${caseData.caseNumber || '[CASE NUMBER]'}`)
    lines.push('')
    lines.push('COMPLAINT')
    
    return lines.join('\n')
  }

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const toggleSection = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s))
  }

  const removeSection = (id: string) => {
    setSections(prev => {
      const filtered = prev.filter(s => s.id !== id)
      // Renumber after removing
      return renumberSections(filtered)
    })
  }

  const addSection = () => {
    const newId = String(Date.now())
    setSections(prev => [...prev, {
      id: newId,
      title: 'New Section',
      content: '',
      isExpanded: true,
      type: 'factual'
    }])
  }

  const getFullComplaint = () => {
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
        // Renumber after reordering
        return renumberSections(newSections)
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
      const result = await supabaseCaseStorage.updateCase(caseData.id, {
        complaintSections: sections,
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

  // Ordinal words for causes of action
  const ordinalWords = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'THIRTEENTH', 'FOURTEENTH', 'FIFTEENTH']

  // Renumber all paragraph numbers and cause of action ordinals
  const renumberSections = (sectionsToRenumber: ComplaintSection[]): ComplaintSection[] => {
    let paragraphNumber = 1
    let causeNumber = 0

    return sectionsToRenumber.map(section => {
      let newContent = section.content
      let newTitle = section.title

      // Skip header section from paragraph numbering
      if (section.type === 'header') {
        return section
      }

      // Update cause of action ordinal in title and content
      if (section.type === 'cause') {
        const oldOrdinalMatch = section.title.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH)\s+CAUSE\s+OF\s+ACTION/i)
        if (oldOrdinalMatch) {
          const newOrdinal = ordinalWords[causeNumber] || `${causeNumber + 1}TH`
          newTitle = section.title.replace(
            /^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH)\s+CAUSE\s+OF\s+ACTION/i,
            `${newOrdinal} CAUSE OF ACTION`
          )
          // Also update in content
          newContent = section.content.replace(
            /^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH|THIRTEENTH|FOURTEENTH|FIFTEENTH)\s+CAUSE\s+OF\s+ACTION/im,
            `${newOrdinal} CAUSE OF ACTION`
          )
        }
        causeNumber++
      }

      // Renumber paragraphs (matches "1.", "2.", etc. at start of line)
      const lines = newContent.split('\n')
      const renumberedLines = lines.map(line => {
        // Match paragraph numbers at the start of a line (with possible leading whitespace)
        const match = line.match(/^(\s*)(\d+)\.\s+(.*)$/)
        if (match) {
          const [, whitespace, , rest] = match
          const newLine = `${whitespace}${paragraphNumber}. ${rest}`
          paragraphNumber++
          return newLine
        }
        return line
      })
      newContent = renumberedLines.join('\n')

      return {
        ...section,
        title: newTitle,
        content: newContent
      }
    })
  }

  // Function to clean up markdown formatting from AI-generated text
  const cleanComplaintText = (text: string) => {
    return text
      .replace(/^```plaintext\s*/i, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .replace(/^'''/m, '')
      .replace(/'''\s*$/m, '')
      .trim()
  }

  const proofOfServiceText = `PROOF OF SERVICE

STATE OF CALIFORNIA, COUNTY OF [COUNTY NAME]

At the time of service, I was over 18 years of age and not a party to this action. I am employed in the County of [COUNTY NAME], State of California. My business address is [ADDRESS], California.

On [DATE], I served true copies of the following document(s) described as COMPLAINT on the interested parties in this action as follows:

BY E-MAIL OR ELECTRONIC TRANSMISSION: I caused a copy of the document(s) to be sent from e-mail address [EMAIL] to the persons at the e-mail addresses listed in the Service List. I did not receive, within a reasonable time after the transmission, any electronic message or other indication that the transmission was unsuccessful.

I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.

Executed on [DATE], at [CITY], California.



                                                    ________________________________
                                                    [NAME]`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullComplaint())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownloadWord = async () => {
    try {
      const cleanedComplaint = cleanComplaintText(getFullComplaint())
      const complaintLines = cleanedComplaint.split('\n')
      const allContent = [...complaintLines]
      
      if (showProofOfService) {
        allContent.push('', ...proofOfServiceText.split('\n'))
      }
      
      const paragraphs = allContent.map((line) => {
        let alignment: "left" | "center" | "right" | undefined = "left"
        let bold = false
        let indentFirst = 0.5

        if (line === 'SUPERIOR COURT OF CALIFORNIA' || 
            line.includes('COUNTY OF') ||
            line === 'COMPLAINT' || 
            line === 'PARTIES') {
          alignment = "center"
          bold = true
          indentFirst = 0
        }

        if (line.match(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+CAUSE\s+OF\s+ACTION/i)) {
          bold = true
          alignment = "center"
          indentFirst = 0
        }

        if (line === 'PRAYER FOR RELIEF' || line === 'JURY DEMAND') {
          bold = true
          indentFirst = 0
        }
        
        return new Paragraph({
          children: [
            new TextRun({
              text: line || ' ',
              font: 'Times New Roman',
              size: 24,
              bold: bold
            })
          ],
          alignment: alignment,
          indent: {
            firstLine: indentFirst * 1440
          },
          spacing: {
            line: 480,
            lineRule: "auto"
          }
        })
      })

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 1080,
                  right: 1440,
                  bottom: 1080,
                  left: 1440
                }
              }
            },
            children: paragraphs
          }
        ]
      })

      const buffer = await Packer.toBuffer(doc)
      const fileName = showProofOfService 
        ? `Complaint-with-Proof-of-Service-${new Date().toISOString().slice(0, 10)}.docx`
        : `Complaint-${new Date().toISOString().slice(0, 10)}.docx`
      
      const blob = new Blob([new Uint8Array(buffer)], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      saveAs(blob, fileName)
    } catch (err) {
      console.error('Failed to generate Word document:', err)
      alert('Failed to generate Word document. Please try copying the text instead.')
    }
  }

  const handleAddProofOfService = () => {
    setShowProofOfService(!showProofOfService)
  }

  // AI Edit handlers
  const handleOpenAIChat = (section: ComplaintSection) => {
    setEditingSection(section)
    setAiChatOpen(true)
  }

  const handleApplyAIEdit = (newContent: string) => {
    if (editingSection) {
      updateSection(editingSection.id, 'content', newContent)
    }
  }

  // Get section badge color based on type
  const getSectionBadge = (type: ComplaintSection['type']) => {
    switch (type) {
      case 'header':
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Header' }
      case 'jurisdiction':
        return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Jurisdiction' }
      case 'venue':
        return { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Venue' }
      case 'factual':
        return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Factual Allegations' }
      case 'cause':
        return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Cause of Action' }
      case 'prayer':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Prayer' }
      case 'jury':
        return { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Jury Demand' }
      case 'signature':
        return { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Signature' }
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
            <h2 className="text-2xl font-bold text-gray-900">Generated Complaint</h2>
          </div>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              <span className="text-sm">{copied ? 'Copied!' : 'Copy All'}</span>
            </button>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="text-sm">Save Draft</span>
                </>
              )}
            </button>
            <button
              onClick={handleAddProofOfService}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full font-semibold transition-all duration-300 ${
                showProofOfService 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">{showProofOfService ? 'Remove' : 'Add'} Proof of Service</span>
            </button>
            <button
              onClick={handleDownloadWord}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <FileIcon className="w-4 h-4" />
              <span className="text-sm">Download Word</span>
            </button>
            <button
              onClick={onNewComplaint}
              className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm">New Complaint</span>
            </button>
          </div>
        </div>

        {/* Save Error Message */}
        {saveError && (
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
            <span className="text-green-800 font-medium">
              Complaint generated successfully!
            </span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            Edit each section below. Drag and drop to reorder. Each cause of action includes its allegations.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
        <span className="text-gray-600 text-sm font-medium">Complaint Sections</span>
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
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${
                      !caseData?.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label="AI Edit Assistant"
                    title={caseData?.id ? 'Open AI Edit Assistant - Edit this section interactively' : 'Access from case dashboard to enable AI editing'}
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
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          + Add Section
        </button>
      </div>

      {/* Proof of Service Card (if enabled) */}
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
              value={proofOfServiceText}
              readOnly
              className="w-full min-h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 resize-none"
            />
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-medium text-amber-800 mb-2">⚠️ Legal Disclaimer</h4>
        <p className="text-amber-800 text-sm">
          This document is AI-generated and should be reviewed by a qualified attorney before filing. 
          The content may require modifications to meet specific jurisdictional requirements and 
          case-specific details. Always consult with legal counsel for proper legal advice.
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
      />
    </div>
  )
}
