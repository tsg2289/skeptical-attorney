import { createClient } from './client'

// Document type matching database enum
export type AIDocumentType = 
  | 'demand_letter'
  | 'complaint'
  | 'answer'
  | 'interrogatories'
  | 'requests_for_production'
  | 'requests_for_admission'
  | 'motion'
  | 'status_report'
  | 'deposition_outline'
  | 'settlement_agreement'

export type AIDocumentStatus = 'draft' | 'in_progress' | 'finalized' | 'archived'

export interface AIGeneratedDocument {
  id: string
  caseId: string
  userId: string
  documentType: AIDocumentType
  title: string
  description?: string
  content: Record<string, unknown>
  status: AIDocumentStatus
  version: number
  sourceReference?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  finalizedAt?: string
}

export interface CreateDocumentInput {
  caseId: string
  documentType: AIDocumentType
  title: string
  description?: string
  content: Record<string, unknown>
  status?: AIDocumentStatus
  sourceReference?: Record<string, unknown>
}

export interface UpdateDocumentInput {
  title?: string
  description?: string
  content?: Record<string, unknown>
  status?: AIDocumentStatus
}

// Display names for document types
export const DOCUMENT_TYPE_LABELS: Record<AIDocumentType, string> = {
  demand_letter: 'Demand Letter',
  complaint: 'Complaint',
  answer: 'Answer',
  interrogatories: 'Interrogatories',
  requests_for_production: 'Requests for Production',
  requests_for_admission: 'Requests for Admission',
  motion: 'Motion',
  status_report: 'Status Report',
  deposition_outline: 'Deposition Outline',
  settlement_agreement: 'Settlement Agreement'
}

// Icons for document types (can be used with icon libraries or as emoji)
export const DOCUMENT_TYPE_ICONS: Record<AIDocumentType, string> = {
  demand_letter: '📨',
  complaint: '📋',
  answer: '📝',
  interrogatories: '❓',
  requests_for_production: '📂',
  requests_for_admission: '✅',
  motion: '⚖️',
  status_report: '📊',
  deposition_outline: '🎤',
  settlement_agreement: '🤝'
}

// Status display configuration
export const DOCUMENT_STATUS_CONFIG: Record<AIDocumentStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  in_progress: { label: 'In Progress', color: 'yellow' },
  finalized: { label: 'Finalized', color: 'green' },
  archived: { label: 'Archived', color: 'blue' }
}

// Helper to convert snake_case DB response to camelCase frontend format
function mapFromDb(doc: {
  id: string
  case_id: string
  user_id: string
  document_type: AIDocumentType
  title: string
  description?: string
  content: Record<string, unknown>
  status: AIDocumentStatus
  version: number
  source_reference?: Record<string, unknown>
  created_at: string
  updated_at: string
  finalized_at?: string
}): AIGeneratedDocument {
  return {
    id: doc.id,
    caseId: doc.case_id,
    userId: doc.user_id,
    documentType: doc.document_type,
    title: doc.title,
    description: doc.description,
    content: doc.content,
    status: doc.status,
    version: doc.version,
    sourceReference: doc.source_reference,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    finalizedAt: doc.finalized_at
  }
}

