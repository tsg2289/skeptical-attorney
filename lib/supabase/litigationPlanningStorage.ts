import { createClient } from './client'

// Types
export interface LitigationPlanningSettings {
  id?: string
  case_id: string
  user_id: string
  trial_date: string | null
  expert_exchange_date: string | null
  trial_set_date: string | null
  ocsc_enabled: boolean
  created_at?: string
  updated_at?: string
}

export interface LitigationPlanningDeadline {
  id?: string
  case_id: string
  user_id: string
  title: string
  deadline_date: string
  rule_reference: string | null
  category: 'pleadings' | 'discovery' | 'motions' | 'trial'
  source: 'auto-deadline' | 'manual'
  completed: boolean
  completed_at?: string | null
  rule_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface LitigationPlanningChecklistItem {
  id?: string
  case_id: string
  user_id: string
  item_id: string
  section: string
  completed: boolean
  completed_at?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}

// =====================================================
// SETTINGS OPERATIONS
// =====================================================

export async function getSettings(caseId: string): Promise<LitigationPlanningSettings | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('litigation_planning_settings')
    .select('*')
    .eq('case_id', caseId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No row found
      return null
    }
    console.error('Error fetching litigation planning settings:', error)
    throw error
  }
  
  return data
}

export async function upsertSettings(settings: Omit<LitigationPlanningSettings, 'id' | 'created_at' | 'updated_at'>): Promise<LitigationPlanningSettings> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('litigation_planning_settings')
    .upsert({
      case_id: settings.case_id,
      user_id: settings.user_id,
      trial_date: settings.trial_date,
      expert_exchange_date: settings.expert_exchange_date,
      trial_set_date: settings.trial_set_date,
      ocsc_enabled: settings.ocsc_enabled
    }, {
      onConflict: 'case_id'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting litigation planning settings:', error)
    throw error
  }
  
  return data
}

// =====================================================
// DEADLINE OPERATIONS
// =====================================================

export async function getDeadlines(caseId: string): Promise<LitigationPlanningDeadline[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('litigation_planning_deadlines')
    .select('*')
    .eq('case_id', caseId)
    .order('deadline_date', { ascending: true })
  
  if (error) {
    console.error('Error fetching litigation planning deadlines:', error)
    throw error
  }
  
  return data || []
}

export async function addDeadline(deadline: Omit<LitigationPlanningDeadline, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<LitigationPlanningDeadline> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('litigation_planning_deadlines')
    .insert({
      case_id: deadline.case_id,
      user_id: deadline.user_id,
      title: deadline.title,
      deadline_date: deadline.deadline_date,
      rule_reference: deadline.rule_reference,
      category: deadline.category,
      source: deadline.source,
      completed: deadline.completed,
      rule_id: deadline.rule_id
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error adding litigation planning deadline:', error)
    throw error
  }
  
  return data
}

export async function updateDeadline(id: string, updates: Partial<Pick<LitigationPlanningDeadline, 'title' | 'deadline_date' | 'rule_reference' | 'category' | 'completed'>>): Promise<LitigationPlanningDeadline> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('litigation_planning_deadlines')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating litigation planning deadline:', error)
    throw error
  }
  
  return data
}

export async function deleteDeadline(id: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('litigation_planning_deadlines')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting litigation planning deadline:', error)
    throw error
  }
}

export async function toggleDeadlineCompleted(id: string, completed: boolean): Promise<LitigationPlanningDeadline> {
  return updateDeadline(id, { completed })
}

