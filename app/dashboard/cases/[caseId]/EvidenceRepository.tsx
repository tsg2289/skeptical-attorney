'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Scale,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Camera,
  Video,
  Music,
  Package,
  MessageSquare,
  Stethoscope,
  DollarSign,
  Mail,
  FileSignature,
  Laptop,
  MoreHorizontal,
  Folder,
  FolderPlus,
  Star,
  StarOff
} from 'lucide-react'
import {
  evidenceStorage,
  EvidenceCategory,
  CaseEvidence,
  EvidenceImportance,
  EvidenceStatus,
  EvidenceType,
  EVIDENCE_IMPORTANCE,
  EVIDENCE_STATUS,
  EVIDENCE_TYPES
} from '@/lib/supabase/evidenceStorage'

interface EvidenceRepositoryProps {
  caseId: string
}

// Icon mapping for evidence types
const EVIDENCE_TYPE_ICONS: Record<EvidenceType, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  photograph: <Camera className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  audio: <Music className="h-4 w-4" />,
  physical: <Package className="h-4 w-4" />,
  testimony: <MessageSquare className="h-4 w-4" />,
  expert_report: <FileSignature className="h-4 w-4" />,
  medical_record: <Stethoscope className="h-4 w-4" />,
  financial_record: <DollarSign className="h-4 w-4" />,
  correspondence: <Mail className="h-4 w-4" />,
  contract: <FileSignature className="h-4 w-4" />,
  digital: <Laptop className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />
}

// Default category colors for new tabs
const CATEGORY_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
]

