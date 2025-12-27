'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  FileText, 
  Upload, 
  Trash2, 
  Download, 
  Eye, 
  ChevronDown,
  ChevronUp,
  FileImage,
  File,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Folder
} from 'lucide-react'
import { DocumentCategory, DOCUMENT_CATEGORIES, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/supabase/documentStorage'

interface CaseDocument {
  id: string
  caseId: string
  fileName: string
  fileType: string
  fileSize: number
  category: DocumentCategory
  description?: string
  extractionStatus: 'pending' | 'completed' | 'failed' | 'not_applicable'
  hasExtractedText: boolean
  createdAt: string
  updatedAt: string
}

interface DocumentRepositoryProps {
  caseId: string
  documents: CaseDocument[]
  onDocumentsChange: () => void
  selectedDocumentIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  selectionMode?: boolean
}

export default function DocumentRepository({
  caseId,
  documents,
  onDocumentsChange,
  selectedDocumentIds = [],
  onSelectionChange,
  selectionMode = false
}: DocumentRepositoryProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('other')
  const [description, setDescription] = useState('')
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | 'all'>('all')
  const [previewDoc, setPreviewDoc] = useState<CaseDocument | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewExtractedText, setPreviewExtractedText] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  // Listen for expand repository events from AI Assistant
  useEffect(() => {
    const handleExpandRepository = (event: CustomEvent<{ category: string | null }>) => {
      // Expand the repository
      setIsExpanded(true)
      // Set filter category if provided
      if (event.detail.category) {
        setFilterCategory(event.detail.category as DocumentCategory)
      }
    }
    
    window.addEventListener('expandDocumentRepository', handleExpandRepository as EventListener)
    return () => {
      window.removeEventListener('expandDocumentRepository', handleExpandRepository as EventListener)
    }
  }, [])
  
  // Listen for open document events from AI Assistant
  useEffect(() => {
    const handleOpenDocument = async (event: CustomEvent<{ documentId: string; fileName: string }>) => {
      // Find the document in our list
      const doc = documents.find(d => d.id === event.detail.documentId)
      if (doc) {
        // Expand the repository first
        setIsExpanded(true)
        // Trigger preview
        setPreviewDoc(doc)
        setLoadingPreview(true)
        setPreviewExtractedText(null)
        
        try {
          const response = await fetch(`/api/documents/${doc.id}`)
          if (!response.ok) throw new Error('Failed to load document')
          
          const data = await response.json()
          setPreviewUrl(data.document.downloadUrl)
          // Store extracted text for text-based document preview
          if (data.document.extractedText) {
            setPreviewExtractedText(data.document.extractedText)
          }
        } catch (error) {
          console.error('Preview error:', error)
        } finally {
          setLoadingPreview(false)
        }
      }
    }
    
    window.addEventListener('assistantOpenDocument', handleOpenDocument as EventListener)
    return () => {
      window.removeEventListener('assistantOpenDocument', handleOpenDocument as EventListener)
    }
  }, [documents])

  // Filter documents by category
  const filteredDocuments = filterCategory === 'all' 
    ? documents 
    : documents.filter(doc => doc.category === filterCategory)

  // Group documents by category for display
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = []
    acc[doc.category].push(doc)
    return acc
  }, {} as Record<DocumentCategory, CaseDocument[]>)

  // Handle file upload
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadError(null)

    for (const file of Array.from(files)) {
      // Validate file type
      if (!SUPPORTED_FILE_TYPES[file.type as keyof typeof SUPPORTED_FILE_TYPES]) {
        setUploadError(`Unsupported file type: ${file.name}. Supported: PDF, Word, Text, JPEG, PNG`)
        continue
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File too large: ${file.name}. Maximum size is 10MB`)
        continue
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', caseId)
      formData.append('category', selectedCategory)
      if (description) formData.append('description', description)

      try {
        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Upload failed')
        }

        // Clear description after successful upload
        setDescription('')
      } catch (error) {
        console.error('Upload error:', error)
        setUploadError(error instanceof Error ? error.message : 'Upload failed')
      }
    }

    setIsUploading(false)
    onDocumentsChange()
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }, [caseId, selectedCategory, description])

  // Handle document deletion
  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete document')
      }

      onDocumentsChange()
    } catch (error) {
      console.error('Delete error:', error)
      setUploadError('Failed to delete document')
    }
  }

  // Handle document preview
  const handlePreview = async (doc: CaseDocument) => {
    setPreviewDoc(doc)
    setLoadingPreview(true)
    setPreviewExtractedText(null)

    try {
      const response = await fetch(`/api/documents/${doc.id}`)
      if (!response.ok) throw new Error('Failed to load document')
      
      const data = await response.json()
      setPreviewUrl(data.document.downloadUrl)
      // Store extracted text for text-based document preview
      if (data.document.extractedText) {
        setPreviewExtractedText(data.document.extractedText)
      }
    } catch (error) {
      console.error('Preview error:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  // Handle document download
  const handleDownload = async (doc: CaseDocument) => {
    try {
      const response = await fetch(`/api/documents/${doc.id}`)
      if (!response.ok) throw new Error('Failed to get download URL')
      
      const data = await response.json()
      if (data.document.downloadUrl) {
        window.open(data.document.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  // Handle selection toggle
  const handleSelectionToggle = (docId: string) => {
    if (!onSelectionChange) return
    
    if (selectedDocumentIds.includes(docId)) {
      onSelectionChange(selectedDocumentIds.filter(id => id !== docId))
    } else {
      onSelectionChange([...selectedDocumentIds, docId])
    }
  }

  // Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (['jpg', 'png', 'webp'].includes(fileType)) {
      return <FileImage className="h-5 w-5 text-blue-500" />
    }
    if (fileType === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    return <File className="h-5 w-5 text-gray-500" />
  }

  // Get extraction status icon
  const getExtractionIcon = (status: string, hasText: boolean) => {
    if (status === 'completed' && hasText) {
      return <span title="Text extracted"><CheckCircle className="h-4 w-4 text-green-500" /></span>
    }
    if (status === 'pending') {
      return <span title="Extraction pending"><Clock className="h-4 w-4 text-yellow-500" /></span>
    }
    if (status === 'failed') {
      return <span title="Extraction failed"><AlertCircle className="h-4 w-4 text-red-500" /></span>
    }
    return null
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Folder className="h-6 w-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Document Repository</h3>
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
            {documents.length} {documents.length === 1 ? 'file' : 'files'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragOver 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-300 hover:border-indigo-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">
              Drag and drop files here, or{' '}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                browse
              </button>
            </p>
            <p className="text-sm text-gray-500">
              PDF, Word, Text, JPEG, PNG • Max 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
              onChange={(e) => handleUpload(e.target.files)}
              className="hidden"
            />

            {/* Upload Options */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-48"
              />
            </div>
          </div>

          {/* Upload Status */}
          {isUploading && (
            <div className="flex items-center justify-center space-x-2 text-indigo-600">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent" />
              <span>Uploading...</span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{uploadError}</span>
              <button onClick={() => setUploadError(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Category Filter */}
          {documents.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Filter:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as DocumentCategory | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Categories</option>
                {Object.entries(DOCUMENT_CATEGORIES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selection Mode Info */}
          {selectionMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Select documents</strong> to include their content in AI generation. 
                Only documents with successfully extracted text can be selected.
              </p>
              {selectedDocumentIds.length > 0 && (
                <p className="text-sm text-amber-700 mt-1">
                  {selectedDocumentIds.length} document(s) selected
                </p>
              )}
            </div>
          )}

          {/* Document List */}
          {documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No documents uploaded yet</p>
              <p className="text-sm">Upload medical records, police reports, and other case documents</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No documents in this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedDocuments).map(([category, docs]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2" />
                    {DOCUMENT_CATEGORIES[category as DocumentCategory]}
                    <span className="ml-2 text-gray-400">({docs.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div 
                        key={doc.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          selectionMode && selectedDocumentIds.includes(doc.id)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          {/* Selection Checkbox */}
                          {selectionMode && doc.extractionStatus === 'completed' && doc.hasExtractedText && (
                            <input
                              type="checkbox"
                              checked={selectedDocumentIds.includes(doc.id)}
                              onChange={() => handleSelectionToggle(doc.id)}
                              className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                            />
                          )}
                          
                          {/* File Icon */}
                          {getFileIcon(doc.fileType)}
                          
                          {/* File Info */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {doc.fileName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                              {doc.description && ` • ${doc.description}`}
                            </p>
                          </div>
                          
                          {/* Extraction Status */}
                          {getExtractionIcon(doc.extractionStatus, doc.hasExtractedText)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-3">
                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview Modal - Styled like Demand Letter Preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => { setPreviewDoc(null); setPreviewUrl(null); setPreviewExtractedText(null); }}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header - Blue gradient like demand letter */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div>
                  <h2 className="text-2xl font-bold">Document Preview</h2>
                  <p className="text-sm text-blue-100 mt-1">{previewDoc.fileName}</p>
                </div>
                <button
                  onClick={() => { setPreviewDoc(null); setPreviewUrl(null); setPreviewExtractedText(null); }}
                  className="text-white hover:text-blue-100 transition-colors p-2 rounded-full hover:bg-blue-800"
                  aria-label="Close preview"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                {loadingPreview ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                  </div>
                ) : previewUrl ? (
                  // Image preview
                  ['jpg', 'png', 'webp'].includes(previewDoc.fileType) ? (
                    <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg">
                      <img 
                        src={previewUrl} 
                        alt={previewDoc.fileName}
                        className="max-w-full mx-auto rounded-lg"
                      />
                    </div>
                  ) : previewDoc.fileType === 'pdf' ? (
                    // PDF preview
                    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                      <iframe
                        src={previewUrl}
                        className="w-full h-[600px]"
                        title={previewDoc.fileName}
                      />
                    </div>
                  ) : previewExtractedText ? (
                    // Text content preview for docx, txt files - styled like demand letter
                    <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg">
                      {/* Document Header */}
                      <div className="mb-6 text-center border-b border-gray-200 pb-4">
                        <p className="text-lg font-bold text-gray-900">{DOCUMENT_CATEGORIES[previewDoc.category].toUpperCase()}</p>
                        <p className="text-sm text-gray-600">{previewDoc.fileName}</p>
                        <p className="text-sm text-gray-600">
                          Uploaded: {new Date(previewDoc.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>

                      {/* Document Content - Same styling as demand letter sections */}
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide underline">
                          DOCUMENT CONTENT:
                        </h3>
                        <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm text-justify">
                          {previewExtractedText}
                        </div>
                      </div>

                      {/* Document Footer */}
                      <div className="mt-12 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                          File Size: {formatFileSize(previewDoc.fileSize)} • Type: {previewDoc.fileType.toUpperCase()}
                        </p>
                        {previewDoc.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            Description: {previewDoc.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Fallback for files without extracted text
                    <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg text-center">
                      <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 mb-2">No text content available for preview</p>
                      <p className="text-gray-400 text-sm mb-4">Text extraction may have failed or is not supported for this file</p>
                    </div>
                  )
                ) : (
                  <div className="max-w-3xl mx-auto bg-white p-8 shadow-lg text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">Failed to load preview</p>
                  </div>
                )}
              </div>

              {/* Footer Actions - Same style as demand letter */}
              <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-white">
                <button
                  onClick={() => { setPreviewDoc(null); setPreviewUrl(null); setPreviewExtractedText(null); }}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-full font-semibold hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Original
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

