'use client'

import { useRef, useEffect } from 'react'
import { Plus, Trash2, Sparkles, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { CaseFrontend, DiscoveryCategory, DiscoveryItem } from '@/lib/supabase/caseStorage'

interface Props {
  category: DiscoveryCategory
  caseData: CaseFrontend
  draggedItem: { categoryId: string; index: number } | null
  dragOverItem: { categoryId: string; index: number } | null
  onUpdateTitle: (title: string) => void
  onRemoveCategory: () => void
  onAddItem: (content?: string) => void
  onUpdateItem: (itemId: string, content: string) => void
  onRemoveItem: (itemId: string) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDrop: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
  onOpenAI: () => void
}

export default function CategorySection({
  category,
  caseData,
  draggedItem,
  dragOverItem,
  onUpdateTitle,
  onRemoveCategory,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onOpenAI
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-resize textareas
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`
  }

  // Get category color based on title
  const getCategoryColor = () => {
    const title = category.title.toLowerCase()
    if (title.includes('fact')) return { bg: 'bg-blue-50', border: 'border-blue-200', header: 'from-blue-50 to-blue-100', accent: 'text-blue-700' }
    if (title.includes('injur')) return { bg: 'bg-red-50', border: 'border-red-200', header: 'from-red-50 to-red-100', accent: 'text-red-700' }
    if (title.includes('treatment') || title.includes('medical')) return { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'from-emerald-50 to-emerald-100', accent: 'text-emerald-700' }
    if (title.includes('damage')) return { bg: 'bg-amber-50', border: 'border-amber-200', header: 'from-amber-50 to-amber-100', accent: 'text-amber-700' }
    if (title.includes('wage') || title.includes('income') || title.includes('lost')) return { bg: 'bg-purple-50', border: 'border-purple-200', header: 'from-purple-50 to-purple-100', accent: 'text-purple-700' }
    if (title.includes('activit')) return { bg: 'bg-cyan-50', border: 'border-cyan-200', header: 'from-cyan-50 to-cyan-100', accent: 'text-cyan-700' }
    return { bg: 'bg-gray-50', border: 'border-gray-200', header: 'from-gray-50 to-gray-100', accent: 'text-gray-700' }
  }

  const colors = getCategoryColor()

  return (
    <div className={`glass-strong rounded-2xl mb-6 overflow-hidden border ${colors.border}`}>
      {/* Category Header */}
      <div className={`bg-gradient-to-r ${colors.header} px-6 py-4 flex items-center justify-between border-b ${colors.border}`}>
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <input
            type="text"
            value={category.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            className={`text-lg font-bold bg-transparent border-none focus:outline-none focus:ring-0 ${colors.accent} flex-1`}
            placeholder="Category Title"
          />
          <span className="text-sm text-gray-500 bg-white/50 px-2 py-1 rounded-full">
            {category.items.length} item{category.items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAI}
            className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity shadow-md"
            title="Generate with AI"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={onRemoveCategory}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove category"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Items */}
      {isExpanded && (
        <div className={`p-4 space-y-3 ${colors.bg}`}>
          {category.items.map((item, index) => {
            const isDragging = draggedItem?.categoryId === category.id && draggedItem?.index === index
            const isDragOver = dragOverItem?.categoryId === category.id && dragOverItem?.index === index

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(e) => onDragOver(e, index)}
                onDrop={(e) => onDrop(e, index)}
                onDragEnd={onDragEnd}
                className={`group relative bg-white border rounded-xl transition-all duration-200 ${
                  isDragging ? 'opacity-50 scale-95 shadow-lg' : 'shadow-sm hover:shadow-md'
                } ${
                  isDragOver ? 'border-2 border-blue-500 border-dashed scale-[1.02]' : 'border-gray-200'
                } ${item.isAiGenerated ? 'border-l-4 border-l-purple-400' : ''}`}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Drag Handle */}
                  <div className="cursor-move text-gray-400 hover:text-gray-600 pt-1 transition-colors">
                    <GripVertical className="w-5 h-5" />
                  </div>

                  {/* Item Number Badge */}
                  <div className={`flex-shrink-0 w-10 h-10 ${colors.bg} ${colors.accent} rounded-lg flex items-center justify-center text-sm font-bold border ${colors.border}`}>
                    {item.number}
                  </div>

                  {/* Content Textarea */}
                  <textarea
                    value={item.content}
                    onChange={(e) => {
                      onUpdateItem(item.id, e.target.value)
                      autoResize(e.target)
                    }}
                    onFocus={(e) => autoResize(e.target)}
                    ref={(textarea) => {
                      if (textarea) {
                        autoResize(textarea)
                      }
                    }}
                    className="flex-1 min-h-[100px] p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                    placeholder="Enter interrogatory text..."
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* AI Generated Badge */}
                {item.isAiGenerated && (
                  <div className="absolute top-2 right-14 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1 font-medium">
                    <Sparkles className="w-3 h-3" />
                    AI Generated
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty State */}
          {category.items.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-medium">No interrogatories in this category</p>
              <p className="text-sm mt-1">Click "Add Interrogatory" or use AI to generate</p>
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={() => onAddItem()}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Interrogatory
          </button>
        </div>
      )}
    </div>
  )
}















