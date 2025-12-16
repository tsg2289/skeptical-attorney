'use client'

import { useState, useEffect } from 'react'
import { Plus, FileDown, Save, Check, Sparkles, ChevronDown, ChevronUp, Trash2, GripVertical, Eye } from 'lucide-react'
import { 
  CaseFrontend, 
  supabaseCaseStorage, 
  RFPDocument,
  DiscoveryCategory,
  DiscoveryItem
} from '@/lib/supabase/caseStorage'
import RFPAIPanel from './RFPAIPanel'
import DiscoveryPreviewModal from '../../components/DiscoveryPreviewModal'

// Default California definitions for RFP
const DEFAULT_RFP_DEFINITIONS = [
  'As used herein, "DOCUMENT" and "DOCUMENTS" shall mean and include all writings, as that term is defined by California Evidence Code section 250, and shall include, but not be limited to, the original or any copy of handwriting, typewriting, printing, electronically stored information, photocopying, photographing, and every other means of recording any form of communication or representation, including letters, words, pictures, sounds, or symbols, or combinations thereof.',
  '"IDENTIFY" with respect to a document means to state the nature of the document, its date, author, addressee, present location and custodian.',
  '"RELATING TO" or "CONCERNING" means referring to, constituting, evidencing, describing, mentioning, embodying, or supporting.',
  '"YOU" and "YOUR" refers to the responding party and any persons acting on their behalf.',
  '"INCIDENT" refers to the circumstances and events that are the subject of this litigation.',
  '"COMMUNICATION" means any transmission of information, whether oral, written, or electronic.',
]

// Default categories for RFP
const DEFAULT_RFP_CATEGORIES: DiscoveryCategory[] = [
  { id: 'incident', title: 'Incident Documentation', items: [] },
  { id: 'medical', title: 'Medical Records', items: [] },
  { id: 'employment', title: 'Employment Records', items: [] },
  { id: 'financial', title: 'Financial Documents', items: [] },
  { id: 'communications', title: 'Communications', items: [] },
  { id: 'insurance', title: 'Insurance Documents', items: [] },
]

interface Props {
  caseData: CaseFrontend
  onCaseUpdate: (updatedCase: CaseFrontend) => void
}

export default function RFPCanvas({ caseData, onCaseUpdate }: Props) {
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
      categories: DEFAULT_RFP_CATEGORIES
    }
  })
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ categoryId: string; index: number } | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{ categoryId: string; index: number } | null>(null)
  
  // AI Panel state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  
  // Save state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Collapsed sections
  const [definitionsExpanded, setDefinitionsExpanded] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(DEFAULT_RFP_CATEGORIES.map(c => c.id)))
  
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

  // Drag handlers
  const handleDragStart = (categoryId: string, index: number) => {
    setDraggedItem({ categoryId, index })
  }

  const handleDragOver = (e: React.DragEvent, categoryId: string, index: number) => {
    e.preventDefault()
    setDragOverItem({ categoryId, index })
  }

  const handleDrop = (e: React.DragEvent, dropCategoryId: string, dropIndex: number) => {
    e.preventDefault()
    if (!draggedItem) return

    setDocument(prev => {
      const newCategories = [...prev.categories]
      const sourceCategory = newCategories.find(c => c.id === draggedItem.categoryId)
      if (!sourceCategory) return prev
      
      const [draggedItemData] = sourceCategory.items.splice(draggedItem.index, 1)
      const targetCategory = newCategories.find(c => c.id === dropCategoryId)
      if (!targetCategory) return prev
      
      targetCategory.items.splice(dropIndex, 0, draggedItemData)
      return { ...prev, categories: renumberAllItems(newCategories) }
    })

    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
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

      const result = await supabaseCaseStorage.updateCase(caseData.id, {
        discoveryDocuments: {
          ...(caseData.discoveryDocuments || {}),
          rfp: updatedDocument
        }
      })

      if (result) {
        setSaveSuccess(true)
        onCaseUpdate(result)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
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
    textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`
  }

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isAIPanelOpen ? 'mr-[480px]' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Card */}
          <div className="glass p-6 rounded-2xl mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Requests for Production</h1>
                <p className="text-gray-600 mt-1">
                  {getTotalItemCount()} requests • Drag to reorder • Click <Sparkles className="w-4 h-4 inline text-emerald-500" /> to generate with AI
                </p>
              </div>
              <div className="flex items-center gap-3">
                {saveSuccess && (
                  <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Saved!
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button 
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-full font-medium hover:from-emerald-700 hover:to-emerald-800 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Export Word
                </button>
              </div>
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
            <div className="bg-emerald-50 rounded-xl p-4 text-sm font-mono border border-emerald-200">
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
              <div key={category.id} className="glass-strong rounded-2xl mb-6 overflow-hidden border border-emerald-200">
                {/* Category Header */}
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4 flex items-center justify-between border-b border-emerald-200">
                  <div className="flex items-center gap-3 flex-1">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenAIForCategory(category.id)}
                      className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:opacity-90 shadow-md"
                      title="Generate with AI"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveCategory(category.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div className="p-4 space-y-3 bg-emerald-50/30">
                    {category.items.map((item, index) => {
                      const isDragging = draggedItem?.categoryId === category.id && draggedItem?.index === index
                      const isDragOver = dragOverItem?.categoryId === category.id && dragOverItem?.index === index

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(category.id, index)}
                          onDragOver={(e) => handleDragOver(e, category.id, index)}
                          onDrop={(e) => handleDrop(e, category.id, index)}
                          onDragEnd={handleDragEnd}
                          className={`group relative bg-white border rounded-xl transition-all duration-200 ${
                            isDragging ? 'opacity-50 scale-95' : 'shadow-sm hover:shadow-md'
                          } ${isDragOver ? 'border-2 border-emerald-500 border-dashed' : 'border-gray-200'} ${
                            item.isAiGenerated ? 'border-l-4 border-l-emerald-400' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3 p-4">
                            <div className="cursor-move text-gray-400 hover:text-gray-600 pt-1">
                              <GripVertical className="w-5 h-5" />
                            </div>
                            <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">
                              {item.number}
                            </div>
                            <textarea
                              value={item.content}
                              onChange={(e) => {
                                handleUpdateItem(category.id, item.id, e.target.value)
                                autoResize(e.target)
                              }}
                              onFocus={(e) => autoResize(e.target)}
                              ref={(textarea) => { if (textarea) autoResize(textarea) }}
                              className="flex-1 min-h-[100px] p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 resize-none focus:ring-2 focus:ring-emerald-500"
                              placeholder="REQUEST FOR PRODUCTION NO. X:&#10;All DOCUMENTS..."
                            />
                            <button
                              onClick={() => handleRemoveItem(category.id, item.id)}
                              className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {item.isAiGenerated && (
                            <div className="absolute top-2 right-14 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full flex items-center gap-1 font-medium">
                              <Sparkles className="w-3 h-3" /> AI Generated
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {category.items.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No requests in this category</p>
                      </div>
                    )}

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
          <div className="flex justify-center mt-6 mb-12">
            <button
              onClick={handleAddCategory}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-full font-semibold hover:from-emerald-700 hover:to-emerald-800 shadow-lg"
            >
              + Add Category
            </button>
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
      />
    </div>
  )
}

