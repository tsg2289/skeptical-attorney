'use client'

import { useRef, useEffect } from 'react'
import { Plus, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { CaseFrontend, DiscoveryCategory, DiscoveryItem } from '@/lib/supabase/caseStorage'

interface Props {
  category: DiscoveryCategory
  caseData: CaseFrontend
  draggedItem: { categoryId: string; itemId: string } | null
  dragOverItem: { categoryId: string; itemId: string } | null
  // Category drag props
  isDragging?: boolean
  isDragOver?: boolean
  onCategoryDragStart: () => void
  onCategoryDragOver: (e: React.DragEvent) => void
  onCategoryDrop: (e: React.DragEvent) => void
  onCategoryDragEnd: () => void
  // Other props
  onUpdateTitle: (title: string) => void
  onRemoveCategory: () => void
  onAddItem: (content?: string) => void
  onUpdateItem: (itemId: string, content: string) => void
  onRemoveItem: (itemId: string) => void
  onDragStart: (itemId: string) => void
  onDragOver: (e: React.DragEvent, itemId: string) => void
  onDrop: (e: React.DragEvent, itemId: string) => void
  onDragEnd: () => void
  onOpenAI: () => void
}

export default function CategorySection({
  category,
  caseData,
  draggedItem,
  dragOverItem,
  isDragging,
  isDragOver,
  onCategoryDragStart,
  onCategoryDragOver,
  onCategoryDrop,
  onCategoryDragEnd,
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
    textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`
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
    <div 
      draggable
      onDragStart={onCategoryDragStart}
      onDragOver={onCategoryDragOver}
      onDrop={onCategoryDrop}
      onDragEnd={onCategoryDragEnd}
      className={`glass-strong rounded-2xl mb-6 overflow-hidden border transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-[0.98]' : ''
      } ${isDragOver ? 'border-2 border-blue-500 border-dashed scale-[1.02]' : colors.border}`}
    >
      {/* Category Header */}
      <div className={`bg-gradient-to-r ${colors.header} px-6 py-4 flex items-center justify-between border-b ${colors.border}`}>
        <div className="flex items-center gap-3 flex-1">
          {/* Drag Handle - two horizontal lines */}
          <div className="text-gray-400 hover:text-gray-600 transition-colors cursor-grab active:cursor-grabbing">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
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
        <button
          onClick={onRemoveCategory}
          className="text-gray-400 hover:text-red-600 transition-colors p-1"
          title="Remove category"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Items */}
      {isExpanded && (
        <div className={`p-4 space-y-4 ${colors.bg}`}>
          {category.items.map((item) => {
            const isItemDragging = draggedItem?.itemId === item.id
            const isDragOver = dragOverItem?.itemId === item.id

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(item.id)}
                onDragOver={(e) => {
                  e.preventDefault()
                  onDragOver(e, item.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  onDrop(e, item.id)
                }}
                onDragEnd={onDragEnd}
                className={`glass-strong p-6 rounded-2xl hover:shadow-2xl transition-all duration-200 relative ${
                  isItemDragging ? 'opacity-50 scale-[0.98]' : 'cursor-move'
                } ${isDragOver && !isItemDragging ? 'ring-2 ring-blue-500 ring-offset-2 scale-[1.02]' : ''}`}
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
                    <span className={`text-xl font-bold ${colors.accent}`}>
                      INTERROGATORY NO. {item.number}
                    </span>
                    {item.isAiGenerated && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1 font-medium">
                        <Sparkles className="w-3 h-3" /> AI
                      </span>
                    )}
                  </div>
                  
                  {/* X Delete Button */}
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    aria-label="Remove interrogatory"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content with AI button */}
                <div className="relative">
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
                    className="w-full min-h-20 p-4 pr-14 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 overflow-hidden"
                    placeholder="Enter interrogatory text..."
                  />
                  {/* AI Sparkle Button - bottom right */}
                  <button
                    onClick={onOpenAI}
                    className="absolute bottom-3 right-3 p-2.5 bg-gradient-to-br from-purple-600 to-blue-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
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

          {/* Empty State */}
          {category.items.length === 0 && (
            <div className="relative text-center py-8 text-gray-400 min-h-[200px]">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-medium">No interrogatories in this category</p>
              <p className="text-sm mt-1">Click "Add Interrogatory" or use AI to generate</p>
              
              {/* AI Sparkle Button - bottom right of empty state */}
              <button
                onClick={onOpenAI}
                className="absolute bottom-2 right-2 p-2.5 bg-gradient-to-br from-purple-600 to-blue-700 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 group"
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

          {/* Add Button - kept from original */}
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























