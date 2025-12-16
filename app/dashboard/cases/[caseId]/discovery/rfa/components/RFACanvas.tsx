'use client'

import { useState } from 'react'
import { Plus, FileDown, Save, Check, Sparkles, Trash2, GripVertical, Eye } from 'lucide-react'
import { 
  CaseFrontend, 
  supabaseCaseStorage, 
  RFADocument,
  DiscoveryItem 
} from '@/lib/supabase/caseStorage'
import RFAAIPanel from './RFAAIPanel'
import DiscoveryPreviewModal from '../../components/DiscoveryPreviewModal'

interface Props {
  caseData: CaseFrontend
  onCaseUpdate: (updatedCase: CaseFrontend) => void
}

export default function RFACanvas({ caseData, onCaseUpdate }: Props) {
  const [document, setDocument] = useState<RFADocument>(() => {
    if (caseData.discoveryDocuments?.rfa) {
      return caseData.discoveryDocuments.rfa
    }
    return {
      metadata: {
        propoundingParty: 'defendant',
        respondingParty: 'plaintiff',
        setNumber: 1,
        jurisdiction: 'california'
      },
      items: []
    }
  })
  
  // Drag state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // AI Panel state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  
  // Save state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Preview modal
  const [showPreview, setShowPreview] = useState(false)

  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const renumberItems = (items: DiscoveryItem[]): DiscoveryItem[] => {
    return items.map((item, index) => ({ ...item, number: index + 1 }))
  }

  const handleAddItem = (content: string = '') => {
    const newItem: DiscoveryItem = {
      id: generateId(),
      number: document.items.length + 1,
      content: content || `REQUEST FOR ADMISSION NO. ${document.items.length + 1}:\nAdmit that...`,
      isAiGenerated: false
    }
    setDocument(prev => ({ ...prev, items: [...prev.items, newItem] }))
  }

  const handleUpdateItem = (itemId: string, content: string) => {
    setDocument(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, content } : item
      )
    }))
  }

  const handleRemoveItem = (itemId: string) => {
    setDocument(prev => ({
      ...prev,
      items: renumberItems(prev.items.filter(item => item.id !== itemId))
    }))
  }

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newItems = [...document.items]
    const [draggedItem] = newItems.splice(draggedIndex, 1)
    newItems.splice(dropIndex, 0, draggedItem)
    setDocument(prev => ({ ...prev, items: renumberItems(newItems) }))

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
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
          rfa: updatedDocument
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

  const handleAISuggestions = (suggestions: string[]) => {
    const newItems = suggestions.map((content) => ({
      id: generateId(),
      number: 0,
      content,
      isAiGenerated: true
    }))
    setDocument(prev => ({
      ...prev,
      items: renumberItems([...prev.items, ...newItems])
    }))
  }

  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`
  }

  const setNumberWords = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN']

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isAIPanelOpen ? 'mr-[480px]' : ''}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header Card */}
          <div className="glass p-6 rounded-2xl mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Requests for Admission</h1>
                <p className="text-gray-600 mt-1">
                  {document.items.length} requests • Drag to reorder • Click <Sparkles className="w-4 h-4 inline text-amber-500" /> to generate with AI
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
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-medium hover:from-amber-600 hover:to-amber-700 transition-colors"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-sm font-mono border border-amber-200">
              <p><strong>PROPOUNDING PARTY:</strong> {document.metadata.propoundingParty.toUpperCase()}</p>
              <p><strong>RESPONDING PARTY:</strong> {document.metadata.respondingParty.toUpperCase()}</p>
              <p><strong>SET NO.:</strong> {setNumberWords[document.metadata.setNumber - 1] || document.metadata.setNumber}</p>
              <p className="mt-3 text-gray-600">
                Propounding Party requests that Responding Party admit the truth of the following matters pursuant to 
                California Code of Civil Procedure section 2033.010:
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
            <span className="text-gray-600 text-sm font-medium">Admission Requests</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent"></div>
          </div>

          {/* Admission Items */}
          <div className="space-y-4 mb-6">
            {document.items.map((item, index) => {
              const isDragging = draggedIndex === index
              const isDragOver = dragOverIndex === index

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group glass-strong rounded-xl p-4 flex gap-3 transition-all duration-200 ${
                    isDragging ? 'opacity-50 scale-95 shadow-lg' : 'shadow-sm hover:shadow-md'
                  } ${
                    isDragOver ? 'border-2 border-amber-500 border-dashed scale-[1.02]' : ''
                  } ${item.isAiGenerated ? 'border-l-4 border-l-amber-400' : ''}`}
                >
                  {/* Drag Handle */}
                  <div className="cursor-move text-gray-400 hover:text-gray-600 pt-1">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Number Badge */}
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 border border-amber-200">
                    {item.number}
                  </div>

                  {/* Content */}
                  <textarea
                    value={item.content}
                    onChange={(e) => {
                      handleUpdateItem(item.id, e.target.value)
                      autoResize(e.target)
                    }}
                    onFocus={(e) => autoResize(e.target)}
                    ref={(textarea) => { if (textarea) autoResize(textarea) }}
                    className="flex-1 min-h-[80px] p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:bg-white transition-colors"
                    placeholder="REQUEST FOR ADMISSION NO. X:&#10;Admit that..."
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* AI Badge */}
                  {item.isAiGenerated && (
                    <div className="absolute top-2 right-14 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3" /> AI Generated
                    </div>
                  )}
                </div>
              )
            })}

            {/* Empty State */}
            {document.items.length === 0 && (
              <div className="text-center py-12 glass-strong rounded-xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Yet</h3>
                <p className="text-gray-600 mb-4">Start by adding your first request for admission or use AI to generate them</p>
                <button
                  onClick={() => setIsAIPanelOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-full font-medium hover:from-amber-600 hover:to-amber-700"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </button>
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={() => handleAddItem()}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Request for Admission
            </button>
          </div>

          {/* Help Text */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <h4 className="font-medium text-amber-800 mb-2">💡 Tips for Requests for Admission</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Each request should address a single fact or issue</li>
              <li>• Use clear, unambiguous language that requires a yes/no response</li>
              <li>• Requests can address the genuineness of documents</li>
              <li>• Consider strategic requests that may simplify trial issues</li>
              <li>• Admitted facts are conclusively established for trial</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Floating AI Button */}
      {!isAIPanelOpen && (
        <button
          onClick={() => setIsAIPanelOpen(true)}
          className="fixed right-6 bottom-24 p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-40"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* AI Panel */}
      <RFAAIPanel
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        caseData={caseData}
        currentItems={document.items}
        onSuggestionsGenerated={handleAISuggestions}
      />

      {/* Preview Modal */}
      <DiscoveryPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        discoveryType="rfa"
        propoundingParty={document.metadata.propoundingParty}
        respondingParty={document.metadata.respondingParty}
        setNumber={document.metadata.setNumber}
        plaintiffName={caseData.plaintiffs?.[0]?.name || 'Plaintiff'}
        defendantName={caseData.defendants?.[0]?.name || 'Defendant'}
        caseName={caseData.caseName}
        caseNumber={caseData.caseNumber}
        definitions={[]}
        items={document.items.map(item => ({ number: item.number, content: item.content }))}
      />
    </div>
  )
}

