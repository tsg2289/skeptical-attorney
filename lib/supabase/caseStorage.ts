import { createClient } from './client'

export interface Deadline {
  id: string
  date: string
  description: string
  completed?: boolean
}

// Demand Letter Section - persists user's drafted demand letter content
export interface DemandLetterSection {
  id: string
  title: string
  content: string
}

// Attorney - now nested under each party
export interface Attorney {
  id: string
  name: string
  firm?: string
  barNumber?: string
  address?: string
  phone?: string
  email?: string
}

// Party (Plaintiff or Defendant) - stored per case for complete isolation
// Each party has their own attorneys nested within
export interface Party {
  id: string
  name: string
  type: 'individual' | 'corporation' | 'entity'
  address?: string
  phone?: string
  email?: string
  attorneys?: Attorney[]  // Counsel for this specific party
}

export interface Case {
  id: string
  user_id: string
  case_name: string
  case_number: string
  case_type?: string
  client?: string
  description?: string
  facts?: string
  trial_date?: string
  msc_date?: string
  jury_trial?: boolean
  court_county?: string
  court?: string
  plaintiffs?: Party[]  // Each plaintiff has nested attorneys
  defendants?: Party[]  // Each defendant has nested attorneys
  deadlines?: Deadline[]
  demand_letter_sections?: DemandLetterSection[]  // Persisted demand letter drafts
  created_at: string
}

// Helper to convert from camelCase (frontend) to snake_case (database)
export interface CaseInput {
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
  plaintiffs?: Party[]  // Each plaintiff has nested attorneys
  defendants?: Party[]  // Each defendant has nested attorneys
  deadlines?: Deadline[]
  demandLetterSections?: DemandLetterSection[]  // Persisted demand letter drafts
}

// Helper to convert from snake_case (database) to camelCase (frontend)
export interface CaseFrontend {
  id: string
  userId: string
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
  plaintiffs?: Party[]  // Each plaintiff has nested attorneys
  defendants?: Party[]  // Each defendant has nested attorneys
  deadlines?: Deadline[]
  demandLetterSections?: DemandLetterSection[]  // Persisted demand letter drafts
  createdAt: string
}

function toFrontendCase(dbCase: Case): CaseFrontend {
  return {
    id: dbCase.id,
    userId: dbCase.user_id,
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
    plaintiffs: dbCase.plaintiffs,
    defendants: dbCase.defendants,
    deadlines: dbCase.deadlines,
    demandLetterSections: dbCase.demand_letter_sections,
    createdAt: dbCase.created_at,
  }
}

function toDbCase(input: CaseInput): Partial<Case> {
  return {
    case_name: input.caseName,
    case_number: input.caseNumber,
    case_type: input.caseType,
    client: input.client,
    description: input.description,
    facts: input.facts,
    trial_date: input.trialDate,
    msc_date: input.mscDate,
    jury_trial: input.juryTrial,
    court_county: input.courtCounty,
    court: input.court,
    plaintiffs: input.plaintiffs,
    defendants: input.defendants,
    deadlines: input.deadlines,
    demand_letter_sections: input.demandLetterSections,
  }
}

export const supabaseCaseStorage = {
  // Get all cases for the current user
  async getUserCases(): Promise<CaseFrontend[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching cases:', error)
      return []
    }

    return (data || []).map(toFrontendCase)
  },

  // Get a single case by ID
  async getCase(caseId: string): Promise<CaseFrontend | null> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single()

    if (error) {
      console.error('Error fetching case:', error)
      return null
    }

    return data ? toFrontendCase(data) : null
  },

  // Add a new case
  async addCase(caseData: CaseInput): Promise<CaseFrontend | null> {
    const supabase = createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('No user logged in')
      return null
    }

    const dbData = {
      ...toDbCase(caseData),
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('cases')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      console.error('Error adding case:', error)
      return null
    }

    return data ? toFrontendCase(data) : null
  },

  // Update a case
  async updateCase(caseId: string, updates: Partial<CaseInput>): Promise<CaseFrontend | null> {
    const supabase = createClient()
    
    const dbUpdates = toDbCase(updates as CaseInput)
    
    // Remove undefined values
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key as keyof typeof dbUpdates] === undefined) {
        delete dbUpdates[key as keyof typeof dbUpdates]
      }
    })

    const { data, error } = await supabase
      .from('cases')
      .update(dbUpdates)
      .eq('id', caseId)
      .select()
      .single()

    if (error) {
      console.error('Error updating case:', error)
      return null
    }

    return data ? toFrontendCase(data) : null
  },

  // Delete a case
  async deleteCase(caseId: string): Promise<boolean> {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', caseId)

    if (error) {
      console.error('Error deleting case:', error)
      return false
    }

    return true
  },

  // Add a deadline to a case
  async addDeadline(caseId: string, deadline: Omit<Deadline, 'id'>): Promise<CaseFrontend | null> {
    const existingCase = await this.getCase(caseId)
    if (!existingCase) return null

    const newDeadline: Deadline = {
      ...deadline,
      id: `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    const deadlines = [...(existingCase.deadlines || []), newDeadline]
    return this.updateCase(caseId, { deadlines })
  },

  // Update a deadline
  async updateDeadline(caseId: string, deadlineId: string, updates: Partial<Omit<Deadline, 'id'>>): Promise<CaseFrontend | null> {
    const existingCase = await this.getCase(caseId)
    if (!existingCase) return null

    const deadlines = (existingCase.deadlines || []).map(d =>
      d.id === deadlineId ? { ...d, ...updates } : d
    )

    return this.updateCase(caseId, { deadlines })
  },

  // Delete a deadline
  async deleteDeadline(caseId: string, deadlineId: string): Promise<CaseFrontend | null> {
    const existingCase = await this.getCase(caseId)
    if (!existingCase) return null

    const deadlines = (existingCase.deadlines || []).filter(d => d.id !== deadlineId)
    return this.updateCase(caseId, { deadlines })
  }
}


