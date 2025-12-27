import { createClient } from './client'

// Evidence importance levels
export type EvidenceImportance = 
  | 'critical'
  | 'very_important'
  | 'important'
  | 'relevant'
  | 'minor'
  | 'unknown'

// Evidence status
export type EvidenceStatus = 
  | 'pending_review'
  | 'reviewed'
  | 'admitted'
  | 'excluded'
  | 'objected'
  | 'archived'

// Evidence type
export type EvidenceType = 
  | 'document'
  | 'photograph'
  | 'video'
  | 'audio'
  | 'physical'
  | 'testimony'
  | 'expert_report'
  | 'medical_record'
  | 'financial_record'
  | 'correspondence'
  | 'contract'
  | 'digital'
  | 'other'

// Evidence category (custom tabs)
export interface EvidenceCategory {
  id: string
  caseId: string
  userId: string
  name: string
  description?: string
  color: string
  icon: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// Main evidence item
export interface CaseEvidence {
  id: string
  caseId: string
  userId: string
  evidenceNumber?: string
  title: string
  description?: string
  categoryId?: string
  evidenceType: EvidenceType
  importance: EvidenceImportance
  importanceNotes?: string
  status: EvidenceStatus
  source?: string
  dateObtained?: string
  dateOfEvidence?: string
  obtainedFrom?: string
  chainOfCustody?: string
  filePath?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  storageBucket: string
  metadata: Record<string, any>
  tags: string[]
  notes?: string
  legalAnalysis?: string
  relatedEvidenceIds: string[]
  relatedDocumentIds: string[]
  batesStart?: string
  batesEnd?: string
  createdAt: string
  updatedAt: string
}

// Display names for UI
export const EVIDENCE_IMPORTANCE: Record<EvidenceImportance, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  very_important: { label: 'Very Important', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  important: { label: 'Important', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  relevant: { label: 'Relevant', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  minor: { label: 'Minor', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  unknown: { label: 'Unknown', color: 'text-gray-500', bgColor: 'bg-gray-50' }
}

export const EVIDENCE_STATUS: Record<EvidenceStatus, { label: string; color: string }> = {
  pending_review: { label: 'Pending Review', color: 'text-yellow-600' },
  reviewed: { label: 'Reviewed', color: 'text-blue-600' },
  admitted: { label: 'Admitted', color: 'text-green-600' },
  excluded: { label: 'Excluded', color: 'text-red-600' },
  objected: { label: 'Objected', color: 'text-orange-600' },
  archived: { label: 'Archived', color: 'text-gray-500' }
}

export const EVIDENCE_TYPES: Record<EvidenceType, string> = {
  document: 'Document',
  photograph: 'Photograph',
  video: 'Video',
  audio: 'Audio Recording',
  physical: 'Physical Evidence',
  testimony: 'Testimony',
  expert_report: 'Expert Report',
  medical_record: 'Medical Record',
  financial_record: 'Financial Record',
  correspondence: 'Correspondence',
  contract: 'Contract',
  digital: 'Digital Evidence',
  other: 'Other'
}

// Helper to convert snake_case DB response to camelCase frontend format
function mapCategoryFromDb(dbCat: any): EvidenceCategory {
  return {
    id: dbCat.id,
    caseId: dbCat.case_id,
    userId: dbCat.user_id,
    name: dbCat.name,
    description: dbCat.description,
    color: dbCat.color,
    icon: dbCat.icon,
    sortOrder: dbCat.sort_order,
    createdAt: dbCat.created_at,
    updatedAt: dbCat.updated_at
  }
}

function mapEvidenceFromDb(dbEvidence: any): CaseEvidence {
  return {
    id: dbEvidence.id,
    caseId: dbEvidence.case_id,
    userId: dbEvidence.user_id,
    evidenceNumber: dbEvidence.evidence_number,
    title: dbEvidence.title,
    description: dbEvidence.description,
    categoryId: dbEvidence.category_id,
    evidenceType: dbEvidence.evidence_type,
    importance: dbEvidence.importance,
    importanceNotes: dbEvidence.importance_notes,
    status: dbEvidence.status,
    source: dbEvidence.source,
    dateObtained: dbEvidence.date_obtained,
    dateOfEvidence: dbEvidence.date_of_evidence,
    obtainedFrom: dbEvidence.obtained_from,
    chainOfCustody: dbEvidence.chain_of_custody,
    filePath: dbEvidence.file_path,
    fileName: dbEvidence.file_name,
    fileType: dbEvidence.file_type,
    fileSize: dbEvidence.file_size,
    storageBucket: dbEvidence.storage_bucket || 'evidence',
    metadata: dbEvidence.metadata || {},
    tags: dbEvidence.tags || [],
    notes: dbEvidence.notes,
    legalAnalysis: dbEvidence.legal_analysis,
    relatedEvidenceIds: dbEvidence.related_evidence_ids || [],
    relatedDocumentIds: dbEvidence.related_document_ids || [],
    batesStart: dbEvidence.bates_start,
    batesEnd: dbEvidence.bates_end,
    createdAt: dbEvidence.created_at,
    updatedAt: dbEvidence.updated_at
  }
}

export const evidenceStorage = {
  // ============================================
  // CATEGORY OPERATIONS
  // ============================================

  /**
   * Get all evidence categories for a case
   */
  async getCategories(caseId: string): Promise<EvidenceCategory[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return []
    }
    
    const { data, error } = await supabase
      .from('evidence_categories')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
    
    if (error) {
      console.error('Error fetching evidence categories:', error)
      return []
    }
    
    return (data || []).map(mapCategoryFromDb)
  },

  /**
   * Create a new evidence category
   */
  async createCategory(
    caseId: string,
    category: { name: string; description?: string; color?: string; icon?: string }
  ): Promise<EvidenceCategory | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    // Get max sort order
    const { data: existing } = await supabase
      .from('evidence_categories')
      .select('sort_order')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('sort_order', { ascending: false })
      .limit(1)
    
    const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0
    
    const { data, error } = await supabase
      .from('evidence_categories')
      .insert({
        case_id: caseId,
        user_id: user.id,
        name: category.name,
        description: category.description || null,
        color: category.color || '#6366f1',
        icon: category.icon || 'folder',
        sort_order: nextSortOrder
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error creating evidence category:', error)
      return null
    }
    
    return mapCategoryFromDb(data)
  },

  /**
   * Update an evidence category
   */
  async updateCategory(
    categoryId: string,
    updates: { name?: string; description?: string; color?: string; icon?: string; sortOrder?: number }
  ): Promise<EvidenceCategory | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.icon !== undefined) updateData.icon = updates.icon
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder
    
    const { data, error } = await supabase
      .from('evidence_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating evidence category:', error)
      return null
    }
    
    return mapCategoryFromDb(data)
  },

