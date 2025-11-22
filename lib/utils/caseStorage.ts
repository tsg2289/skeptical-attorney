export interface Deadline {
  id: string
  date: string
  description: string
  completed?: boolean
}

export interface Case {
  id: string
  caseName: string
  caseNumber: string
  caseType?: string
  client?: string
  description?: string
  facts?: string
  trialDate?: string
  mscDate?: string  // Mandatory Settlement Conference date
  juryTrial?: boolean  // Whether client favors jury trial
  courtCounty?: string  // e.g., "Orange County", "LA County", "Riverside County", etc.
  deadlines?: Deadline[]
  createdAt: string
  userId: string
}

export const caseStorage = {
  // Get all cases for a specific user
  getUserCases(userId: string): Case[] {
    if (typeof window === 'undefined') return []
    const key = `cases_${userId}`
    return JSON.parse(localStorage.getItem(key) || '[]')
  },

  // Get a single case by ID
  getCase(userId: string, caseId: string): Case | null {
    if (typeof window === 'undefined') return null
    const cases = this.getUserCases(userId)
    return cases.find(c => c.id === caseId) || null
  },

  // Add a new case
  addCase(caseData: Omit<Case, 'id' | 'createdAt'>): Case {
    if (typeof window === 'undefined') {
      throw new Error('Cannot add case on server side')
    }
    
    const newCase: Case = {
      ...caseData,
      id: `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    }
    
    const key = `cases_${caseData.userId}`
    const cases = this.getUserCases(caseData.userId)
    cases.push(newCase)
    localStorage.setItem(key, JSON.stringify(cases))
    
    return newCase
  },

  // Delete a case
  deleteCase(userId: string, caseId: string): boolean {
    if (typeof window === 'undefined') return false
    
    const key = `cases_${userId}`
    const cases = this.getUserCases(userId)
    const filtered = cases.filter(c => c.id !== caseId)
    localStorage.setItem(key, JSON.stringify(filtered))
    
    return filtered.length < cases.length
  },

  // Update a case
  updateCase(userId: string, caseId: string, updates: Partial<Omit<Case, 'id' | 'userId' | 'createdAt'>>): Case | null {
    if (typeof window === 'undefined') return null
    
    const key = `cases_${userId}`
    const cases = this.getUserCases(userId)
    const index = cases.findIndex(c => c.id === caseId)
    
    if (index === -1) return null
    
    cases[index] = { ...cases[index], ...updates }
    localStorage.setItem(key, JSON.stringify(cases))
    
    return cases[index]
  },

  // Add a deadline to a case
  addDeadline(userId: string, caseId: string, deadline: Omit<Deadline, 'id'>): Case | null {
    if (typeof window === 'undefined') return null
    
    const caseItem = this.getCase(userId, caseId)
    if (!caseItem) return null
    
    const newDeadline: Deadline = {
      ...deadline,
      id: `deadline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    const deadlines = caseItem.deadlines || []
    deadlines.push(newDeadline)
    
    return this.updateCase(userId, caseId, { deadlines })
  },

  // Update a deadline
  updateDeadline(userId: string, caseId: string, deadlineId: string, updates: Partial<Omit<Deadline, 'id'>>): Case | null {
    if (typeof window === 'undefined') return null
    
    const caseItem = this.getCase(userId, caseId)
    if (!caseItem) return null
    
    const deadlines = (caseItem.deadlines || []).map(d => 
      d.id === deadlineId ? { ...d, ...updates } : d
    )
    
    return this.updateCase(userId, caseId, { deadlines })
  },

  // Delete a deadline
  deleteDeadline(userId: string, caseId: string, deadlineId: string): Case | null {
    if (typeof window === 'undefined') return null
    
    const caseItem = this.getCase(userId, caseId)
    if (!caseItem) return null
    
    const deadlines = (caseItem.deadlines || []).filter(d => d.id !== deadlineId)
    
    return this.updateCase(userId, caseId, { deadlines })
  }
}
