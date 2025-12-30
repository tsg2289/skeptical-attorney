'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  Archive,
  Edit3,
  Copy,
  Sparkles,
  Filter,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react'
import { 
  aiDocumentStorage, 
  AIGeneratedDocument, 
  AIDocumentType,
  AIDocumentStatus,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_ICONS,
  DOCUMENT_STATUS_CONFIG
} from '@/lib/supabase/aiDocumentStorage'

interface AIDocumentRepositoryProps {
  caseId: string
  caseName?: string
  onDocumentSelect?: (document: AIGeneratedDocument) => void
}

export default function AIDocumentRepository({
  caseId,
  caseName,
  onDocumentSelect
}: AIDocumentRepositoryProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [documents, setDocuments] = useState<AIGeneratedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<AIDocumentType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<AIDocumentStatus | 'all'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  // Load documents for this case
  useEffect(() => {
    loadDocuments()
  }, [caseId])

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null)
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [actionMenuOpen])

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const docs = await aiDocumentStorage.getDocumentsByCase(caseId)
      setDocuments(docs)
    } catch (err) {
      console.error('Error loading AI documents:', err)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    if (filterType !== 'all' && doc.documentType !== filterType) return false
    if (filterStatus !== 'all' && doc.status !== filterStatus) return false
    return true
  })

  // Group documents by type
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.documentType]) acc[doc.documentType] = []
    acc[doc.documentType].push(doc)
    return acc
  }, {} as Record<AIDocumentType, AIGeneratedDocument[]>)

  // Handle delete
  const handleDelete = async (docId: string) => {
    try {
      const success = await aiDocumentStorage.deleteDocument(docId)
      if (success) {
        setDocuments(docs => docs.filter(d => d.id !== docId))
        setDeleteConfirm(null)
      }
    } catch (err) {
      console.error('Error deleting document:', err)
    }
  }

  // Handle duplicate
  const handleDuplicate = async (docId: string) => {
    try {
      const newDoc = await aiDocumentStorage.duplicateDocument(docId)
      if (newDoc) {
        setDocuments(docs => [newDoc, ...docs])
      }
      setActionMenuOpen(null)
    } catch (err) {
      console.error('Error duplicating document:', err)
    }
  }

  // Handle archive
  const handleArchive = async (docId: string) => {
    try {
      const updated = await aiDocumentStorage.archiveDocument(docId)
      if (updated) {
        setDocuments(docs => docs.map(d => d.id === docId ? updated : d))
      }
      setActionMenuOpen(null)
    } catch (err) {
      console.error('Error archiving document:', err)
    }
  }

  // Handle finalize
  const handleFinalize = async (docId: string) => {
    try {
      const updated = await aiDocumentStorage.finalizeDocument(docId)
      if (updated) {
        setDocuments(docs => docs.map(d => d.id === docId ? updated : d))
      }
      setActionMenuOpen(null)
    } catch (err) {
      console.error('Error finalizing document:', err)
    }
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Get status badge
  const getStatusBadge = (status: AIDocumentStatus) => {
    const config = DOCUMENT_STATUS_CONFIG[status]
    const colors: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      green: 'bg-green-100 text-green-700',
      blue: 'bg-blue-100 text-blue-700'
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[config.color]}`}>
        {config.label}
      </span>
    )
  }

  // Get document type navigation URL
  const getDocumentUrl = (doc: AIGeneratedDocument) => {
    const baseUrl = `/services`
    const typeUrls: Record<AIDocumentType, string> = {
      demand_letter: `${baseUrl}/demand-letters?caseId=${caseId}`,
      complaint: `${baseUrl}/pleadings/complaint?caseId=${caseId}`,
      answer: `${baseUrl}/pleadings/answer?caseId=${caseId}`,
      interrogatories: `/dashboard/cases/${caseId}/discovery/interrogatories`,
      requests_for_production: `/dashboard/cases/${caseId}/discovery/rfp`,
      requests_for_admission: `/dashboard/cases/${caseId}/discovery/rfa`,
      motion: `${baseUrl}/law-and-motion?caseId=${caseId}`,
      status_report: `${baseUrl}/status-report?caseId=${caseId}`,
      deposition_outline: `${baseUrl}/deposition?caseId=${caseId}`,
      settlement_agreement: `${baseUrl}/settlement-agreements?caseId=${caseId}`
    }
    return typeUrls[doc.documentType] || '#'
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Sparkles className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Generated Documents</h3>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
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
          {/* Filters */}
          {documents.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Filter:</span>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as AIDocumentType | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Types</option>
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as AIDocumentStatus | 'all')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="finalized">Finalized</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-6 text-red-600">
              <p>{error}</p>
              <button 
                onClick={loadDocuments}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && documents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No AI-generated documents yet</p>
              <p className="text-sm mt-1">
                Documents you create with AI (demand letters, complaints, motions, etc.) will appear here
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <a 
                  href={`/services/demand-letters?caseId=${caseId}`}
                  className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Create Demand Letter
                </a>
                <a 
                  href={`/services/pleadings/complaint?caseId=${caseId}`}
                  className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Create Complaint
                </a>
                <a 
                  href={`/services/law-and-motion?caseId=${caseId}`}
                  className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Create Motion
                </a>
              </div>
            </div>
          )}

          {/* No Results After Filter */}
          {!loading && !error && documents.length > 0 && filteredDocuments.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <p>No documents match your filters</p>
              <button
                onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Document List */}
          {!loading && !error && filteredDocuments.length > 0 && (
            <div className="space-y-4">
              {Object.entries(groupedDocuments).map(([type, docs]) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <span className="mr-2">{DOCUMENT_TYPE_ICONS[type as AIDocumentType]}</span>
                    {DOCUMENT_TYPE_LABELS[type as AIDocumentType]}
                    <span className="ml-2 text-gray-400">({docs.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-purple-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {doc.title}
                              </p>
                              {getStatusBadge(doc.status)}
                              {doc.version > 1 && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  v{doc.version}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Last updated: {formatDate(doc.updatedAt)}
                              {doc.description && ` • ${doc.description}`}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 ml-3">
                          {/* Open in Editor */}
                          <a
                            href={getDocumentUrl(doc)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Open in Editor"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>

                          {/* More Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionMenuOpen(actionMenuOpen === doc.id ? null : doc.id)
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="More actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {actionMenuOpen === doc.id && (
                              <div 
                                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {onDocumentSelect && (
                                  <button
                                    onClick={() => {
                                      onDocumentSelect(doc)
                                      setActionMenuOpen(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                    Edit Document
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDuplicate(doc.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Copy className="h-4 w-4" />
                                  Duplicate
                                </button>
                                {doc.status === 'draft' && (
                                  <button
                                    onClick={() => handleFinalize(doc.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Mark as Finalized
                                  </button>
                                )}
                                {doc.status !== 'archived' && (
                                  <button
                                    onClick={() => handleArchive(doc.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Archive className="h-4 w-4" />
                                    Archive
                                  </button>
                                )}
                                <hr className="my-1 border-gray-200" />
                                <button
                                  onClick={() => {
                                    setDeleteConfirm(doc.id)
                                    setActionMenuOpen(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Document?</h3>
                <p className="text-gray-600 mb-4">
                  This action cannot be undone. The document will be permanently deleted.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}








