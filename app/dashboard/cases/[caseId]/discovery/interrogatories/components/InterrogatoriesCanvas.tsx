'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, FileDown, Save, Check, Sparkles, ChevronDown, ChevronUp, Eye, FolderPlus, RotateCcw } from 'lucide-react'
import { 
  CaseFrontend, 
  supabaseCaseStorage, 
  InterrogatoriesDocument,
  DiscoveryCategory,
  DiscoveryItem
} from '@/lib/supabase/caseStorage'
import { aiDocumentStorage } from '@/lib/supabase/aiDocumentStorage'
import CategorySection from './CategorySection'
import DefinitionsSection from './DefinitionsSection'
import DiscoveryAIPanel from './DiscoveryAIPanel'
import DiscoveryPreviewModal from '../../components/DiscoveryPreviewModal'
import { getCategoriesForCaseType } from '@/lib/data/discoveryCategories'

// Default California definitions
const DEFAULT_CALIFORNIA_DEFINITIONS = [
  'As used in this document, the term "DESCRIBE" means to set forth the date, time, location, and detailed description.',
  'The term "INCIDENT" refers to the circumstances and events surrounding the alleged incident that is the subject of this litigation.',
  'As used in this document, the terms "YOU" and "YOUR" refer to the Responding Party, and any individuals or entities acting on their behalf, including but not limited to, attorneys, accountants, agents, consultants, experts, employees, officers and directors.',
  'As used in this document, the term "IDENTIFY" when referring to a PERSON(S) requires that YOU provide the full name, the present address or, if unknown, the last known address, the present telephone number or, if unknown the last known telephone number, and the relationship, if any, of said PERSON(S) to YOU. The term "PERSON(S)" includes a natural person, firm, association, organization, partnership, business, trust, corporation, public entity or other type of entity.',
  'As used in this document, the term "IDENTIFY," as to a DOCUMENT, means to state the author, recipient, date and general description of the DOCUMENT. As used in these interrogatories, the terms "DOCUMENT" and "DOCUMENTS" are defined as a "writing" pursuant to California Evidence Code section 250, which includes handwriting, typewriting, printing, photostating, photographing, photocopying, transmitting by electronic mail or facsimile, and every other means of recording upon any tangible thing, any form of communication or representation, including letters, words, pictures, sounds, or symbols, or combinations thereof, and any record thereby created, regardless of the manner in which the record has been stored.',
  'As used in this document, the term "HEALTH CARE PROVIDER" refers to physicians, nurses, home health care services, psychiatrists, psychologists, psychiatric or psychological social workers, counselors, therapists, hospitals, clinics, or other facilities for inpatient or outpatient care, including facilities for the treatment of substance abuse.',
  'As used in this document, the term "COMMUNICATIONS" means any and all written communications between two or more persons contained in any DOCUMENTS, or transcribed oral communication, including but not limited to email, telephone communications, personal conferences, meetings, or otherwise.',
]

interface Props {
  caseData: CaseFrontend
  onCaseUpdate: (updatedCase: CaseFrontend) => void
  isTrialMode?: boolean
}

