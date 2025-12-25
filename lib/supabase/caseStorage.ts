import { createClient } from './client'

export interface Attorney {
  id: string
  name: string
  firm?: string
  email?: string
  phone?: string
  address?: string
  barNumber?: string
}

export interface Party {
  id: string
  name: string
  type: 'individual' | 'company' | 'government' | 'other'
  role?: string
  address?: string
  phone?: string
  email?: string
  attorneys: Attorney[]
}

export interface Deadline {
  id: string
  date: string
  description: string
  completed?: boolean
  isCalculated?: boolean
}

export interface CaseNote {
  id: string
  content: string
  createdAt: string
  updatedAt?: string
}

export interface DemandLetterSection {
  id: string
  title: string
  content: string
}

export interface StatusReportSection {
  id: string
  title: string
  content: string
}

export interface ComplaintSection {
  id: string
  title: string
  content: string
  isExpanded?: boolean
  type?: 'header' | 'intro' | 'parties' | 'facts' | 'cause' | 'prayer' | 'verification' | 'standard' | 'jurisdiction' | 'venue' | 'factual' | 'jury' | 'signature'
}

export interface AnswerDefense {
  id: string
  number: string
  causesOfAction: string
  title: string
  content: string
  fullText: string
}

export interface AnswerSections {
  preamble: string
  defenses: AnswerDefense[]
  prayer: string
  signature: string
  aiAnalysis?: string
}

// Discovery Types
export interface DiscoveryItem {
  id: string
  number: number
  content: string
  isAiGenerated?: boolean
}

export interface DiscoveryCategory {
  id: string
  title: string
  items: DiscoveryItem[]
}

export interface DiscoveryMetadata {
  propoundingParty: 'plaintiff' | 'defendant'
  respondingParty: 'plaintiff' | 'defendant'
  setNumber: number
  jurisdiction: string
  createdAt?: string
  updatedAt?: string
}

export interface InterrogatoriesDocument {
  metadata: DiscoveryMetadata
  definitions: string[]
  categories: DiscoveryCategory[]
}

export interface RFPDocument {
  metadata: DiscoveryMetadata
  definitions: string[]
  categories: DiscoveryCategory[]
}

export interface RFADocument {
  metadata: DiscoveryMetadata
  items: DiscoveryItem[]
}

export interface DiscoveryDocuments {
  interrogatories?: InterrogatoriesDocument
  rfp?: RFPDocument
  rfa?: RFADocument
}

// Motion Types
export interface MotionCaseCitation {
  id: string
  caseName: string
  citation: string
  year?: number
  court: string
  relevantText: string
  courtListenerId?: string
  url?: string
}

export interface MotionSection {
  id: string
  title: string
  content: string
  isExpanded?: boolean
  type?: 'caption' | 'notice' | 'introduction' | 'statement-of-facts' | 'legal-argument' | 
         'point-heading' | 'conclusion' | 'declaration' | 'proof-of-service' | 'memorandum' | 'standard'
  citations?: MotionCaseCitation[]
}

// Structured data for motion editing
export interface SavedNoticeOfMotion {
  hearingDate?: string
  hearingTime?: string
  department?: string
  reliefSought?: string
  reliefSoughtSummary?: string
  argumentSummary?: string
  applicableRule?: string
}

export interface SavedMemorandum {
  introduction?: string
  facts?: string
  law?: string
  argument?: string
  argumentSubsections?: Array<{
    id: string
    letter: string
    title: string
    content: string
  }>
  conclusion?: string
}

export interface SavedDeclaration {
  declarantName?: string
  barNumber?: string
  facts?: Array<{
    id: string
    number: number
    content: string
  }>
}

export interface SavedCaptionData {
  attorneys?: Array<{
    id: string
    name: string
    barNumber: string
    firm: string
    address: string
    phone: string
    fax?: string
    email: string
  }>
  plaintiffs?: string[]
  defendants?: string[]
  includeDoes?: boolean
  county?: string
  caseNumber?: string
  judgeName?: string
  departmentNumber?: string
  documentType?: string
  demandJuryTrial?: boolean
  complaintFiledDate?: string
  trialDate?: string
  hearingDate?: string
  hearingTime?: string
}

