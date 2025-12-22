'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
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
    <div className="p-4 space-y-3">
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
            className={`group relative bg-white border rounded-xl transition-all duration-200 ${
              isDragging ? 'opacity-50 scale-95' : ''
            } ${
              isDragOver ? 'border-2 border-blue-500 border-dashed' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3 p-4">
              {/* Drag Handle */}
              <div className="cursor-move text-gray-400 hover:text-gray-600 pt-1">
                <GripVertical className="w-5 h-5" />
              </div>

              {/* Number Badge */}
              <div className="flex-shrink-0 w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center text-sm font-bold">
                {index + 1}
              </div>

              {/* Definition Textarea */}
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
                className="flex-1 min-h-[80px] p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                placeholder="Enter definition..."
              />

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveDefinition(index)}
                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Remove definition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
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














