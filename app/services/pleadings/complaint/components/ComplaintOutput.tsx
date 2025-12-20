'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FileText, Check, RotateCcw, Plus, FileIcon, ChevronDown, ChevronUp, X, ListOrdered, Eye } from 'lucide-react'
import { CaseFrontend, supabaseCaseStorage, ComplaintSection } from '@/lib/supabase/caseStorage'
import { downloadComplaintDocument, ComplaintData } from '@/lib/docx-generator'
import { userProfileStorage, UserProfile } from '@/lib/supabase/userProfileStorage'
import AIEditChatModal from './AIEditChatModal'
import CaseCaptionCard, { CaseCaptionData } from './CaseCaptionCard'
import PreviewModal from './PreviewModal'

interface ComplaintOutputProps {
  complaint: string
  onNewComplaint: () => void
  caseData?: CaseFrontend | null
  // Trial mode props
  isTrialMode?: boolean
  trialSections?: ComplaintSection[]
  onTrialSectionsChange?: (sections: ComplaintSection[]) => void
}

// Regex to match valid UUIDs (for security validation)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function ComplaintOutput({ 
  complaint, 
  onNewComplaint, 
  caseData,
  isTrialMode = false,
  trialSections = [],
  onTrialSectionsChange
}: ComplaintOutputProps) {
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

  // Track if we've initialized from trial sections
  const initializedFromTrial = useRef(false)

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)

  // User profile for fallback attorney info
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)

  // Case Caption Card state
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
    includeDoes: caseData?.includeDoes ?? true,
    county: caseData?.courtCounty || 'Los Angeles',
    caseNumber: caseData?.caseNumber || '',
    judgeName: caseData?.judgeName || '',
    departmentNumber: caseData?.departmentNumber || '',
    documentType: 'COMPLAINT',
    demandJuryTrial: true,
    complaintFiledDate: caseData?.complaintFiledDate || '',
    trialDate: caseData?.trialDate || '',
    causesOfAction: [],
  })

  // Helper function to extract cause of action names from sections
  const extractCausesOfAction = useCallback((sectionsList: ComplaintSection[]): string[] => {
    return sectionsList
      .filter(s => s.type === 'cause')
      .map(s => {
        // Try to extract the cause name from title like "FIRST CAUSE OF ACTION: Negligence (CACI 400)"
        // or "FIRST CAUSE OF ACTION (Negligence - CACI 400)"
        const titleClean = s.title.replace(/\*+/g, '').trim()
        
        // Pattern 1: "FIRST CAUSE OF ACTION: Cause Name (CACI XXX)" - extract everything after colon including CACI
        const colonMatch = titleClean.match(/CAUSE\s+OF\s+ACTION\s*[:\-–—]\s*(.+)/i)
        if (colonMatch) {
          return colonMatch[1].trim().toUpperCase()
        }
        
        // Pattern 2: "FIRST CAUSE OF ACTION (Cause Name - CACI 400)" - extract from parentheses
        const parenMatch = titleClean.match(/CAUSE\s+OF\s+ACTION[^(]*\(([^)]+)\)/i)
        if (parenMatch) {
          return parenMatch[1].trim().toUpperCase()
        }
        
        // Pattern 3: Check if cause name is in the content (first line starting with parentheses)
        if (s.content) {
          const contentLines = s.content.split('\n')
          for (const line of contentLines) {
            const trimmedLine = line.trim()
            const contentParenMatch = trimmedLine.match(/^\(([^)]+)\)/)
            if (contentParenMatch) {
              return contentParenMatch[1].trim().toUpperCase()
            }
          }
        }
        
        // Pattern 4: Just strip ordinal prefix and "CAUSE OF ACTION" text
        const stripped = titleClean.replace(/^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH)\s+CAUSE\s+OF\s+ACTION\s*/i, '').trim()
        if (stripped) {
          return stripped.toUpperCase()
        }
        
        // Fallback: return the ordinal (e.g., "FIRST CAUSE OF ACTION")
        return titleClean.toUpperCase()
      })
      .filter(Boolean)
  }, [])

  // Load user profile for fallback attorney info (logged-in users only)
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!isTrialMode) {
        try {
          const profile = await userProfileStorage.getProfile()
          if (profile) {
            setUserProfile(profile)
          }
        } catch (error) {
          console.error('Error loading user profile:', error)
        }
      }
    }
    loadUserProfile()
  }, [isTrialMode])

  // Initialize caption data from caseData (with userProfile fallback)
  useEffect(() => {
    if (caseData) {
      // Extract all attorneys from all plaintiffs
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

      // Use user profile as fallback if no attorneys in case
      const fallbackAttorneys = userProfile && allAttorneys.length === 0 ? [{
        id: '1',
        name: userProfile.fullName || '',
        barNumber: userProfile.barNumber || '',
        firm: userProfile.firmName || '',
        address: userProfile.firmAddress || '',
        phone: userProfile.firmPhone || '',
        fax: '',
        email: userProfile.firmEmail || '',
      }] : null

      setCaptionData(prev => ({
        ...prev,
        attorneys: allAttorneys.length > 0 ? allAttorneys : (fallbackAttorneys || prev.attorneys),
        plaintiffs: caseData.plaintiffs?.map(p => p.name).filter(Boolean) || 
                    (caseData.client ? [caseData.client] : prev.plaintiffs),
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
  }, [caseData, userProfile])

  // Populate caption with user profile if no case data (logged-in users)
  useEffect(() => {
    if (!isTrialMode && userProfile && !caseData) {
      setCaptionData(prev => ({
        ...prev,
        attorneys: [{
          id: '1',
          name: userProfile.fullName || '',
          barNumber: userProfile.barNumber || '',
          firm: userProfile.firmName || '',
          address: userProfile.firmAddress || '',
          phone: userProfile.firmPhone || '',
          fax: '',
          email: userProfile.firmEmail || '',
        }],
      }))
    }
  }, [isTrialMode, userProfile, caseData])

  // Debounced save for caption fields
  const saveCaptionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Handler for CaseCaptionCard changes
  const handleCaptionChange = useCallback((data: CaseCaptionData) => {
    setCaptionData(data)
    // Update the header section content with the new data
    setSections(prev => prev.map(section => {
      if (section.type === 'header') {
        const headerContent = buildHeaderContent(data)
        return { ...section, content: headerContent }
      }
      return section
    }))
    
    // Auto-save caption fields to database (debounced)
    if (caseData?.id && !isTrialMode) {
      if (saveCaptionTimeoutRef.current) {
        clearTimeout(saveCaptionTimeoutRef.current)
      }
      saveCaptionTimeoutRef.current = setTimeout(async () => {
        try {
          await supabaseCaseStorage.updateCase(caseData.id, {
            judgeName: data.judgeName || undefined,
            departmentNumber: data.departmentNumber || undefined,
            complaintFiledDate: data.complaintFiledDate || undefined,
            trialDate: data.trialDate || undefined,
            includeDoes: data.includeDoes,
          })
        } catch (err) {
          console.error('Failed to auto-save caption fields:', err)
        }
      }, 1000) // 1 second debounce
    }
  }, [caseData?.id, isTrialMode])

  // Build header content from caption data
  const buildHeaderContent = (data: CaseCaptionData): string => {
    const lines: string[] = []
    
    // Attorney info (use first attorney for header display)
    const primaryAttorney = data.attorneys[0]
    if (primaryAttorney?.name) {
      lines.push(`${primaryAttorney.name.toUpperCase()}, State Bar No. ${primaryAttorney.barNumber}`)
    }
    if (primaryAttorney?.email) lines.push(primaryAttorney.email)
    if (primaryAttorney?.firm) lines.push(primaryAttorney.firm.toUpperCase())
    if (primaryAttorney?.address) lines.push(primaryAttorney.address)
    if (primaryAttorney?.phone) lines.push(`Telephone: ${primaryAttorney.phone}`)
    lines.push('')
    
    // Join plaintiff names
    const plaintiffNames = data.plaintiffs.filter(Boolean).join(', ') || '[PLAINTIFF NAME]'
    lines.push(`Attorney for Plaintiff ${plaintiffNames}`)
    lines.push('')
    
    // Court header
    lines.push('SUPERIOR COURT OF CALIFORNIA')
    lines.push(`COUNTY OF ${data.county.toUpperCase()}`)
    lines.push('')
    
    // Parties
    lines.push(plaintiffNames)
    lines.push(`    Plaintiff${data.plaintiffs.filter(Boolean).length > 1 ? 's' : ''},`)
    lines.push('')
    lines.push('v.')
    lines.push('')
    const defendantNames = data.defendants.filter(Boolean).join(', ') || '[DEFENDANT NAME]'
    lines.push(defendantNames)
    lines.push(`    Defendant${data.defendants.filter(Boolean).length > 1 ? 's' : ''}.`)
    lines.push('')
    lines.push(`Case No. ${data.caseNumber}`)
    lines.push('')
    lines.push(data.documentType)
    if (data.demandJuryTrial) {
      lines.push('[DEMAND FOR JURY TRIAL]')
    }
    
    return lines.join('\n')
  }

  // Load saved sections if they exist, otherwise parse from complaint
  useEffect(() => {
    if (isTrialMode && trialSections.length > 0 && !initializedFromTrial.current) {
      // Use trial sections if in trial mode
      setSections(trialSections)
      initializedFromTrial.current = true
    } else if (!isTrialMode && caseData?.complaintSections && caseData.complaintSections.length > 0) {
      // Use saved sections from database
      let savedSections = caseData.complaintSections as ComplaintSection[]
      
      // Ensure General Factual Allegations exists in saved sections
      const hasGeneralFactual = savedSections.some(s => s.type === 'factual' && s.title.toLowerCase().includes('general'))
      
      if (!hasGeneralFactual) {
        const headerIndex = savedSections.findIndex(s => s.type === 'header')
        const jurisdictionIndex = savedSections.findIndex(s => s.type === 'jurisdiction')
        const venueIndex = savedSections.findIndex(s => s.type === 'venue')
        const firstCauseIndex = savedSections.findIndex(s => s.type === 'cause')
        
        let insertIndex = 1
        if (venueIndex >= 0) insertIndex = venueIndex + 1
        else if (jurisdictionIndex >= 0) insertIndex = jurisdictionIndex + 1
        else if (headerIndex >= 0) insertIndex = headerIndex + 1
        
        if (firstCauseIndex >= 0 && insertIndex > firstCauseIndex) insertIndex = firstCauseIndex
        if (insertIndex > savedSections.length) insertIndex = savedSections.length
        
        savedSections = [
          ...savedSections.slice(0, insertIndex),
          {
            id: String(Date.now()),
            title: 'General Factual Allegations',
            content: 'The following allegations are common to all causes of action:\n\n1. [Add factual allegations that apply to all causes of action]',
            isExpanded: true,
            type: 'factual'
          },
          ...savedSections.slice(insertIndex)
        ]
      }
      
      setSections(savedSections)
    } else if (complaint) {
      // Parse from generated complaint
      const parsedSections = parseComplaintIntoSections(complaint)
      setSections(parsedSections)
    }
  }, [complaint, caseData?.complaintSections, isTrialMode, trialSections])

  // Notify parent of section changes in trial mode (with debounce)
  useEffect(() => {
    if (isTrialMode && onTrialSectionsChange && sections.length > 0) {
      // Debounce to avoid too many updates
      const timer = setTimeout(() => {
        onTrialSectionsChange(sections)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [sections, isTrialMode, onTrialSectionsChange])

  // Update causesOfAction in captionData when sections change
  useEffect(() => {
    if (sections.length > 0) {
      const causes = extractCausesOfAction(sections)
      setCaptionData(prev => {
        // Only update if causes actually changed to avoid infinite loops
        if (JSON.stringify(prev.causesOfAction) !== JSON.stringify(causes)) {
          return { ...prev, causesOfAction: causes }
        }
        return prev
      })
    }
  }, [sections, extractCausesOfAction])

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
    
    // Build header from case data if available (and not trial mode), otherwise use parsed header
    if (caseData && !isTrialMode) {
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
        let causeTitle = line.trim()
        const causeLines = [lines[i]]
        
        // Look ahead to check if next line is a parenthetical cause name like "(Negligence)"
        // or a cause name line like "Negligence" or "NEGLIGENCE"
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim()
          const nextCleanLine = nextLine.replace(/\*+/g, '').trim()
          
          // Check if next line is a parenthetical cause name
          if (nextCleanLine.match(/^\([^)]+\)$/)) {
            // Append the cause name to the title
            causeTitle = `${causeTitle} ${nextCleanLine}`
            causeLines.push(lines[i + 1])
            i++ // Skip the next line since we've incorporated it
          }
          // Check if next line is just a cause name (not numbered paragraph)
          else if (nextCleanLine && !nextCleanLine.match(/^\d+\./) && nextCleanLine.length < 100 && !nextCleanLine.match(/^(plaintiff|defendant|on or about|at all)/i)) {
            // Check if it looks like a cause name (short, no period at end usually)
            const looksLikeCauseName = nextCleanLine.match(/^[A-Z][A-Za-z\s\-–—]+$/) || 
                                        nextCleanLine.match(/^[A-Z][A-Za-z\s\-–—]+\s*[-–—]\s*CACI/i) ||
                                        nextCleanLine.match(/negligence|breach|fraud|conversion|assault|battery|trespass|nuisance|defamation|infliction/i)
            if (looksLikeCauseName) {
              causeTitle = `${causeTitle}: ${nextCleanLine}`
              causeLines.push(lines[i + 1])
              i++ // Skip the next line since we've incorporated it
            }
          }
        }
        
        currentSection = { 
          id: String(sectionId), 
          title: causeTitle, 
          lines: causeLines,
          type: 'cause'
        }
      }
      // Check for Prayer for Relief
      else if (cleanLine.match(/^PRAYER\s+(FOR\s+RELIEF)?/i) || cleanLine.match(/^WHEREFORE/i)) {
        // Only create new prayer section if we're NOT already in a prayer section
        if (currentSection?.type === 'prayer') {
          // Already in prayer section, just add this line to it
          currentSection.lines.push(lines[i])
        } else {
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
    
    // Ensure General Factual Allegations section exists between Jurisdiction and First Cause
    const hasGeneralFactual = result.some(s => s.type === 'factual' && s.title.toLowerCase().includes('general'))

    if (!hasGeneralFactual) {
      // Find the best position: after header/jurisdiction/venue, before causes
      const headerIndex = result.findIndex(s => s.type === 'header')
      const jurisdictionIndex = result.findIndex(s => s.type === 'jurisdiction')
      const venueIndex = result.findIndex(s => s.type === 'venue')
      const firstCauseIndex = result.findIndex(s => s.type === 'cause')
      
      // Determine insert position
      let insertIndex = 1 // Default: after header
      if (venueIndex >= 0) {
        insertIndex = venueIndex + 1
      } else if (jurisdictionIndex >= 0) {
        insertIndex = jurisdictionIndex + 1
      } else if (headerIndex >= 0) {
        insertIndex = headerIndex + 1
      }
      
      // If there's a first cause, make sure we insert before it
      if (firstCauseIndex >= 0 && insertIndex > firstCauseIndex) {
        insertIndex = firstCauseIndex
      }
      
      // Make sure we don't insert beyond array bounds
      if (insertIndex > result.length) {
        insertIndex = result.length
      }
      
      result.splice(insertIndex, 0, {
        id: String(sectionId++),
        title: 'General Factual Allegations',
        content: 'The following allegations are common to all causes of action:\n\n1. [Add factual allegations that apply to all causes of action]',
        isExpanded: true,
        type: 'factual'
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

  // Renumber all paragraphs across all sections
  const handleRenumberAll = () => {
    setSections(prev => renumberSections(prev))
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

  // Save draft - supports both trial mode and authenticated mode
  const handleSaveDraft = async () => {
    // TRIAL MODE: Save to session storage via parent callback
    if (isTrialMode) {
      if (onTrialSectionsChange) {
        onTrialSectionsChange(sections)
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      return
    }

    // AUTHENTICATED MODE: Save to database
    if (!caseData?.id) {
      setSaveError('No case selected. Please access this page from the case dashboard.')
      setTimeout(() => setSaveError(null), 5000)
      return
    }

    // SECURITY: Verify this is a valid UUID (real case ID) before database operations
    if (!UUID_REGEX.test(caseData.id)) {
      console.warn('[SECURITY] Attempted to save non-UUID case ID to database - blocked')
      setSaveError('Invalid case ID. Cannot save to database.')
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
  // Prayer for Relief uses separate numbering that starts from 1
  const renumberSections = (sectionsToRenumber: ComplaintSection[]): ComplaintSection[] => {
    let paragraphNumber = 1
    let prayerNumber = 1
    let causeNumber = 0
    let inPrayerSection = false

    return sectionsToRenumber.map(section => {
      let newContent = section.content
      let newTitle = section.title

      // Skip header section from paragraph numbering
      if (section.type === 'header') {
        return section
      }

      // Check if we're entering Prayer for Relief section
      if (section.type === 'prayer' || section.title.toLowerCase().includes('prayer')) {
        inPrayerSection = true
        prayerNumber = 1 // Reset prayer numbering
      }

      // Update cause of action ordinal in title and content
      if (section.type === 'cause') {
        inPrayerSection = false // Reset - we're back in main body
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
          // Use prayer numbering for Prayer for Relief section, body numbering otherwise
          const currentNumber = inPrayerSection ? prayerNumber : paragraphNumber
          const newLine = `${whitespace}${currentNumber}. ${rest}`
          if (inPrayerSection) {
            prayerNumber++
          } else {
            paragraphNumber++
          }
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

  // Auto-populate Proof of Service with case data
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const primaryAttorney = captionData.attorneys[0]
  const countyName = captionData.county?.toUpperCase() || '[COUNTY NAME]'
  const attorneyAddress = primaryAttorney?.address || '[ADDRESS]'
  const attorneyEmail = primaryAttorney?.email || '[EMAIL]'
  const attorneyName = primaryAttorney?.name || '[NAME]'
  // Extract city from address (typically last part before state/zip)
  const cityMatch = attorneyAddress.match(/,\s*([^,]+),?\s*(?:CA|California)/i)
  const cityName = cityMatch ? cityMatch[1].trim() : captionData.county || '[CITY]'

  const proofOfServiceText = `PROOF OF SERVICE

STATE OF CALIFORNIA, COUNTY OF ${countyName}

At the time of service, I was over 18 years of age and not a party to this action. I am employed in the County of ${countyName}, State of California. My business address is ${attorneyAddress}.

On ${currentDate}, I served true copies of the following document(s) described as COMPLAINT on the interested parties in this action as follows:

BY E-MAIL OR ELECTRONIC TRANSMISSION: I caused a copy of the document(s) to be sent from e-mail address ${attorneyEmail} to the persons at the e-mail addresses listed in the Service List. I did not receive, within a reasonable time after the transmission, any electronic message or other indication that the transmission was unsuccessful.

I declare under penalty of perjury under the laws of the State of California that the foregoing is true and correct.

Executed on ${currentDate}, at ${cityName}, California.



                                                    ________________________________
                                                    ${attorneyName}`

  const handleDownloadWord = async () => {
    try {
      // Exclude header section from complaint text (docx-generator creates its own formatted header)
      const bodyContent = sections
        .filter(s => s.type !== 'header')
        .map(s => s.content)
        .join('\n\n')
      const cleanedComplaint = cleanComplaintText(bodyContent)
      
      // Join multiple plaintiffs/defendants for the Word document
      const plaintiffNames = captionData.plaintiffs.filter(Boolean).join(', ') || '[PLAINTIFF NAME]'
      const defendantNames = captionData.defendants.filter(Boolean).join(', ') || '[DEFENDANT NAME]'
      
      // Use first attorney for Word document header (primary attorney)
      const primaryAttorney = captionData.attorneys[0]
      
      // Format defendant names with Does if enabled
      const defendantDisplay = captionData.includeDoes 
        ? `${defendantNames}; and DOES 1 through 50, inclusive`
        : defendantNames
      
      // Use captionData from CaseCaptionCard for all header fields
      const complaintData: ComplaintData = {
        plaintiffName: plaintiffNames,
        defendantName: defendantDisplay,
        complaintText: cleanedComplaint,
        attorneyName: primaryAttorney?.name || undefined,
        stateBarNumber: primaryAttorney?.barNumber || undefined,
        email: primaryAttorney?.email || undefined,
        lawFirmName: primaryAttorney?.firm || undefined,
        address: primaryAttorney?.address || undefined,
        phone: primaryAttorney?.phone || undefined,
        fax: primaryAttorney?.fax || undefined,
        county: captionData.county || 'LOS ANGELES',
        caseNumber: captionData.caseNumber || undefined,
        judgeName: captionData.judgeName || undefined,
        departmentNumber: captionData.departmentNumber || undefined,
        complaintFiledDate: captionData.complaintFiledDate || undefined,
        trialDate: captionData.trialDate || undefined,
        includeProofOfService: showProofOfService,
        proofOfServiceText: showProofOfService ? proofOfServiceText : undefined,
      }
      
      await downloadComplaintDocument(complaintData)
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

  // Determine if save/AI buttons should be enabled
  // In trial mode: always enabled
  // In authenticated mode: only if case ID exists
  const canSave = isTrialMode || !!caseData?.id
  const canUseAI = isTrialMode || !!caseData?.id

  return (
    <div className="space-y-6">

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
          
          // Render CaseCaptionCard for header section
          if (section.type === 'header') {
            return (
              <div
                key={section.id}
                className="glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-300"
              >
                {/* Section Header */}
                <div className="flex justify-between items-center mb-4 gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Case Caption & Attorney Header</h3>
                  </div>
                  
                  {/* Badge */}
                  <span className={`px-3 py-1 ${badge.bg} ${badge.text} text-sm font-medium rounded-full whitespace-nowrap`}>
                    {badge.label}
                  </span>
                </div>
                
                {/* CaseCaptionCard */}
                <CaseCaptionCard
                  initialData={captionData}
                  onChange={handleCaptionChange}
                  disabled={false}
                />
              </div>
            )
          }
          
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
                    disabled={!canUseAI}
                    className={`absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group ${
                      !canUseAI ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    aria-label="AI Edit Assistant"
                    title={canUseAI ? 'Open AI Edit Assistant - Edit this section interactively' : 'Access from case dashboard to enable AI editing'}
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

      {/* Add Section and Proof of Service Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={addSection}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          + Add Section
        </button>
        <button
          onClick={handleAddProofOfService}
          className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
            showProofOfService 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
          }`}
        >
          {showProofOfService ? '✓ Proof of Service Added' : '+ Add Proof of Service'}
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

      {/* Bottom Action Bar - Save Draft and Preview */}
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
              disabled={saving || !canSave}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              } ${!canSave 
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
          
          {/* New Complaint Button */}
          <button
            onClick={onNewComplaint}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>New Complaint</span>
          </button>
          
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

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        sections={sections}
        captionData={captionData}
        showProofOfService={showProofOfService}
        proofOfServiceText={proofOfServiceText}
      />
    </div>
  )
}