export interface MotionDocument {
  id: string
  motionType: string
  title: string
  sections: MotionSection[]
  createdAt: string
  updatedAt: string
  status: 'draft' | 'filed' | 'pending' | 'heard'
  hearingDate?: string
  hearingTime?: string
  department?: string
  reservationNumber?: string
  // Structured editable data
  savedNoticeOfMotion?: SavedNoticeOfMotion
  savedMemorandum?: SavedMemorandum
  savedDeclaration?: SavedDeclaration
  savedCaptionData?: SavedCaptionData
  movingParty?: 'plaintiff' | 'defendant'
  noticeText?: string
}

export interface CaseFrontend {
  id: string
  caseName: string
  caseNumber: string
  caseType?: string
  client?: string
  description?: string
  facts?: string
  trialDate?: string
  mscDate?: string
  juryTrial?: boolean
  courtCounty?: string
  court?: string
  judgeName?: string
  departmentNumber?: string
  complaintFiledDate?: string
  includeDoes?: boolean
  dateOfLoss?: string
  deadlines: Deadline[]
  plaintiffs: Party[]
  defendants: Party[]
  demandLetterSections?: DemandLetterSection[]
  statusReportSections?: StatusReportSection[]
  complaintSections?: ComplaintSection[]
  answerSections?: AnswerSections
  discoveryDocuments?: DiscoveryDocuments
  motionDocuments?: MotionDocument[]
  notes?: CaseNote[]
  createdAt: string
  userId: string
}

// Helper to convert snake_case DB response to camelCase frontend format
function mapCaseFromDb(dbCase: any): CaseFrontend {
  return {
    id: dbCase.id,
    caseName: dbCase.case_name,
    caseNumber: dbCase.case_number,
    caseType: dbCase.case_type,
    client: dbCase.client,
    description: dbCase.description,
    facts: dbCase.facts,
    trialDate: dbCase.trial_date,
    mscDate: dbCase.msc_date,
    juryTrial: dbCase.jury_trial,
    courtCounty: dbCase.court_county,
    court: dbCase.court,
    judgeName: dbCase.judge_name,
    departmentNumber: dbCase.department_number,
    complaintFiledDate: dbCase.complaint_filed_date,
    includeDoes: dbCase.include_does ?? true,
    dateOfLoss: dbCase.date_of_loss,
    deadlines: dbCase.deadlines || [],
    plaintiffs: dbCase.plaintiffs || [],
    defendants: dbCase.defendants || [],
    demandLetterSections: dbCase.demand_letter_sections || undefined,
    statusReportSections: dbCase.status_report_sections || undefined,
    complaintSections: dbCase.complaint_sections || undefined,
    answerSections: dbCase.answer_sections || undefined,
    discoveryDocuments: dbCase.discovery_documents || undefined,
    motionDocuments: dbCase.motion_documents || undefined,
    notes: dbCase.notes || [],
    createdAt: dbCase.created_at,
    userId: dbCase.user_id
  }
}

// Helper to convert camelCase to snake_case for DB updates
function mapCaseToDb(updates: Partial<Omit<CaseFrontend, 'id' | 'userId' | 'createdAt'>>): any {
  const dbUpdates: any = {}
  
  if (updates.caseName !== undefined) dbUpdates.case_name = updates.caseName
  if (updates.caseNumber !== undefined) dbUpdates.case_number = updates.caseNumber
  if (updates.caseType !== undefined) dbUpdates.case_type = updates.caseType
  if (updates.client !== undefined) dbUpdates.client = updates.client
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.facts !== undefined) dbUpdates.facts = updates.facts
  if (updates.trialDate !== undefined) dbUpdates.trial_date = updates.trialDate
  if (updates.mscDate !== undefined) dbUpdates.msc_date = updates.mscDate
  if (updates.juryTrial !== undefined) dbUpdates.jury_trial = updates.juryTrial
  if (updates.courtCounty !== undefined) dbUpdates.court_county = updates.courtCounty
  if (updates.court !== undefined) dbUpdates.court = updates.court
  if (updates.judgeName !== undefined) dbUpdates.judge_name = updates.judgeName
  if (updates.departmentNumber !== undefined) dbUpdates.department_number = updates.departmentNumber
  if (updates.complaintFiledDate !== undefined) dbUpdates.complaint_filed_date = updates.complaintFiledDate
  if (updates.includeDoes !== undefined) dbUpdates.include_does = updates.includeDoes
  if (updates.dateOfLoss !== undefined) dbUpdates.date_of_loss = updates.dateOfLoss
  if (updates.deadlines !== undefined) dbUpdates.deadlines = updates.deadlines
  if (updates.plaintiffs !== undefined) dbUpdates.plaintiffs = updates.plaintiffs
  if (updates.defendants !== undefined) dbUpdates.defendants = updates.defendants
  if (updates.demandLetterSections !== undefined) dbUpdates.demand_letter_sections = updates.demandLetterSections
  if (updates.statusReportSections !== undefined) dbUpdates.status_report_sections = updates.statusReportSections
  if (updates.complaintSections !== undefined) dbUpdates.complaint_sections = updates.complaintSections
  if (updates.answerSections !== undefined) dbUpdates.answer_sections = updates.answerSections
  if (updates.discoveryDocuments !== undefined) dbUpdates.discovery_documents = updates.discoveryDocuments
  if (updates.motionDocuments !== undefined) dbUpdates.motion_documents = updates.motionDocuments
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes
  
  return dbUpdates
}