export const aiDocumentStorage = {
  /**
   * Get all AI-generated documents for a user (across all cases)
   */
  async getAllDocuments(options?: {
    documentType?: AIDocumentType
    status?: AIDocumentStatus
    limit?: number
    searchQuery?: string
  }): Promise<AIGeneratedDocument[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return []
    }
    
    let query = supabase
      .from('ai_generated_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    
    if (options?.documentType) {
      query = query.eq('document_type', options.documentType)
    }
    if (options?.status) {
      query = query.eq('status', options.status)
    }
    if (options?.searchQuery) {
      query = query.ilike('title', `%${options.searchQuery}%`)
    }
    if (options?.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching AI documents:', error)
      return []
    }
    
    return (data || []).map(mapFromDb)
  },

  /**
   * Get all AI-generated documents for a specific case
   */
  async getDocumentsByCase(caseId: string, options?: {
    documentType?: AIDocumentType
    status?: AIDocumentStatus
  }): Promise<AIGeneratedDocument[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return []
    }
    
    let query = supabase
      .from('ai_generated_documents')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    
    if (options?.documentType) {
      query = query.eq('document_type', options.documentType)
    }
    if (options?.status) {
      query = query.eq('status', options.status)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching case documents:', error)
      return []
    }
    
    return (data || []).map(mapFromDb)
  },

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: string): Promise<AIGeneratedDocument | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    const { data, error } = await supabase
      .from('ai_generated_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()
    
    if (error || !data) {
      console.error('Error fetching document:', error)
      return null
    }
    
    return mapFromDb(data)
  },

  /**
   * Create a new AI-generated document
   */
  async createDocument(input: CreateDocumentInput): Promise<AIGeneratedDocument | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    const { data, error } = await supabase
      .from('ai_generated_documents')
      .insert({
        case_id: input.caseId,
        user_id: user.id,
        document_type: input.documentType,
        title: input.title,
        description: input.description || null,
        content: input.content,
        status: input.status || 'draft',
        source_reference: input.sourceReference || null
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error creating document:', error)
      return null
    }
    
    return mapFromDb(data)
  },

  /**
   * Update a document
   */
  async updateDocument(
    documentId: string,
    updates: UpdateDocumentInput
  ): Promise<AIGeneratedDocument | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    const updatePayload: Record<string, unknown> = {}
    if (updates.title !== undefined) updatePayload.title = updates.title
    if (updates.description !== undefined) updatePayload.description = updates.description
    if (updates.content !== undefined) updatePayload.content = updates.content
    if (updates.status !== undefined) updatePayload.status = updates.status
    
    const { data, error } = await supabase
      .from('ai_generated_documents')
      .update(updatePayload)
      .eq('id', documentId)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating document:', error)
      return null
    }
    
    return mapFromDb(data)
  },

  /**
   * Finalize a document (change status to finalized)
   */
  async finalizeDocument(documentId: string): Promise<AIGeneratedDocument | null> {
    return this.updateDocument(documentId, { status: 'finalized' })
  },

  /**
   * Archive a document
   */
  async archiveDocument(documentId: string): Promise<AIGeneratedDocument | null> {
    return this.updateDocument(documentId, { status: 'archived' })
  },

  /**
   * Create a new version of a document (duplicates with incremented version)
   */
  async createVersion(documentId: string): Promise<AIGeneratedDocument | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    // Get current document
    const current = await this.getDocument(documentId)
    if (!current) {
      console.error('Document not found')
      return null
    }
    
    // Create new version with incremented version number
    const { data, error } = await supabase
      .from('ai_generated_documents')
      .insert({
        case_id: current.caseId,
        user_id: user.id,
        document_type: current.documentType,
        title: `${current.title} (v${current.version + 1})`,
        description: current.description,
        content: current.content,
        status: 'draft',
        version: current.version + 1,
        source_reference: current.sourceReference
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error creating document version:', error)
      return null
    }
    
    return mapFromDb(data)
  },

  /**
   * Duplicate a document (creates a copy with version 1)
   */
  async duplicateDocument(documentId: string, newTitle?: string): Promise<AIGeneratedDocument | null> {
    const current = await this.getDocument(documentId)
    if (!current) {
      console.error('Document not found')
      return null
    }
    
    return this.createDocument({
      caseId: current.caseId,
      documentType: current.documentType,
      title: newTitle || `${current.title} (Copy)`,
      description: current.description,
      content: current.content,
      status: 'draft',
      sourceReference: current.sourceReference
    })
  },

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return false
    }
    
    const { error } = await supabase
      .from('ai_generated_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting document:', error)
      return false
    }
    
    return true
  },

  /**
   * Get document counts grouped by type (for dashboard stats)
   */
  async getDocumentStats(caseId?: string): Promise<Record<AIDocumentType, number>> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const stats: Record<AIDocumentType, number> = {
      demand_letter: 0,
      complaint: 0,
      answer: 0,
      interrogatories: 0,
      requests_for_production: 0,
      requests_for_admission: 0,
      motion: 0,
      status_report: 0,
      deposition_outline: 0,
      settlement_agreement: 0
    }
    
    if (!user) return stats
    
    let query = supabase
      .from('ai_generated_documents')
      .select('document_type')
      .eq('user_id', user.id)
    
    if (caseId) {
      query = query.eq('case_id', caseId)
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      console.error('Error fetching document stats:', error)
      return stats
    }
    
    data.forEach((doc: { document_type: AIDocumentType }) => {
      stats[doc.document_type]++
    })
    
    return stats
  },

  /**
   * Get status counts for documents
   */
  async getStatusCounts(caseId?: string): Promise<Record<AIDocumentStatus, number>> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const counts: Record<AIDocumentStatus, number> = {
      draft: 0,
      in_progress: 0,
      finalized: 0,
      archived: 0
    }
    
    if (!user) return counts
    
    let query = supabase
      .from('ai_generated_documents')
      .select('status')
      .eq('user_id', user.id)
    
    if (caseId) {
      query = query.eq('case_id', caseId)
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      console.error('Error fetching status counts:', error)
      return counts
    }
    
    data.forEach((doc: { status: AIDocumentStatus }) => {
      counts[doc.status]++
    })
    
    return counts
  },

  /**
   * Get recent documents (for dashboard)
   */
  async getRecentDocuments(limit: number = 5): Promise<AIGeneratedDocument[]> {
    return this.getAllDocuments({ limit })
  },

  /**
   * Get total document count for a user
   */
  async getTotalCount(caseId?: string): Promise<number> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return 0
    
    let query = supabase
      .from('ai_generated_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    if (caseId) {
      query = query.eq('case_id', caseId)
    }
    
    const { count, error } = await query
    
    if (error) {
      console.error('Error getting document count:', error)
      return 0
    }
    
    return count || 0
  }
}