export default function EvidenceRepository({ caseId }: EvidenceRepositoryProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [categories, setCategories] = useState<EvidenceCategory[]>([])
  const [evidence, setEvidence] = useState<CaseEvidence[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | 'all' | 'uncategorized'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [showAddEvidence, setShowAddEvidence] = useState(false)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingEvidence, setEditingEvidence] = useState<CaseEvidence | null>(null)
  const [editingCategory, setEditingCategory] = useState<EvidenceCategory | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // New evidence form
  const [newEvidence, setNewEvidence] = useState({
    title: '',
    description: '',
    evidenceType: 'document' as EvidenceType,
    importance: 'unknown' as EvidenceImportance,
    importanceNotes: '',
    status: 'pending_review' as EvidenceStatus,
    source: '',
    dateObtained: '',
    dateOfEvidence: '',
    obtainedFrom: '',
    tags: '',
    notes: '',
    evidenceNumber: '',
    categoryId: ''
  })

  // New category form
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: CATEGORY_COLORS[0]
  })

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [categoriesData, evidenceData] = await Promise.all([
        evidenceStorage.getCategories(caseId),
        evidenceStorage.getEvidence(caseId)
      ])
      setCategories(categoriesData)
      setEvidence(evidenceData)
      setError(null)
    } catch (err) {
      console.error('Error fetching evidence data:', err)
      setError('Failed to load evidence')
    } finally {
      setIsLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter evidence by selected category
  const filteredEvidence = evidence.filter(item => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'uncategorized') return !item.categoryId
    return item.categoryId === selectedCategory
  })

  // Group evidence by importance
  const evidenceByImportance = filteredEvidence.reduce((acc, item) => {
    if (!acc[item.importance]) acc[item.importance] = []
    acc[item.importance].push(item)
    return acc
  }, {} as Record<EvidenceImportance, CaseEvidence[]>)

  // Count evidence by importance
  const importanceCounts = evidence.reduce((acc, item) => {
    acc[item.importance] = (acc[item.importance] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Handle create category
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return
    
    setIsSaving(true)
    try {
      const created = await evidenceStorage.createCategory(caseId, {
        name: newCategory.name,
        description: newCategory.description,
        color: newCategory.color
      })
      
      if (created) {
        setCategories(prev => [...prev, created])
        setNewCategory({ name: '', description: '', color: CATEGORY_COLORS[(categories.length + 1) % CATEGORY_COLORS.length] })
        setShowAddCategory(false)
      }
    } catch (err) {
      console.error('Error creating category:', err)
      setError('Failed to create category')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Evidence items will be moved to uncategorized.')) return
    
    try {
      const success = await evidenceStorage.deleteCategory(categoryId)
      if (success) {
        setCategories(prev => prev.filter(c => c.id !== categoryId))
        if (selectedCategory === categoryId) {
          setSelectedCategory('all')
        }
        // Update evidence items that had this category
        setEvidence(prev => prev.map(e => 
          e.categoryId === categoryId ? { ...e, categoryId: undefined } : e
        ))
      }
    } catch (err) {
      console.error('Error deleting category:', err)
      setError('Failed to delete category')
    }
  }

  // Handle create evidence
  const handleCreateEvidence = async () => {
    if (!newEvidence.title.trim()) return
    
    setIsSaving(true)
    try {
      const created = await evidenceStorage.createEvidence(caseId, {
        title: newEvidence.title,
        description: newEvidence.description || undefined,
        evidenceType: newEvidence.evidenceType,
        importance: newEvidence.importance,
        importanceNotes: newEvidence.importanceNotes || undefined,
        status: newEvidence.status,
        source: newEvidence.source || undefined,
        dateObtained: newEvidence.dateObtained || undefined,
        dateOfEvidence: newEvidence.dateOfEvidence || undefined,
        obtainedFrom: newEvidence.obtainedFrom || undefined,
        tags: newEvidence.tags ? newEvidence.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
        notes: newEvidence.notes || undefined,
        evidenceNumber: newEvidence.evidenceNumber || undefined,
        categoryId: newEvidence.categoryId || undefined
      })
      
      if (created) {
        setEvidence(prev => [created, ...prev])
        setNewEvidence({
          title: '',
          description: '',
          evidenceType: 'document',
          importance: 'unknown',
          importanceNotes: '',
          status: 'pending_review',
          source: '',
          dateObtained: '',
          dateOfEvidence: '',
          obtainedFrom: '',
          tags: '',
          notes: '',
          evidenceNumber: '',
          categoryId: ''
        })
        setShowAddEvidence(false)
      }
    } catch (err) {
      console.error('Error creating evidence:', err)
      setError('Failed to create evidence')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle update evidence
  const handleUpdateEvidence = async () => {
    if (!editingEvidence) return
    
    setIsSaving(true)
    try {
      const updated = await evidenceStorage.updateEvidence(editingEvidence.id, {
        title: editingEvidence.title,
        description: editingEvidence.description,
        categoryId: editingEvidence.categoryId || null,
        evidenceType: editingEvidence.evidenceType,
        importance: editingEvidence.importance,
        importanceNotes: editingEvidence.importanceNotes,
        status: editingEvidence.status,
        source: editingEvidence.source,
        dateObtained: editingEvidence.dateObtained,
        dateOfEvidence: editingEvidence.dateOfEvidence,
        obtainedFrom: editingEvidence.obtainedFrom,
        tags: editingEvidence.tags,
        notes: editingEvidence.notes,
        legalAnalysis: editingEvidence.legalAnalysis,
        evidenceNumber: editingEvidence.evidenceNumber,
        batesStart: editingEvidence.batesStart,
        batesEnd: editingEvidence.batesEnd
      })
      
      if (updated) {
        setEvidence(prev => prev.map(e => e.id === updated.id ? updated : e))
        setEditingEvidence(null)
      }
    } catch (err) {
      console.error('Error updating evidence:', err)
      setError('Failed to update evidence')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete evidence
  const handleDeleteEvidence = async (evidenceId: string) => {
    if (!confirm('Are you sure you want to delete this evidence item?')) return
    
    try {
      const success = await evidenceStorage.deleteEvidence(evidenceId)
      if (success) {
        setEvidence(prev => prev.filter(e => e.id !== evidenceId))
      }
    } catch (err) {
      console.error('Error deleting evidence:', err)
      setError('Failed to delete evidence')
    }
  }

  // Quick importance update
  const handleQuickImportanceUpdate = async (evidenceId: string, importance: EvidenceImportance) => {
    try {
      const updated = await evidenceStorage.updateEvidence(evidenceId, { importance })
      if (updated) {
        setEvidence(prev => prev.map(e => e.id === updated.id ? updated : e))
      }
    } catch (err) {
      console.error('Error updating importance:', err)
    }
  }

  // Get category by ID
  const getCategoryById = (categoryId?: string) => {
    return categories.find(c => c.id === categoryId)
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-teal-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Scale className="h-6 w-6 text-emerald-600" />
          <h3 className="text-lg font-semibold text-gray-900">Evidence Repository</h3>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
            {evidence.length} {evidence.length === 1 ? 'item' : 'items'}
          </span>
          {importanceCounts.critical > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-sm font-medium rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {importanceCounts.critical} Critical
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-500" />
        )}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Category Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex items-center space-x-1 overflow-x-auto pb-2">
              {/* All Tab */}
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-100 text-emerald-800 border-b-2 border-emerald-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All Evidence ({evidence.length})
              </button>

              {/* Uncategorized Tab */}
              {evidence.some(e => !e.categoryId) && (
                <button
                  onClick={() => setSelectedCategory('uncategorized')}
                  className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === 'uncategorized'
                      ? 'bg-gray-200 text-gray-800 border-b-2 border-gray-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Uncategorized ({evidence.filter(e => !e.categoryId).length})
                </button>
              )}

              {/* Custom Category Tabs */}
              {categories.map(category => {
                const count = evidence.filter(e => e.categoryId === category.id).length
                return (
                  <div key={category.id} className="relative group">
                    <button
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                        selectedCategory === category.id
                          ? 'border-b-2'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: selectedCategory === category.id ? `${category.color}20` : undefined,
                        color: selectedCategory === category.id ? category.color : undefined,
                        borderColor: selectedCategory === category.id ? category.color : undefined
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name} ({count})
                    </button>
                    {/* Delete Category Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCategory(category.id)
                      }}
                      className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-4 h-4 bg-red-500 text-white rounded-full text-xs"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })}

              {/* Add Category Button */}
              <button
                onClick={() => setShowAddCategory(true)}
                className="px-3 py-2 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1 text-sm"
              >
                <FolderPlus className="h-4 w-4" />
                Add Tab
              </button>
            </div>
          </div>

          {/* Add Category Form */}
          {showAddCategory && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Folder className="h-4 w-4" />
                New Category Tab
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Category name *"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Color:</span>
                  <div className="flex gap-1">
                    {CATEGORY_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                        className={`w-6 h-6 rounded-full border-2 ${
                          newCategory.color === color ? 'border-gray-800' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCategory}
                  disabled={isSaving || !newCategory.name.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Create Category
                </button>
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add Evidence Button */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowAddEvidence(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Evidence
            </button>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              {Object.entries(EVIDENCE_IMPORTANCE).slice(0, 4).map(([key, value]) => (
                <span key={key} className={`${value.color} flex items-center gap-1`}>
                  <span className={`w-2 h-2 rounded-full ${value.bgColor}`} />
                  {importanceCounts[key] || 0} {value.label}
                </span>
              ))}
            </div>
          </div>

          {/* Add Evidence Form */}
          {showAddEvidence && (
            <div className="bg-emerald-50 rounded-lg p-4 space-y-4 border border-emerald-200">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                Add New Evidence
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    placeholder="Evidence title"
                    value={newEvidence.title}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Evidence Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Number</label>
                  <input
                    type="text"
                    placeholder="e.g., Exhibit A, P-001"
                    value={newEvidence.evidenceNumber}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, evidenceNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={newEvidence.categoryId}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Evidence Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={newEvidence.evidenceType}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, evidenceType: e.target.value as EvidenceType }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(EVIDENCE_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Importance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importance</label>
                  <select
                    value={newEvidence.importance}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, importance: e.target.value as EvidenceImportance }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(EVIDENCE_IMPORTANCE).map(([value, info]) => (
                      <option key={value} value={value}>{info.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newEvidence.status}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, status: e.target.value as EvidenceStatus }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(EVIDENCE_STATUS).map(([value, info]) => (
                      <option key={value} value={value}>{info.label}</option>
                    ))}
                  </select>
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input
                    type="text"
                    placeholder="Where did this come from?"
                    value={newEvidence.source}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Obtained From */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Obtained From</label>
                  <input
                    type="text"
                    placeholder="Person/entity"
                    value={newEvidence.obtainedFrom}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, obtainedFrom: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Date Obtained */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Obtained</label>
                  <input
                    type="date"
                    value={newEvidence.dateObtained}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, dateObtained: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Date of Evidence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Evidence</label>
                  <input
                    type="date"
                    value={newEvidence.dateOfEvidence}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, dateOfEvidence: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    placeholder="Describe this evidence..."
                    value={newEvidence.description}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Importance Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Why is this important?</label>
                  <textarea
                    placeholder="Explain the significance of this evidence..."
                    value={newEvidence.importanceNotes}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, importanceNotes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., medical, liability, damages"
                    value={newEvidence.tags}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    placeholder="Any additional notes..."
                    value={newEvidence.notes}
                    onChange={(e) => setNewEvidence(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateEvidence}
                  disabled={isSaving || !newEvidence.title.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Evidence'}
                </button>
                <button
                  onClick={() => setShowAddEvidence(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Evidence List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : filteredEvidence.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Scale className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No evidence items yet</p>
              <p className="text-sm">Click &quot;Add Evidence&quot; to start cataloging case evidence</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Importance order: critical first */}
              {(['critical', 'very_important', 'important', 'relevant', 'minor', 'unknown'] as EvidenceImportance[]).map(importance => {
                const items = evidenceByImportance[importance]
                if (!items || items.length === 0) return null
                
                const { label, color, bgColor } = EVIDENCE_IMPORTANCE[importance]
                
                return (
                  <div key={importance} className="space-y-2">
                    <h4 className={`text-sm font-medium ${color} flex items-center gap-2`}>
                      {importance === 'critical' && <AlertTriangle className="h-4 w-4" />}
                      {importance === 'very_important' && <Star className="h-4 w-4" />}
                      {label} ({items.length})
                    </h4>
                    
                    {items.map(item => {
                      const category = getCategoryById(item.categoryId)
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg border ${bgColor} border-gray-200 hover:shadow-md transition-shadow`}
                        >
                          {editingEvidence?.id === item.id ? (
                            // Edit Form
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={editingEvidence.title}
                                onChange={(e) => setEditingEvidence(prev => prev ? { ...prev, title: e.target.value } : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <select
                                  value={editingEvidence.importance}
                                  onChange={(e) => setEditingEvidence(prev => prev ? { ...prev, importance: e.target.value as EvidenceImportance } : null)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  {Object.entries(EVIDENCE_IMPORTANCE).map(([value, info]) => (
                                    <option key={value} value={value}>{info.label}</option>
                                  ))}
                                </select>
                                <select
                                  value={editingEvidence.status}
                                  onChange={(e) => setEditingEvidence(prev => prev ? { ...prev, status: e.target.value as EvidenceStatus } : null)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  {Object.entries(EVIDENCE_STATUS).map(([value, info]) => (
                                    <option key={value} value={value}>{info.label}</option>
                                  ))}
                                </select>
                                <select
                                  value={editingEvidence.categoryId || ''}
                                  onChange={(e) => setEditingEvidence(prev => prev ? { ...prev, categoryId: e.target.value || undefined } : null)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">Uncategorized</option>
                                  {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                                <select
                                  value={editingEvidence.evidenceType}
                                  onChange={(e) => setEditingEvidence(prev => prev ? { ...prev, evidenceType: e.target.value as EvidenceType } : null)}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  {Object.entries(EVIDENCE_TYPES).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </div>
                              <textarea
                                value={editingEvidence.description || ''}
                                onChange={(e) => setEditingEvidence(prev => prev ? { ...prev, description: e.target.value } : null)}
                                placeholder="Description"
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <textarea
                                value={editingEvidence.importanceNotes || ''}
                                onChange={(e) => setEditingEvidence(prev => prev ? { ...prev, importanceNotes: e.target.value } : null)}
                                placeholder="Why is this important?"
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleUpdateEvidence}
                                  disabled={isSaving}
                                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                                >
                                  {isSaving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => setEditingEvidence(null)}
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            // Display
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Evidence Type Icon */}
                                  <span className="text-gray-500">
                                    {EVIDENCE_TYPE_ICONS[item.evidenceType]}
                                  </span>
                                  
                                  {/* Title */}
                                  <h5 className="font-medium text-gray-900 truncate">
                                    {item.evidenceNumber && (
                                      <span className="text-gray-500 mr-1">[{item.evidenceNumber}]</span>
                                    )}
                                    {item.title}
                                  </h5>
                                  
                                  {/* Category Badge */}
                                  {category && (
                                    <span
                                      className="px-2 py-0.5 rounded-full text-xs font-medium"
                                      style={{
                                        backgroundColor: `${category.color}20`,
                                        color: category.color
                                      }}
                                    >
                                      {category.name}
                                    </span>
                                  )}
                                  
                                  {/* Status Badge */}
                                  <span className={`text-xs ${EVIDENCE_STATUS[item.status].color}`}>
                                    {EVIDENCE_STATUS[item.status].label}
                                  </span>
                                </div>
                                
                                {item.description && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                                )}
                                
                                {item.importanceNotes && (
                                  <p className="text-sm text-gray-500 mt-1 italic">
                                    &quot;{item.importanceNotes}&quot;
                                  </p>
                                )}
                                
                                {/* Tags */}
                                {item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {item.tags.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs flex items-center gap-1"
                                      >
                                        <Tag className="h-3 w-3" />
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                
                                {/* Metadata */}
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                                  {item.source && <span>Source: {item.source}</span>}
                                  {item.dateOfEvidence && (
                                    <span>Date: {new Date(item.dateOfEvidence).toLocaleDateString()}</span>
                                  )}
                                  {item.obtainedFrom && <span>From: {item.obtainedFrom}</span>}
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-1 ml-4">
                                {/* Quick Importance Toggle */}
                                <div className="flex items-center gap-0.5 mr-2">
                                  {(['critical', 'very_important', 'important'] as EvidenceImportance[]).map(imp => (
                                    <button
                                      key={imp}
                                      onClick={() => handleQuickImportanceUpdate(item.id, imp === item.importance ? 'unknown' : imp)}
                                      title={EVIDENCE_IMPORTANCE[imp].label}
                                      className={`p-1 rounded transition-colors ${
                                        item.importance === imp
                                          ? EVIDENCE_IMPORTANCE[imp].bgColor
                                          : 'hover:bg-gray-200'
                                      }`}
                                    >
                                      {imp === 'critical' ? (
                                        <AlertTriangle className={`h-4 w-4 ${item.importance === imp ? 'text-red-600' : 'text-gray-400'}`} />
                                      ) : (
                                        <Star className={`h-4 w-4 ${item.importance === imp ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                                      )}
                                    </button>
                                  ))}
                                </div>
                                
                                <button
                                  onClick={() => setEditingEvidence(item)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvidence(item.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