export const supabaseCaseStorage = {
  // Get all cases for the current user
  async getUserCases(): Promise<CaseFrontend[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error || !data) {
      console.error('Error fetching cases:', error)
      return []
    }
    
    return data.map(mapCaseFromDb)
  },

  // Get a single case by ID
  async getCase(caseId: string): Promise<CaseFrontend | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .eq('user_id', user.id)
      .single()
    
    if (error || !data) {
      console.error('Error fetching case:', error)
      return null
    }
    
    return mapCaseFromDb(data)
  },

  // Add a new case
  async addCase(caseData: {
    caseName: string
    caseNumber: string
    caseType?: string
    client?: string
  }): Promise<CaseFrontend | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('cases')
      .insert({
        case_name: caseData.caseName,
        case_number: caseData.caseNumber,
        case_type: caseData.caseType || null,
        client: caseData.client || null,
        user_id: user.id,
        deadlines: [],
        plaintiffs: [],
        defendants: []
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error adding case:', error)
      return null
    }
    
    return mapCaseFromDb(data)
  },

  // Update a case
  async updateCase(
    caseId: string, 
    updates: Partial<Omit<CaseFrontend, 'id' | 'userId' | 'createdAt'>>
  ): Promise<CaseFrontend | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const dbUpdates = mapCaseToDb(updates)
    
    const { data, error } = await supabase
      .from('cases')
      .update(dbUpdates)
      .eq('id', caseId)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating case:', error)
      return null
    }
    
    return mapCaseFromDb(data)
  },

  // Delete a case
  async deleteCase(caseId: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', caseId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting case:', error)
      return false
    }
    
    return true
  },

  // Add a deadline to a case
  async addDeadline(
    caseId: string, 
    deadline: Omit<Deadline, 'id'>
  ): Promise<CaseFrontend | null> {
    const existingCase = await this.getCase(caseId)
    if (!existingCase) return null
    
    const newDeadline: Deadline = {
      ...deadline,
      id: `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    const updatedDeadlines = [...existingCase.deadlines, newDeadline]
    
    return this.updateCase(caseId, { deadlines: updatedDeadlines })
  },

  // Update a deadline
  async updateDeadline(
    caseId: string, 
    deadlineId: string, 
    updates: Partial<Omit<Deadline, 'id'>>
  ): Promise<CaseFrontend | null> {
    const existingCase = await this.getCase(caseId)
    if (!existingCase) return null
    
    const updatedDeadlines = existingCase.deadlines.map(d => 
      d.id === deadlineId ? { ...d, ...updates } : d
    )
    
    return this.updateCase(caseId, { deadlines: updatedDeadlines })
  },

  // Delete a deadline
  async deleteDeadline(caseId: string, deadlineId: string): Promise<CaseFrontend | null> {
    const existingCase = await this.getCase(caseId)
    if (!existingCase) return null
    
    const updatedDeadlines = existingCase.deadlines.filter(d => d.id !== deadlineId)
    
    return this.updateCase(caseId, { deadlines: updatedDeadlines })
  }
}
