import { createClient } from './client'

// Document category types matching the database enum
export type DocumentCategory = 
  | 'medical_records'
  | 'police_reports'
  | 'correspondence'
  | 'billing_financial'
  | 'photographs'
  | 'legal_documents'
  | 'employment_records'
  | 'insurance_documents'
  | 'expert_reports'
  | 'other'

export type ExtractionStatus = 'pending' | 'completed' | 'failed' | 'not_applicable'

export interface CaseDocument {
  id: string
  caseId: string
  userId: string
  fileName: string
  fileType: string
  fileSize: number
  storagePath: string
  category: DocumentCategory
  description?: string
  extractedText?: string
  extractionStatus: ExtractionStatus
  createdAt: string
  updatedAt: string
}

export interface DocumentUpload {
  file: File
  caseId: string
  category: DocumentCategory
  description?: string
}

// Category display names for UI
export const DOCUMENT_CATEGORIES: Record<DocumentCategory, string> = {
  medical_records: 'Medical Records',
  police_reports: 'Police/Incident Reports',
  correspondence: 'Correspondence',
  billing_financial: 'Billing & Financial',
  photographs: 'Photographs',
  legal_documents: 'Legal Documents',
  employment_records: 'Employment Records',
  insurance_documents: 'Insurance Documents',
  expert_reports: 'Expert Reports',
  other: 'Other'
}

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
} as const

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// Helper to convert snake_case DB response to camelCase frontend format
function mapDocumentFromDb(dbDoc: any): CaseDocument {
  return {
    id: dbDoc.id,
    caseId: dbDoc.case_id,
    userId: dbDoc.user_id,
    fileName: dbDoc.file_name,
    fileType: dbDoc.file_type,
    fileSize: dbDoc.file_size,
    storagePath: dbDoc.storage_path,
    category: dbDoc.category,
    description: dbDoc.description,
    extractedText: dbDoc.extracted_text,
    extractionStatus: dbDoc.extraction_status,
    createdAt: dbDoc.created_at,
    updatedAt: dbDoc.updated_at
  }
}

