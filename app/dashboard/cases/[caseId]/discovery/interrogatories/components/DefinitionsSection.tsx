'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CaseFrontend } from '@/lib/supabase/caseStorage'

interface Props {
  definitions: string[]
  onUpdate: (definitions: string[]) => void
  caseData: CaseFrontend
}

export default function DefinitionsSection({ definitions, onUpdate, caseData }: Props) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Auto-resize textarea
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(80, textarea.scrollHeight)}px`
  }

  const handleUpdateDefinition = (index: number, value: string) => {
    const newDefinitions = [...definitions]
    newDefinitions[index] = value
    onUpdate(newDefinitions)
  }

  const handleAddDefinition = () => {
    onUpdate([...definitions, 'As used in this document, the term "[TERM]" means...'])
  }

  const handleRemoveDefinition = (index: number) => {
    onUpdate(definitions.filter((_, i) => i !== index))
  }

  // Drag and drop
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

    const newDefinitions = [...definitions]
    const [draggedItem] = newDefinitions.splice(draggedIndex, 1)
    newDefinitions.splice(dropIndex, 0, draggedItem)
    onUpdate(newDefinitions)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        These definitions establish the meaning of key terms used throughout the interrogatories. 
        Edit to match your specific case terminology.
      </p>

      {definitions.map((definition, index) => {
        const isDragging = draggedIndex === index
        const isDragOver = dragOverIndex === index

        return (
          <div
            key={index}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-200 relative ${
              isDragging ? 'opacity-50 scale-[0.98]' : 'cursor-move'
            } ${isDragOver && !isDragging ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.02]' : ''}`}
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
                <span className="text-xl font-bold text-slate-700">
                  DEFINITION NO. {index + 1}
                </span>
              </div>
              
              {/* X Delete Button */}
              <button
                onClick={() => handleRemoveDefinition(index)}
                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                aria-label="Remove definition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <textarea
              value={definition}
              onChange={(e) => {
                handleUpdateDefinition(index, e.target.value)
                autoResize(e.target)
              }}
              onFocus={(e) => autoResize(e.target)}
              ref={(textarea) => {
                if (textarea) {
                  autoResize(textarea)
                }
              }}
              className="w-full min-h-20 p-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-hidden"
              placeholder="Enter definition..."
            />
          </div>
        )
      })}

      {/* Add Definition Button */}
      <button
        onClick={handleAddDefinition}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-2 transition-all"
      >
        <Plus className="w-5 h-5" />
        Add Definition
      </button>
    </div>
  )
}