export default function InterrogatoriesCanvas({ caseData, onCaseUpdate, isTrialMode = false }: Props) {
  // Get dynamic categories based on case type - SECURITY: uses verified caseType from caseData
  const defaultCategories = useMemo(() => {
    return getCategoriesForCaseType(caseData.caseType)
  }, [caseData.caseType])

  const [document, setDocument] = useState<InterrogatoriesDocument>(() => {
    // Initialize from saved data or defaults
    if (caseData.discoveryDocuments?.interrogatories) {
      return caseData.discoveryDocuments.interrogatories
    }
    return {
      metadata: {
        propoundingParty: 'defendant',
        respondingParty: 'plaintiff',
        setNumber: 1,
        jurisdiction: 'california'
      },
      definitions: DEFAULT_CALIFORNIA_DEFINITIONS,
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
  const [definitionsExpanded, setDefinitionsExpanded] = useState(true)
  
  // Preview modal
  const [showPreview, setShowPreview] = useState(false)

  // Auto-populate party names in definitions
  useEffect(() => {
    if (!caseData.discoveryDocuments?.interrogatories) {
      const plaintiffName = caseData.plaintiffs?.[0]?.name || '[PLAINTIFF NAME]'
      const defendantName = caseData.defendants?.[0]?.name || '[DEFENDANT NAME]'
      
      const updatedDefs = DEFAULT_CALIFORNIA_DEFINITIONS.map(def => {
        let updated = def
        if (def.includes('Responding Party')) {
          if (document.metadata.respondingParty === 'plaintiff') {
            updated = updated.replace(/Responding Party/g, `Plaintiff ${plaintiffName}`)
          } else {
            updated = updated.replace(/Responding Party/g, `Defendant ${defendantName}`)
          }
        }
        return updated
      })
      setDocument(prev => ({ ...prev, definitions: updatedDefs }))
    }
  }, [caseData, document.metadata.respondingParty])

  // Generate unique ID
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Get total item count across all categories
  const getTotalItemCount = () => {
    return document.categories.reduce((sum, cat) => sum + cat.items.length, 0)
  }

  // Renumber all items sequentially across categories
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

  // Add item to category
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
              content: content || `SPECIAL INTERROGATORY NO. ${totalCount + 1}:\n`,
              isAiGenerated: false
            }]
          }
        }
        return cat
      })
      return { ...prev, categories: renumberAllItems(newCategories) }
    })
  }

  // Update item content
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

  // Remove item
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

  // Drag and drop handlers - simple ID-based approach like category drag
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

  // Add category
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
  }

  // Update category title
  const handleUpdateCategoryTitle = (categoryId: string, title: string) => {
    setDocument(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, title } : cat
      )
    }))
  }

  // Remove category
  const handleRemoveCategory = (categoryId: string) => {
    setDocument(prev => ({
      ...prev,
      categories: renumberAllItems(prev.categories.filter(cat => cat.id !== categoryId))
    }))
  }

  // Update definitions
  const handleUpdateDefinitions = (definitions: string[]) => {
    setDocument(prev => ({ ...prev, definitions }))
  }

  // Save to database or session storage
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
          interrogatories: updatedDocument
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
      const title = `Interrogatories (Set ${setNum}) - ${caseName} (${dateStr})`

      const result = await aiDocumentStorage.createDocument({
        caseId: caseData.id,
        documentType: 'interrogatories',
        title,
        description: `Set ${setNum} - ${document.categories.reduce((sum, cat) => sum + cat.items.length, 0)} interrogatories`,
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
        console.log(`[AUDIT] Interrogatories saved to repository for case: ${caseData.id}`)
        setTimeout(() => setRepoSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('Error saving to repository:', error)
    } finally {
      setSavingToRepo(false)
    }
  }

  // Handle AI suggestions
  const handleAISuggestions = (categoryId: string, suggestions: string[]) => {
    setDocument(prev => {
      const newCategories = prev.categories.map(cat => {
        if (cat.id === categoryId) {
          const newItems = suggestions.map((content) => ({
            id: generateId(),
            number: 0, // Will be renumbered
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

  // Open AI panel for a category
  const handleOpenAIForCategory = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setIsAIPanelOpen(true)
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
        definitions: DEFAULT_CALIFORNIA_DEFINITIONS,
        categories: defaultCategories
      })
    }
  }

  // Get party names
  const getPropoundingPartyName = () => {
    if (document.metadata.propoundingParty === 'plaintiff') {
      return caseData.plaintiffs?.[0]?.name || 'Plaintiff'
    }
    return caseData.defendants?.[0]?.name || 'Defendant'
  }

  const getRespondingPartyName = () => {
    if (document.metadata.respondingParty === 'plaintiff') {
      return caseData.plaintiffs?.[0]?.name || 'Plaintiff'
    }
    return caseData.defendants?.[0]?.name || 'Defendant'
  }

  const setNumberWords = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']

  return (
    <div className="flex min-h-screen">
      {/* Main Content - shifts when AI panel open */}
      <div className={`flex-1 transition-all duration-300 ${isAIPanelOpen ? 'mr-[480px]' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Card */}
          <div className="glass p-6 rounded-2xl mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Special Interrogatories</h1>
              <p className="text-gray-600 mt-1">
                {getTotalItemCount()} interrogatories • Drag to reorder • Click <Sparkles className="w-4 h-4 inline text-purple-500" /> to generate with AI
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Formatted Header Preview */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm font-mono border border-gray-200 text-gray-800">
              <p><strong>PROPOUNDING PARTY:</strong> {document.metadata.propoundingParty.toUpperCase()}</p>
              <p><strong>RESPONDING PARTY:</strong> {document.metadata.respondingParty.toUpperCase()}</p>
              <p><strong>SET NO.:</strong> {setNumberWords[document.metadata.setNumber - 1] || document.metadata.setNumber}</p>
              <p className="mt-3 text-gray-700">
                {getPropoundingPartyName()} ("{document.metadata.propoundingParty === 'defendant' ? 'Defendant' : 'Plaintiff'}") requests, 
                pursuant to California Code of Civil Procedure section 2030.030, that {getRespondingPartyName()} ("{document.metadata.respondingParty === 'plaintiff' ? 'Plaintiff' : 'Defendant'}" or "Responding Party") 
                answer under oath, and within the time provided by law, the following Special Interrogatories:
              </p>
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
              <DefinitionsSection
                definitions={document.definitions}
                onUpdate={handleUpdateDefinitions}
                caseData={caseData}
              />
            )}
          </div>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
            <span className="text-gray-600 text-sm font-medium">Interrogatories</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
          </div>

          {/* Category Sections */}
          {document.categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              caseData={caseData}
              draggedItem={draggedItem}
              dragOverItem={dragOverItem}
              isDragging={draggedCategory === category.id}
              isDragOver={dragOverCategory === category.id}
              onCategoryDragStart={() => handleCategoryDragStart(category.id)}
              onCategoryDragOver={(e) => handleCategoryDragOver(e, category.id)}
              onCategoryDrop={(e) => handleCategoryDrop(e, category.id)}
              onCategoryDragEnd={handleCategoryDragEnd}
              onUpdateTitle={(title) => handleUpdateCategoryTitle(category.id, title)}
              onRemoveCategory={() => handleRemoveCategory(category.id)}
              onAddItem={(content) => handleAddItem(category.id, content)}
              onUpdateItem={(itemId, content) => handleUpdateItem(category.id, itemId, content)}
              onRemoveItem={(itemId) => handleRemoveItem(category.id, itemId)}
              onDragStart={(itemId) => handleDragStart(category.id, itemId)}
              onDragOver={(e, itemId) => handleDragOver(e, category.id, itemId)}
              onDrop={(e, itemId) => handleDrop(e, category.id, itemId)}
              onDragEnd={handleDragEnd}
              onOpenAI={() => handleOpenAIForCategory(category.id)}
            />
          ))}

          {/* Add Category Button */}
          <div className="flex justify-center mt-6 mb-8">
            <button
              onClick={handleAddCategory}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all hover:shadow-xl"
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
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Preview
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Floating AI Button (when panel closed) */}
      {!isAIPanelOpen && (
        <button
          onClick={() => setIsAIPanelOpen(true)}
          className="fixed right-6 bottom-24 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-40"
          title="Open AI Assistant"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* AI Sliding Panel */}
      <DiscoveryAIPanel
        isOpen={isAIPanelOpen}
        onClose={() => {
          setIsAIPanelOpen(false)
          setSelectedCategory(null)
        }}
        caseData={caseData}
        discoveryType="interrogatories"
        selectedCategory={selectedCategory}
        categories={document.categories}
        onSuggestionsGenerated={handleAISuggestions}
        onCategorySelect={setSelectedCategory}
      />

      {/* Preview Modal */}
      <DiscoveryPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        discoveryType="interrogatories"
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