export const documentStorage = {
  /**
   * Get all documents for a specific case
   * Documents are strictly filtered by case_id and user_id
   */
  async getDocumentsByCase(caseId: string): Promise<CaseDocument[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return []
    }
    
    const { data, error } = await supabase
      .from('case_documents')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching case documents:', error)
      return []
    }
    
    return (data || []).map(mapDocumentFromDb)
  },

  /**
   * Get documents by category for a specific case
   */
  async getDocumentsByCaseAndCategory(
    caseId: string, 
    category: DocumentCategory
  ): Promise<CaseDocument[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    const { data, error } = await supabase
      .from('case_documents')
      .select('*')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .eq('category', category)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching documents by category:', error)
      return []
    }
    
    return (data || []).map(mapDocumentFromDb)
  },

  /**
   * Get a single document by ID
   */
  async getDocument(documentId: string): Promise<CaseDocument | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('case_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()
    
    if (error || !data) {
      console.error('Error fetching document:', error)
      return null
    }
    
    return mapDocumentFromDb(data)
  },

  /**
   * Upload a document to storage and create database record
   */
  async uploadDocument(upload: DocumentUpload): Promise<CaseDocument | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.error('No authenticated user')
      return null
    }
    
    const { file, caseId, category, description } = upload
    
    // Validate file type
    const fileType = SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]
    if (!fileType) {
      console.error('Unsupported file type:', file.type)
      return null
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error('File too large:', file.size)
      return null
    }
    
    // Generate unique storage path: userId/caseId/timestamp_filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${user.id}/${caseId}/${timestamp}_${sanitizedName}`
    
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('case-files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return null
    }
    
    // Determine extraction status based on file type
    const isTextExtractable = ['pdf', 'docx', 'txt'].includes(fileType)
    const extractionStatus: ExtractionStatus = isTextExtractable ? 'pending' : 'not_applicable'
    
    // Create database record
    const { data, error: dbError } = await supabase
      .from('case_documents')
      .insert({
        case_id: caseId,
        user_id: user.id,
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        storage_path: storagePath,
        category,
        description: description || null,
        extraction_status: extractionStatus
      })
      .select()
      .single()
    
    if (dbError || !data) {
      console.error('Error creating document record:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('case-files').remove([storagePath])
      return null
    }
    
    return mapDocumentFromDb(data)
  },

  /**
   * Update document metadata (category, description)
   */
  async updateDocument(
    documentId: string, 
    updates: { category?: DocumentCategory; description?: string }
  ): Promise<CaseDocument | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    const { data, error } = await supabase
      .from('case_documents')
      .update({
        ...(updates.category && { category: updates.category }),
        ...(updates.description !== undefined && { description: updates.description })
      })
      .eq('id', documentId)
      .eq('user_id', user.id)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Error updating document:', error)
      return null
    }
    
    return mapDocumentFromDb(data)
  },

  /**
   * Update extracted text for a document
   */
  async updateExtractedText(
    documentId: string, 
    extractedText: string,
    status: ExtractionStatus = 'completed'
  ): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    const { error } = await supabase
      .from('case_documents')
      .update({
        extracted_text: extractedText,
        extraction_status: status
      })
      .eq('id', documentId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error updating extracted text:', error)
      return false
    }
    
    return true
  },

  /**
   * Delete a document (removes from storage and database)
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false
    
    // First get the document to find the storage path
    const { data: doc, error: fetchError } = await supabase
      .from('case_documents')
      .select('storage_path')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !doc) {
      console.error('Error finding document to delete:', fetchError)
      return false
    }
    
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('case-files')
      .remove([doc.storage_path])
    
    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue to delete database record anyway
    }
    
    // Delete database record
    const { error: dbError } = await supabase
      .from('case_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', user.id)
    
    if (dbError) {
      console.error('Error deleting document record:', dbError)
      return false
    }
    
    return true
  },

  /**
   * Get a signed URL for downloading/viewing a document
   */
  async getDocumentUrl(documentId: string): Promise<string | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null
    
    // Get the document to verify ownership and get storage path
    const { data: doc, error: fetchError } = await supabase
      .from('case_documents')
      .select('storage_path')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()
    
    if (fetchError || !doc) {
      console.error('Error getting document for URL:', fetchError)
      return null
    }
    
    // Create signed URL (valid for 1 hour)
    const { data, error } = await supabase.storage
      .from('case-files')
      .createSignedUrl(doc.storage_path, 3600)
    
    if (error || !data) {
      console.error('Error creating signed URL:', error)
      return null
    }
    
    return data.signedUrl
  },

  /**
   * Get documents with extracted text for AI generation
   * Only returns documents that have been successfully extracted
   */
  async getDocumentsForAI(
    caseId: string, 
    documentIds?: string[]
  ): Promise<Pick<CaseDocument, 'id' | 'fileName' | 'category' | 'extractedText'>[]> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return []
    
    let query = supabase
      .from('case_documents')
      .select('id, file_name, category, extracted_text')
      .eq('case_id', caseId)
      .eq('user_id', user.id)
      .eq('extraction_status', 'completed')
      .not('extracted_text', 'is', null)
    
    // If specific document IDs are provided, filter by them
    if (documentIds && documentIds.length > 0) {
      query = query.in('id', documentIds)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching documents for AI:', error)
      return []
    }
    
    return (data || []).map((doc: {
      id: string
      file_name: string
      category: DocumentCategory | null
      extracted_text: string
    }) => ({
      id: doc.id,
      fileName: doc.file_name,
      category: doc.category,
      extractedText: doc.extracted_text
    }))
  },

  /**
   * Get document count for a case (useful for UI indicators)
   */
  async getDocumentCount(caseId: string): Promise<number> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return 0
    
    const { count, error } = await supabase
      .from('case_documents')
      .select('*', { count: 'exact', head: true })
      .eq('case_id', caseId)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error getting document count:', error)
      return 0
    }
    
    return count || 0
  }
}