  /**
   * Delete an evidence category
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { error } = await supabase
      .from('evidence_categories')
      .delete()
      .eq('id', categoryId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting evidence category:', error)
      return false
    }
    
    return true
  },

  // ============================================
  // EVIDENCE OPERATIONS
  // ============================================

  /**
   * Get all evidence for a case
   */
  async getEvidence(caseId: string): Promise<CaseEvidence[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return []
    }
    
    const { data, error } = await supabase
      .from('case_evidence')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching case evidence:', error)
      return []
    }
    
    return (data || []).map(mapEvidenceFromDb)
  },

  /**
   * Get evidence by category
   */
  async getEvidenceByCategory(caseId: string, categoryId: string): Promise<CaseEvidence[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const { data, error } = await supabase
      .from('case_evidence')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching evidence by category:', error)
      return []
    }
    
    return (data || []).map(mapEvidenceFromDb)
  },

  /**
   * Get evidence by importance level
   */
  async getEvidenceByImportance(caseId: string, importance: EvidenceImportance): Promise<CaseEvidence[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const { data, error } = await supabase
      .from('case_evidence')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .eq('importance', importance)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching evidence by importance:', error)
      return []
    }
    
    return (data || []).map(mapEvidenceFromDb)
  },

  /**
   * Get a single evidence item
   */
  async getEvidenceItem(evidenceId: string): Promise<CaseEvidence | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('case_evidence')
      .select('*')
      .eq('id', evidenceId)
      .eq('user_id', user.id)
      .single()
    
    if (error || !data) {
      console.error('Error fetching evidence item:', error)
      return null
    }
    
    return mapEvidenceFromDb(data)
  },

  /**
   * Create a new evidence item
   */
  async createEvidence(
    caseId: string,
    evidence: {
      title: string
      description?: string
      categoryId?: string
      evidenceType?: EvidenceType
      importance?: EvidenceImportance
      importanceNotes?: string
      status?: EvidenceStatus
      source?: string
      dateObtained?: string
      dateOfEvidence?: string
      obtainedFrom?: string
      tags?: string[]
      notes?: string
      evidenceNumber?: string
    }
  ): Promise<CaseEvidence | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('case_evidence')
      .insert({
        case_id: caseId,
        user_id: user.id,
        title: evidence.title,
        description: evidence.description || null,
        category_id: evidence.categoryId || null,
        evidence_type: evidence.evidenceType || 'document',
        importance: evidence.importance || 'unknown',
        importance_notes: evidence.importanceNotes || null,
        status: evidence.status || 'pending_review',
        source: evidence.source || null,
        date_obtained: evidence.dateObtained || null,
        date_of_evidence: evidence.dateOfEvidence || null,
        obtained_from: evidence.obtainedFrom || null,
        tags: evidence.tags || [],
        notes: evidence.notes || null,
        evidence_number: evidence.evidenceNumber || null
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error creating evidence:', error)
      return null
    }
    
    return mapEvidenceFromDb(data)
  },

  /**
   * Update an evidence item
   */
  async updateEvidence(
    evidenceId: string,
    updates: Partial<{
      title: string
      description: string
      categoryId: string | null
      evidenceType: EvidenceType
      importance: EvidenceImportance
      importanceNotes: string
      status: EvidenceStatus
      source: string
      dateObtained: string
      dateOfEvidence: string
      obtainedFrom: string
      chainOfCustody: string
      tags: string[]
      notes: string
      legalAnalysis: string
      evidenceNumber: string
      batesStart: string
      batesEnd: string
    }>
  ): Promise<CaseEvidence | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const updateData: any = {}
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId
    if (updates.evidenceType !== undefined) updateData.evidence_type = updates.evidenceType
    if (updates.importance !== undefined) updateData.importance = updates.importance
    if (updates.importanceNotes !== undefined) updateData.importance_notes = updates.importanceNotes
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.source !== undefined) updateData.source = updates.source
    if (updates.dateObtained !== undefined) updateData.date_obtained = updates.dateObtained
    if (updates.dateOfEvidence !== undefined) updateData.date_of_evidence = updates.dateOfEvidence
    if (updates.obtainedFrom !== undefined) updateData.obtained_from = updates.obtainedFrom
    if (updates.chainOfCustody !== undefined) updateData.chain_of_custody = updates.chainOfCustody
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.notes !== undefined) updateData.notes = updates.notes
    if (updates.legalAnalysis !== undefined) updateData.legal_analysis = updates.legalAnalysis
    if (updates.evidenceNumber !== undefined) updateData.evidence_number = updates.evidenceNumber
    if (updates.batesStart !== undefined) updateData.bates_start = updates.batesStart
    if (updates.batesEnd !== undefined) updateData.bates_end = updates.batesEnd
    
    const { data, error } = await supabase
      .from('case_evidence')
      .update(updateData)
      .eq('id', evidenceId)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating evidence:', error)
      return null
    }
    
    return mapEvidenceFromDb(data)
  },

  /**
   * Delete an evidence item
   */
  async deleteEvidence(evidenceId: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    // If evidence has a file, delete it from storage first
    const { data: evidence } = await supabase
      .from('case_evidence')
      .select('file_path, storage_bucket')
      .eq('id', evidenceId)
      .eq('user_id', user.id)
      .single()
    
    if (evidence?.file_path) {
      await supabase.storage
        .from(evidence.storage_bucket || 'evidence')
        .remove([evidence.file_path])
    }
    
    const { error } = await supabase
      .from('case_evidence')
      .delete()
      .eq('id', evidenceId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting evidence:', error)
      return false
    }
    
    return true
  },

  /**
   * Get evidence count by importance for a case
   */
  async getEvidenceCountByImportance(caseId: string): Promise<Record<EvidenceImportance, number>> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const counts: Record<EvidenceImportance, number> = {
      critical: 0,
      very_important: 0,
      important: 0,
      relevant: 0,
      minor: 0,
      unknown: 0
    }
    
    if (!user) return counts
    
    const { data, error } = await supabase
      .from('case_evidence')
      .select('importance')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
    
    if (error || !data) return counts
    
    data.forEach((item: { importance: EvidenceImportance }) => {
      if (item.importance in counts) {
        counts[item.importance]++
      }
    })
    
    return counts
  },

  /**
   * Get total evidence count for a case
   */
  async getEvidenceCount(caseId: string): Promise<number> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return 0
    
    const { count, error } = await supabase
      .from('case_evidence')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error getting evidence count:', error)
      return 0
    }
    
    return count || 0
  }
}

