'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Send, Trash2, MessageCircle, Briefcase, LayoutDashboard, GripHorizontal, Maximize2, Minimize2 } from 'lucide-react'
import { useAssistant } from './AssistantProvider'
import ReactMarkdown from 'react-markdown'

// Size presets
const SIZE_PRESETS = {
  small: { width: 320, height: 400 },
  medium: { width: 384, height: 500 },
  large: { width: 550, height: 700 }
}

export function AssistantChat() {
  const router = useRouter()
  const {
    isOpen,
    setIsOpen,
    mode,
    caseName,
    messages,
    isLoading,
    sendMessage,
    clearChat,
    position,
    setPosition,
    size,
    setSize
  } = useAssistant()
  
  const [input, setInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])
  
  // Listen for navigation events from the assistant
  useEffect(() => {
    const handleNavigation = (event: CustomEvent<{ url: string; documentType: string; caseName?: string }>) => {
      const { url } = event.detail
      if (url) {
        // Close the chat panel before navigating
        setIsOpen(false)
        // Navigate to the document page
        router.push(url)
      }
    }
    
    window.addEventListener('assistantNavigate', handleNavigation as EventListener)
    return () => {
      window.removeEventListener('assistantNavigate', handleNavigation as EventListener)
    }
  }, [router, setIsOpen])
  
  // Drag handlers for chat window
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setIsDragging(true)
    
    const rect = chatRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 400
    const maxY = window.innerHeight - 520
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }, [isDragging, dragOffset, setPosition])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])
  
  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    
    const rect = chatRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      })
    }
  }
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    const touch = e.touches[0]
    const newX = touch.clientX - dragOffset.x
    const newY = touch.clientY - dragOffset.y
    
    const maxX = window.innerWidth - 400
    const maxY = window.innerHeight - 520
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }, [isDragging, dragOffset, setPosition])
  
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)
      return () => {
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleTouchMove, handleTouchEnd])
  
  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    })
  }
  
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    
    const deltaX = e.clientX - resizeStart.x
    const deltaY = e.clientY - resizeStart.y
    
    const newWidth = Math.max(320, Math.min(700, resizeStart.width + deltaX))
    const newHeight = Math.max(400, Math.min(900, resizeStart.height + deltaY))
    
    setSize({ width: newWidth, height: newHeight })
  }, [isResizing, resizeStart, setSize])
  
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false)
  }, [])
  
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing, handleResizeMove, handleResizeEnd])
  
  // Size preset toggle
  const cycleSize = () => {
    if (size.width <= 340) {
      setSize(SIZE_PRESETS.medium)
    } else if (size.width <= 450) {
      setSize(SIZE_PRESETS.large)
    } else {
      setSize(SIZE_PRESETS.small)
    }
  }
  
  // Calculate chat position based on button position
  const getChatStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: `${size.width}px`,
      height: `${size.height}px`
    }
    
    if (position.x === -1 || position.y === -1) {
      // Default position: above the button in bottom-right
      return { ...baseStyle, bottom: '80px', right: '16px' }
    }
    // Position chat above/near the dragged button position
    return {
      ...baseStyle,
      left: `${Math.max(8, Math.min(position.x - (size.width - 60), window.innerWidth - size.width - 8))}px`,
      top: `${Math.max(8, position.y - size.height - 20)}px`,
      bottom: 'auto',
      right: 'auto'
    }
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    sendMessage(input)
    setInput('')
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div 
      ref={chatRef}
      style={getChatStyle()}
      className={`fixed max-w-[calc(100vw-2rem)] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden ${
        isDragging ? 'cursor-grabbing' : ''
      } ${isResizing ? 'select-none' : ''}`}
    >
      {/* Header - Draggable */}
      <div 
        className={`bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between flex-shrink-0 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <GripHorizontal className="h-4 w-4 text-blue-200 opacity-60" />
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Legal Assistant</h3>
            <div className="flex items-center gap-1 text-xs text-blue-100">
              {mode === 'case' ? (
                <>
                  <Briefcase className="h-3 w-3" />
                  <span className="truncate max-w-[180px]">{caseName || 'Case Mode'}</span>
                </>
              ) : (
                <>
                  <LayoutDashboard className="h-3 w-3" />
                  <span>Dashboard Overview</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={cycleSize}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title={size.width <= 340 ? "Enlarge" : size.width <= 450 ? "Maximize" : "Minimize"}
          >
            {size.width <= 450 ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={clearChat}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-gray-500 text-sm py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Starting your assistant...</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-gray-900">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                      li: ({ children }) => <li className="mb-0.5">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your cases..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-black disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          {mode === 'case' 
            ? 'Focused on current case only' 
            : 'Viewing all your cases'}
        </p>
      </form>
      
      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize group"
        onMouseDown={handleResizeStart}
      >
        <svg 
          className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors"
          viewBox="0 0 24 24" 
          fill="currentColor"
        >
          <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </div>
  )
}















