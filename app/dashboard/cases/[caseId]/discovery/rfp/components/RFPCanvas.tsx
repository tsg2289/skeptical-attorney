'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Save, Check, Sparkles, ChevronDown, ChevronUp, X, FolderPlus, RotateCcw } from 'lucide-react'
import { 
  CaseFrontend, 
  supabaseCaseStorage, 
  RFPDocument,
  DiscoveryCategory
} from '@/lib/supabase/caseStorage'
import { aiDocumentStorage } from '@/lib/supabase/aiDocumentStorage'
import RFPAIPanel from './RFPAIPanel'
import DiscoveryPreviewModal from '../../components/DiscoveryPreviewModal'
import { DEFAULT_RFP_DEFINITIONS } from '@/lib/data/rfpTemplateQuestions'
import { getCategoriesForCaseType } from '@/lib/data/discoveryCategories'

interface Props {
  caseData: CaseFrontend
  onCaseUpdate: (updatedCase: CaseFrontend) => void
  isTrialMode?: boolean
}

export default function RFPCanvas({ caseData, onCaseUpdate, isTrialMode = false }: Props) {
  // Get dynamic categories based on case type - SECURITY: uses verified caseType from caseData
  const defaultCategories = useMemo(() => {
    return getCategoriesForCaseType(caseData.caseType)
  }, [caseData.caseType])

  const [document, setDocument] = useState<RFPDocument>(() => {
    if (caseData.discoveryDocuments?.rfp) {
      return caseData.discoveryDocuments.rfp
    }
    return {
      metadata: {
        propoundingParty: 'defendant',
        respondingParty: 'plaintiff',
        setNumber: 1,
        jurisdiction: 'california'
      },
      definitions: DEFAULT_RFP_DEFINITIONS,
      categories: defaultCategories
    }
  })
  
  // Drag and drop state for items
  const [draggedItem, setDraggedItem] = useState<{ categoryId: string; itemId: string } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{ categoryId: string; itemId: string } | null>(null)
  
  // Drag and drop state for categories
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null)
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null)
  
  // AI Panel state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Save state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [savingToRepo, setSavingToRepo] = useState(false)
  const [repoSaveSuccess, setRepoSaveSuccess] = useState(false)
  
  // Collapsed sections
  const [definitionsExpanded, setDefinitionsExpanded] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(defaultCategories.map(c => c.id)))
  
  // Preview modal
  const [showPreview, setShowPreview] = useState(false)

  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const getTotalItemCount = () => {
    return document.categories.reduce((sum, cat) => sum + cat.items.length, 0)
  }

  const renumberAllItems = (categories: DiscoveryCategory[]): DiscoveryCategory[] => {
    let currentNumber = 1
    return categories.map(cat => ({
      ...cat,
      items: cat.items.map(item => ({
        ...item,
        number: currentNumber++
      }))
    }))
  }

  const handleAddItem = (categoryId: string, content: string = '') => {
    setDocument(prev => {
      const totalCount = getTotalItemCount()
      const newCategories = prev.categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: [...cat.items, {
              id: generateId(),
              number: totalCount + 1,
              content: content || `REQUEST FOR PRODUCTION NO. ${totalCount + 1}:\nAll DOCUMENTS...`,
              isAiGenerated: false
            }]
          }
        }
        return cat
      })
      return { ...prev, categories: renumberAllItems(newCategories) }
    })
  }

  const handleUpdateItem = (categoryId: string, itemId: string, content: string) => {
    setDocument(prev => ({
      ...prev,
      categories: prev.categories.map(cat => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            items: cat.items.map(item => 
              item.id === itemId ? { ...item, content } : item
            )
          }
        }
        return cat
      })
    }))
  }

  const handleRemoveItem = (categoryId: string, itemId: string) => {
    setDocument(prev => ({
      ...prev,
      categories: renumberAllItems(
        prev.categories.map(cat => {
          if (cat.id === categoryId) {
            return { ...cat, items: cat.items.filter(item => item.id !== itemId) }
          }
          return cat
        })
      )
    }))
  }

  // Drag handlers - simple ID-based approach like category drag
  const handleDragStart = (categoryId: string, itemId: string) => {
    setDraggedItem({ categoryId, itemId })
  }

  const handleDragOver = (e: React.DragEvent, categoryId: string, itemId: string) => {
    e.preventDefault()
    if (draggedItem && draggedItem.itemId !== itemId) {
      setDragOverItem({ categoryId, itemId })
    }
  }

  const handleDrop = (e: React.DragEvent, targetCategoryId: string, targetItemId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.itemId === targetItemId) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    setDocument(prev => {
      const newCategories = [...prev.categories]
      
      // Find source category and item index
      const sourceCategory = newCategories.find(c => c.id === draggedItem.categoryId)
      if (!sourceCategory) return prev
      const sourceIndex = sourceCategory.items.findIndex(item => item.id === draggedItem.itemId)
      if (sourceIndex === -1) return prev
      
      // Find target category and item index
      const targetCategory = newCategories.find(c => c.id === targetCategoryId)
      if (!targetCategory) return prev
      const targetIndex = targetCategory.items.findIndex(item => item.id === targetItemId)
      if (targetIndex === -1) return prev
      
      // Remove from source and insert at target
      const [removed] = sourceCategory.items.splice(sourceIndex, 1)
      targetCategory.items.splice(targetIndex, 0, removed)
      
      return { ...prev, categories: renumberAllItems(newCategories) }
    })

    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Category drag handlers
  const handleCategoryDragStart = (categoryId: string) => {
    setDraggedCategory(categoryId)
  }

  const handleCategoryDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault()
    if (draggedCategory && draggedCategory !== categoryId) {
      setDragOverCategory(categoryId)
    }
  }

  const handleCategoryDrop = (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault()
    if (!draggedCategory || draggedCategory === targetCategoryId) {
      setDraggedCategory(null)
      setDragOverCategory(null)
      return
    }

    setDocument(prev => {
      const newCategories = [...prev.categories]
      const draggedIndex = newCategories.findIndex(c => c.id === draggedCategory)
      const targetIndex = newCategories.findIndex(c => c.id === targetCategoryId)
      
      if (draggedIndex === -1 || targetIndex === -1) return prev
      
      const [removed] = newCategories.splice(draggedIndex, 1)
      newCategories.splice(targetIndex, 0, removed)
      
      return { ...prev, categories: renumberAllItems(newCategories) }
    })

    setDraggedCategory(null)
    setDragOverCategory(null)
  }

  const handleCategoryDragEnd = () => {
    setDraggedCategory(null)
    setDragOverCategory(null)
  }

  const handleAddCategory = () => {
    const newCategory: DiscoveryCategory = {
      id: generateId(),
      title: 'New Category',
      items: []
    }
    setDocument(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }))
    setExpandedCategories(prev => new Set([...prev, newCategory.id]))
  }

  const handleUpdateCategoryTitle = (categoryId: string, title: string) => {
    setDocument(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, title } : cat
      )
    }))
  }

  const handleRemoveCategory = (categoryId: string) => {
    setDocument(prev => ({
      ...prev,
      categories: renumberAllItems(prev.categories.filter(cat => cat.id !== categoryId))
    }))
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)

    try {
      const updatedDocument = {
        ...document,
        metadata: {
          ...document.metadata,
          updatedAt: new Date().toISOString()
        }
      }

      const updatedCase: CaseFrontend = {
        ...caseData,
        discoveryDocuments: {
          ...(caseData.discoveryDocuments || {}),
          rfp: updatedDocument
        }
      }

      if (isTrialMode) {
        // In trial mode, just call onCaseUpdate (which saves to session storage)
        setSaveSuccess(true)
        onCaseUpdate(updatedCase)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        // Authenticated mode - save to database
        const result = await supabaseCaseStorage.updateCase(caseData.id, {
          discoveryDocuments: updatedCase.discoveryDocuments
        })

        if (result) {
          setSaveSuccess(true)
          onCaseUpdate(result)
          setTimeout(() => setSaveSuccess(false), 3000)
        }
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  // Save to AI Document Repository
  const handleSaveToRepository = async () => {
    if (isTrialMode) {
      // In trial mode, show message that this feature requires login
      alert('Save to Repository is available after signing up. Your work is saved in your browser session.')
      return
    }
    
    setSavingToRepo(true)
    setRepoSaveSuccess(false)

    try {
      const caseName = caseData.caseName || 'Untitled Case'
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const setNum = document.metadata.setNumber || 1
      const title = `Requests for Production (Set ${setNum}) - ${caseName} (${dateStr})`

      const result = await aiDocumentStorage.createDocument({
        caseId: caseData.id,
        documentType: 'requests_for_production',
        title,
        description: `Set ${setNum} - ${document.categories.reduce((sum, cat) => sum + cat.items.length, 0)} requests`,
        content: {
          document: document,
          metadata: document.metadata,
          definitions: document.definitions,
          categories: document.categories,
        },
        status: 'draft',
      })

      if (result) {
        setRepoSaveSuccess(true)
        console.log(`[AUDIT] RFP saved to repository for case: ${caseData.id}`)
        setTimeout(() => setRepoSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error saving to repository:', error)
    } finally {
      setSavingToRepo(false)
    }
  }

  // Reset to start a new document
  const handleNew = () => {
    if (window.confirm('Are you sure you want to start a new document? Any unsaved changes will be lost.')) {
      setDocument({
        metadata: {
          propoundingParty: 'defendant',
          respondingParty: 'plaintiff',
          setNumber: 1,
          jurisdiction: 'california'
        },
        definitions: DEFAULT_RFP_DEFINITIONS,
        categories: defaultCategories
      })
      setExpandedCategories(new Set(defaultCategories.map(c => c.id)))
    }
  }

  const handleAISuggestions = (categoryId: string, suggestions: string[]) => {
    setDocument(prev => {
      const newCategories = prev.categories.map(cat => {
        if (cat.id === categoryId) {
          const newItems = suggestions.map((content) => ({
            id: generateId(),
            number: 0,
            content,
            isAiGenerated: true
          }))
          return { ...cat, items: [...cat.items, ...newItems] }
        }
        return cat
      })
      return { ...prev, categories: renumberAllItems(newCategories) }
    })
  }

  const handleOpenAIForCategory = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setIsAIPanelOpen(true)
  }

  const setNumberWords = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`
  }

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isAIPanelOpen ? 'mr-[480px]' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Card */}
          <div className="glass p-6 rounded-2xl mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Requests for Production</h1>
              <p className="text-gray-600 mt-1">
                {getTotalItemCount()} requests • Drag to reorder • Click <Sparkles className="w-4 h-4 inline text-emerald-500" /> to generate with AI
              </p>
            </div>
          </div>

          {/* Document Header */}
          <div className="glass-strong p-6 rounded-2xl mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Propounding Party</label>
                <select
                  value={document.metadata.propoundingParty}
                  onChange={(e) => setDocument(prev => ({
                    ...prev,
                    metadata: { 
                      ...prev.metadata, 
                      propoundingParty: e.target.value as 'plaintiff' | 'defendant',
                      respondingParty: e.target.value === 'plaintiff' ? 'defendant' : 'plaintiff'
                    }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="defendant">DEFENDANT - {caseData.defendants?.[0]?.name || '[Name]'}</option>
                  <option value="plaintiff">PLAINTIFF - {caseData.plaintiffs?.[0]?.name || '[Name]'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Set Number</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={document.metadata.setNumber}
                  onChange={(e) => setDocument(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, setNumber: parseInt(e.target.value) || 1 }
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-sm font-mono border border-emerald-200 text-gray-800">
              <p><strong>PROPOUNDING PARTY:</strong> {document.metadata.propoundingParty.toUpperCase()}</p>
              <p><strong>RESPONDING PARTY:</strong> {document.metadata.respondingParty.toUpperCase()}</p>
              <p><strong>SET NO.:</strong> {setNumberWords[document.metadata.setNumber - 1] || document.metadata.setNumber}</p>
            </div>
          </div>

          {/* Definitions Section */}
          <div className="glass-strong rounded-2xl mb-6 overflow-hidden">
            <button
              onClick={() => setDefinitionsExpanded(!definitionsExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 hover:from-slate-100 hover:to-slate-150 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-900">Definitions</span>
                <span className="text-sm text-gray-500">({document.definitions.length} definitions)</span>
              </div>
              {definitionsExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {definitionsExpanded && (
              <div className="p-4 space-y-3">
                {document.definitions.map((def, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200">{def}</div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent"></div>
            <span className="text-gray-600 text-sm font-medium">Document Requests</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-200 to-transparent"></div>
          </div>

          {/* Categories */}
          {document.categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id)
            
            return (
              <div 
                key={category.id} 
                draggable
                onDragStart={() => handleCategoryDragStart(category.id)}
                onDragOver={(e) => handleCategoryDragOver(e, category.id)}
                onDrop={(e) => handleCategoryDrop(e, category.id)}
                onDragEnd={handleCategoryDragEnd}
                className={`glass-strong rounded-2xl mb-6 overflow-hidden border transition-all duration-200 ${
                  draggedCategory === category.id ? 'opacity-50 scale-[0.98]' : ''
                } ${dragOverCategory === category.id ? 'border-2 border-emerald-500 border-dashed scale-[1.02]' : 'border-emerald-200'}`}
              >
                {/* Category Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 flex items-center justify-between border-b border-emerald-200">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Drag Handle - two horizontal lines */}
                    <div className="text-gray-400 hover:text-gray-600 transition-colors cursor-grab active:cursor-grabbing">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>
                    <button onClick={() => toggleCategory(category.id)} className="text-gray-500 hover:text-gray-700">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <input
                      type="text"
                      value={category.title}
                      onChange={(e) => handleUpdateCategoryTitle(category.id, e.target.value)}
                      className="text-lg font-bold bg-transparent border-none focus:outline-none text-emerald-800 flex-1"
                    />
                    <span className="text-sm text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                      {category.items.length} requests
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCategory(category.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Remove category"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div className="p-4 bg-emerald-50/30 space-y-4">
                    {category.items.map((item) => {
                      const isItemDragging = draggedItem?.itemId === item.id
                      const isDragOver = dragOverItem?.itemId === item.id

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(category.id, item.id)}
                          onDragOver={(e) => handleDragOver(e, category.id, item.id)}
                          onDrop={(e) => handleDrop(e, category.id, item.id)}
                          onDragEnd={handleDragEnd}
                          className={`glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-200 relative ${
                            isItemDragging ? 'opacity-50 scale-[0.98]' : 'cursor-move'
                          } ${isDragOver && !isItemDragging ? 'ring-2 ring-emerald-500 ring-offset-2 scale-[1.02]' : ''}`}
                        >
                          {/* Header */}
                          <div className="flex justify-between items-start mb-4 gap-3">
                            {/* Drag Handle - two horizontal lines */}
                            <div className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all p-2 -m-2 rounded-lg flex items-center cursor-grab active:cursor-grabbing active:scale-95">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                              </svg>
                            </div>
                            
                            {/* Title/Number */}
                            <div className="flex-1 flex items-center gap-3">
                              <span className="text-xl font-bold text-emerald-700">
                                REQUEST NO. {item.number}
                              </span>
                              {item.isAiGenerated && (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1 font-medium">
                                  <Sparkles className="w-3 h-3" /> AI
                                </span>
                              )}
                            </div>
                            
                            {/* X Delete Button */}
                            <button
                              onClick={() => handleRemoveItem(category.id, item.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1"
                              aria-label="Remove request"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Content with AI button */}
                          <div className="relative">
                            <textarea
                              value={item.content}
                              onChange={(e) => {
                                handleUpdateItem(category.id, item.id, e.target.value)
                                autoResize(e.target)
                              }}
                              onFocus={(e) => autoResize(e.target)}
                              ref={(textarea) => { if (textarea) autoResize(textarea) }}
                              className="w-full min-h-20 p-4 pr-14 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 overflow-hidden"
                              placeholder="Enter request content here..."
                            />
                            {/* AI Sparkle Button - bottom right */}
                            <button
                              onClick={() => handleOpenAIForCategory(category.id)}
                              className="absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
                              aria-label="AI Edit Assistant"
                              title="Generate with AI"
                            >
                              <svg 
                                className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" 
                                fill="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                                <path d="M6 4L6.5 6.5L9 7L6.5 7.5L6 10L5.5 7.5L3 7L5.5 6.5L6 4Z" />
                                <path d="M18 14L18.5 16.5L21 17L18.5 17.5L18 20L17.5 17.5L15 17L17.5 16.5L18 14Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {category.items.length === 0 && (
                      <div className="relative text-center py-8 text-gray-400 min-h-[200px]">
                        <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No requests in this category</p>
                        <p className="text-sm mt-1">Click "Add Request" or use AI to generate</p>
                        
                        {/* AI Sparkle Button - bottom right of empty state */}
                        <button
                          onClick={() => handleOpenAIForCategory(category.id)}
                          className="absolute bottom-2 right-2 p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
                          aria-label="AI Edit Assistant"
                          title="Generate with AI"
                        >
                          <svg 
                            className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
                            <path d="M6 4L6.5 6.5L9 7L6.5 7.5L6 10L5.5 7.5L3 7L5.5 6.5L6 4Z" />
                            <path d="M18 14L18.5 16.5L21 17L18.5 17.5L18 20L17.5 17.5L15 17L17.5 16.5L18 14Z" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Add Request Button - kept from original */}
                    <button
                      onClick={() => handleAddItem(category.id)}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-emerald-400 hover:text-emerald-600 flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus className="w-5 h-5" /> Add Request
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add Category Button */}
          <div className="flex justify-center mt-6 mb-8">
            <button
              onClick={handleAddCategory}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-full font-semibold hover:from-emerald-700 hover:to-emerald-800 shadow-lg"
            >
              + Add Category
            </button>
          </div>

          {/* Action Buttons */}
          <div className="glass p-6 rounded-2xl flex flex-col gap-4 mb-12">
            <div className="flex gap-4 justify-end items-center flex-wrap">
              {/* Save Draft Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                  saving ? 'opacity-50 cursor-not-allowed' : ''
                } ${saveSuccess 
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {saving ? (
                  <>
                    <Save className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Draft</span>
                  </>
                )}
              </button>

              {/* Save to Repository Button */}
              <button
                onClick={handleSaveToRepository}
                disabled={savingToRepo}
                className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center gap-2 ${
                  savingToRepo ? 'opacity-50 cursor-not-allowed' : ''
                } ${repoSaveSuccess 
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {savingToRepo ? (
                  <>
                    <Save className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : repoSaveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    <span>Save to Repository</span>
                  </>
                )}
              </button>

              {/* New Document Button */}
              <button
                onClick={handleNew}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New</span>
              </button>

              {/* Preview Button */}
              <button 
                onClick={() => setShowPreview(true)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Preview
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Floating AI Button */}
      {!isAIPanelOpen && (
        <button
          onClick={() => setIsAIPanelOpen(true)}
          className="fixed right-6 bottom-24 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-40"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* AI Panel */}
      <RFPAIPanel
        isOpen={isAIPanelOpen}
        onClose={() => {
          setIsAIPanelOpen(false)
          setSelectedCategory(null)
        }}
        caseData={caseData}
        selectedCategory={selectedCategory}
        categories={document.categories}
        onSuggestionsGenerated={handleAISuggestions}
        onCategorySelect={setSelectedCategory}
      />

      {/* Preview Modal */}
      <DiscoveryPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        discoveryType="rfp"
        propoundingParty={document.metadata.propoundingParty}
        respondingParty={document.metadata.respondingParty}
        setNumber={document.metadata.setNumber}
        plaintiffName={caseData.plaintiffs?.[0]?.name || 'Plaintiff'}
        defendantName={caseData.defendants?.[0]?.name || 'Defendant'}
        caseName={caseData.caseName}
        caseNumber={caseData.caseNumber}
        definitions={document.definitions}
        categories={document.categories.map(cat => ({
          title: cat.title,
          items: cat.items.map(item => ({ number: item.number, content: item.content }))
        }))}
        // Attorney info from propounding party
        attorneyName={
          document.metadata.propoundingParty === 'defendant'
            ? caseData.defendants?.[0]?.attorneys?.[0]?.name
            : caseData.plaintiffs?.[0]?.attorneys?.[0]?.name
        }
        stateBarNumber={
          document.metadata.propoundingParty === 'defendant'
            ? caseData.defendants?.[0]?.attorneys?.[0]?.barNumber
            : caseData.plaintiffs?.[0]?.attorneys?.[0]?.barNumber
        }
        lawFirmName={
          document.metadata.propoundingParty === 'defendant'
            ? caseData.defendants?.[0]?.attorneys?.[0]?.firm
            : caseData.plaintiffs?.[0]?.attorneys?.[0]?.firm
        }
        address={
          document.metadata.propoundingParty === 'defendant'
            ? caseData.defendants?.[0]?.attorneys?.[0]?.address
            : caseData.plaintiffs?.[0]?.attorneys?.[0]?.address
        }
        phone={
          document.metadata.propoundingParty === 'defendant'
            ? caseData.defendants?.[0]?.attorneys?.[0]?.phone
            : caseData.plaintiffs?.[0]?.attorneys?.[0]?.phone
        }
        email={
          document.metadata.propoundingParty === 'defendant'
            ? caseData.defendants?.[0]?.attorneys?.[0]?.email
            : caseData.plaintiffs?.[0]?.attorneys?.[0]?.email
        }
      />
    </div>
  )
}