// Bulk operations for auto-generated deadlines
export async function syncAutoDeadlines(
  caseId: string, 
  userId: string,
  autoDeadlines: Omit<LitigationPlanningDeadline, 'id' | 'case_id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at'>[]
): Promise<LitigationPlanningDeadline[]> {
  const supabase = createClient()
  
  // Get existing auto deadlines for this case
  const { data: existingDeadlines, error: fetchError } = await supabase
    .from('litigation_planning_deadlines')
    .select('*')
    .eq('case_id', caseId)
    .eq('source', 'auto-deadline')
  
  if (fetchError) {
    console.error('Error fetching existing auto deadlines:', fetchError)
    throw fetchError
  }
  
  // Create a map of existing deadlines by rule_id
  const existingByRuleId = new Map<string | null | undefined, LitigationPlanningDeadline>(
    (existingDeadlines || []).map((d: LitigationPlanningDeadline) => [d.rule_id, d])
  )
  
  // Prepare deadlines to upsert (preserve completed status)
  const deadlinesToUpsert = autoDeadlines.map(d => {
    const existing = existingByRuleId.get(d.rule_id || null)
    return {
      id: existing?.id || undefined,
      case_id: caseId,
      user_id: userId,
      title: d.title,
      deadline_date: d.deadline_date,
      rule_reference: d.rule_reference,
      category: d.category,
      source: 'auto-deadline' as const,
      completed: existing?.completed || false,
      rule_id: d.rule_id
    }
  })
  
  // Get rule_ids that should exist
  const validRuleIds = new Set(autoDeadlines.map(d => d.rule_id).filter(Boolean))
  
  // Delete auto deadlines that no longer apply (e.g., OCSC disabled)
  const toDelete = (existingDeadlines || [])
    .filter(d => d.rule_id && !validRuleIds.has(d.rule_id))
    .map(d => d.id)
  
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('litigation_planning_deadlines')
      .delete()
      .in('id', toDelete)
    
    if (deleteError) {
      console.error('Error deleting obsolete auto deadlines:', deleteError)
    }
  }
  
  // Upsert the deadlines
  const { data, error } = await supabase
    .from('litigation_planning_deadlines')
    .upsert(deadlinesToUpsert.filter(d => d.id).map(d => ({
      ...d
    })))
    .select()
  
  // Insert new deadlines (without id)
  const newDeadlines = deadlinesToUpsert.filter(d => !d.id)
  if (newDeadlines.length > 0) {
    const { data: insertedData, error: insertError } = await supabase
      .from('litigation_planning_deadlines')
      .insert(newDeadlines.map(({ id, ...rest }) => rest))
      .select()
    
    if (insertError) {
      console.error('Error inserting new auto deadlines:', insertError)
    }
    
    if (insertedData) {
      return [...(data || []), ...insertedData]
    }
  }
  
  if (error) {
    console.error('Error upserting auto deadlines:', error)
    throw error
  }
  
  return data || []
}

// =====================================================
// CHECKLIST OPERATIONS
// =====================================================

export async function getChecklistItems(caseId: string): Promise<LitigationPlanningChecklistItem[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('litigation_planning_checklist')
    .select('*')
    .eq('case_id', caseId)
  
  if (error) {
    console.error('Error fetching litigation planning checklist:', error)
    throw error
  }
  
  return data || []
}

export async function upsertChecklistItem(item: Omit<LitigationPlanningChecklistItem, 'id' | 'created_at' | 'updated_at' | 'completed_at'>): Promise<LitigationPlanningChecklistItem> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('litigation_planning_checklist')
    .upsert({
      case_id: item.case_id,
      user_id: item.user_id,
      item_id: item.item_id,
      section: item.section,
      completed: item.completed,
      notes: item.notes
    }, {
      onConflict: 'case_id,item_id'
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting checklist item:', error)
    throw error
  }
  
  return data
}

export async function toggleChecklistItem(caseId: string, userId: string, itemId: string, section: string, completed: boolean): Promise<LitigationPlanningChecklistItem> {
  return upsertChecklistItem({
    case_id: caseId,
    user_id: userId,
    item_id: itemId,
    section: section,
    completed: completed
  })
}

// =====================================================
// BULK OPERATIONS
// =====================================================

export async function getFullPlanningData(caseId: string): Promise<{
  settings: LitigationPlanningSettings | null
  deadlines: LitigationPlanningDeadline[]
  checklist: LitigationPlanningChecklistItem[]
}> {
  const [settings, deadlines, checklist] = await Promise.all([
    getSettings(caseId),
    getDeadlines(caseId),
    getChecklistItems(caseId)
  ])
  
  return { settings, deadlines, checklist }
}

// Export the storage object for easy importing
export const litigationPlanningStorage = {
  // Settings
  getSettings,
  upsertSettings,
  
  // Deadlines
  getDeadlines,
  addDeadline,
  updateDeadline,
  deleteDeadline,
  toggleDeadlineCompleted,
  syncAutoDeadlines,
  
  // Checklist
  getChecklistItems,
  upsertChecklistItem,
  toggleChecklistItem,
  
  // Bulk
  getFullPlanningData
}

