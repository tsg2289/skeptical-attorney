'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { useAssistant } from './AssistantProvider'
import { AssistantChat } from './AssistantChat'

export function AssistantButton() {
  const { isOpen, setIsOpen, isLoggedIn, mode, position, setPosition } = useAssistant()
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  // Calculate actual position (default to bottom-right if position is -1)
  const getButtonStyle = useCallback(() => {
    if (position.x === -1 || position.y === -1) {
      return { bottom: '16px', right: '16px' }
    }
    return { 
      left: `${position.x}px`, 
      top: `${position.y}px`,
      bottom: 'auto',
      right: 'auto'
    }
  }, [position])
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - 60
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }, [isDragging, dragStart, setPosition])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // Add/remove global mouse listeners for dragging
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
  
  // Touch support for mobile
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    const newX = touch.clientX - dragStart.x
    const newY = touch.clientY - dragStart.y
    
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - 60
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    })
  }, [isDragging, dragStart, setPosition])
  
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
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button !== 0) return
    
    e.preventDefault()
    setIsDragging(true)
    
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }, [])
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setIsDragging(true)
    
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      setDragStart({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      })
    }
  }, [])
  
  const handleClick = useCallback(() => {
    // Only toggle if we weren't dragging
    if (!isDragging) {
      setIsOpen(!isOpen)
    }
  }, [isDragging, isOpen, setIsOpen])
  
  // Don't show on public pages or when not logged in
  if (!isLoggedIn || mode === 'disabled') {
    return null
  }
  
  return (
    <>
      {/* Chat Window */}
      <AssistantChat />
      
      {/* Floating Draggable Button */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={getButtonStyle()}
        className={`fixed z-50 p-4 rounded-full shadow-lg transition-all duration-300 ${
          isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab hover:scale-105'
        } ${
          isOpen 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
        }`}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-white" />
            {/* Pulse indicator */}
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-200"></span>
            </span>
          </div>
        )}
      </button>
    </>
  )
}
