import { createClient } from './client'

export interface BillingEntry {
  id: string
  userId: string
  caseId?: string | null
  caseName: string
  description: string
  hours: number
  rate?: number | null
  amount?: number | null
  billingDate: string
  groupName?: string | null
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

// Map from database snake_case to frontend camelCase
function mapBillingFromDb(dbEntry: any): BillingEntry {
  return {
    id: dbEntry.id,
    userId: dbEntry.user_id,
    caseId: dbEntry.case_id,
    caseName: dbEntry.case_name,
    description: dbEntry.description,
    hours: parseFloat(dbEntry.hours) || 0,
    rate: dbEntry.rate ? parseFloat(dbEntry.rate) : null,
    amount: dbEntry.amount ? parseFloat(dbEntry.amount) : null,
    billingDate: dbEntry.billing_date,
    groupName: dbEntry.group_name,
    isAiGenerated: dbEntry.is_ai_generated || false,
    createdAt: dbEntry.created_at,
    updatedAt: dbEntry.updated_at
  }
}

export interface BillingFilters {
  startDate?: string
  endDate?: string
  caseId?: string
  caseName?: string
}

export interface DailyBillingSummary {
  date: string
  totalHours: number
  totalAmount: number
  entriesCount: number
  entries: BillingEntry[]
}

export const supabaseBillingStorage = {
  // Get all billing entries for the current user with optional filters
  async getBillingEntries(filters?: BillingFilters): Promise<BillingEntry[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    let query = supabase
      .from('billing_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('billing_date', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (filters?.startDate) {
      query = query.gte('billing_date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('billing_date', filters.endDate)
    }
    if (filters?.caseId) {
      query = query.eq('case_id', filters.caseId)
    }
    if (filters?.caseName) {
      query = query.ilike('case_name', `%${filters.caseName}%`)
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      console.error('Error fetching billing entries:', error)
      return []
    }
    
    return data.map(mapBillingFromDb)
  },

  // Get billing entries for a specific date
  async getBillingForDate(date: string): Promise<BillingEntry[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const { data, error } = await supabase
      .from('billing_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('billing_date', date)
      .order('created_at', { ascending: false })
    
    if (error || !data) {
      console.error('Error fetching billing for date:', error)
      return []
    }
    
    return data.map(mapBillingFromDb)
  },

  // Get today's billing summary
  async getTodaysBilling(): Promise<DailyBillingSummary> {
    const today = new Date().toISOString().split('T')[0]
    const entries = await this.getBillingForDate(today)
    
    return {
      date: today,
      totalHours: entries.reduce((sum, e) => sum + e.hours, 0),
      totalAmount: entries.reduce((sum, e) => sum + (e.amount || 0), 0),
      entriesCount: entries.length,
      entries
    }
  },

  // Get daily summaries for a date range
  async getDailySummaries(startDate: string, endDate: string): Promise<DailyBillingSummary[]> {
    const entries = await this.getBillingEntries({ startDate, endDate })
    
    // Group by date
    const byDate: Record<string, BillingEntry[]> = {}
    entries.forEach(entry => {
      if (!byDate[entry.billingDate]) {
        byDate[entry.billingDate] = []
      }
      byDate[entry.billingDate].push(entry)
    })
    
    return Object.entries(byDate).map(([date, dateEntries]) => ({
      date,
      totalHours: dateEntries.reduce((sum, e) => sum + e.hours, 0),
      totalAmount: dateEntries.reduce((sum, e) => sum + (e.amount || 0), 0),
      entriesCount: dateEntries.length,
      entries: dateEntries
    })).sort((a, b) => b.date.localeCompare(a.date))
  },

  // Add a billing entry
  async addBillingEntry(entry: {
    caseName: string
    caseId?: string
    description: string
    hours: number
    rate?: number
    billingDate?: string
    groupName?: string
    isAiGenerated?: boolean
  }): Promise<BillingEntry | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('billing_entries')
      .insert({
        user_id: user.id,
        case_id: entry.caseId || null,
        case_name: entry.caseName,
        description: entry.description,
        hours: entry.hours,
        rate: entry.rate || null,
        billing_date: entry.billingDate || new Date().toISOString().split('T')[0],
        group_name: entry.groupName || null,
        is_ai_generated: entry.isAiGenerated || false
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error adding billing entry:', error)
      return null
    }
    
    return mapBillingFromDb(data)
  },

  // Update a billing entry
  async updateBillingEntry(
    entryId: string,
    updates: Partial<{
      caseName: string
      caseId: string | null
      description: string
      hours: number
      rate: number | null
      billingDate: string
      groupName: string | null
    }>
  ): Promise<BillingEntry | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const dbUpdates: any = {}
    if (updates.caseName !== undefined) dbUpdates.case_name = updates.caseName
    if (updates.caseId !== undefined) dbUpdates.case_id = updates.caseId
    if (updates.description !== undefined) dbUpdates.description = updates.description
    if (updates.hours !== undefined) dbUpdates.hours = updates.hours
    if (updates.rate !== undefined) dbUpdates.rate = updates.rate
    if (updates.billingDate !== undefined) dbUpdates.billing_date = updates.billingDate
    if (updates.groupName !== undefined) dbUpdates.group_name = updates.groupName
    
    const { data, error } = await supabase
      .from('billing_entries')
      .update(dbUpdates)
      .eq('id', entryId)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating billing entry:', error)
      return null
    }
    
    return mapBillingFromDb(data)
  },

  // Delete a billing entry
  async deleteBillingEntry(entryId: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { error } = await supabase
      .from('billing_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting billing entry:', error)
      return false
    }
    
    return true
  },

  // Get unique case names for filtering
  async getUniqueCaseNames(): Promise<string[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const { data, error } = await supabase
      .from('billing_entries')
      .select('case_name')
      .eq('user_id', user.id)
    
    if (error || !data) return []
    
    return [...new Set(data.map((d: { case_name: string }) => d.case_name))]
  }
}

