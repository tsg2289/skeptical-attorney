'use client'

import { MessageCircle, X } from 'lucide-react'
import { useAssistant } from './AssistantProvider'
import { AssistantChat } from './AssistantChat'

export function AssistantButton() {
  const { isOpen, setIsOpen, isLoggedIn, mode } = useAssistant()
  
  // Don't show on public pages or when not logged in
  if (!isLoggedIn || mode === 'disabled') {
    return null
  }
  
  return (
    <>
      {/* Chat Window */}
      <AssistantChat />
      
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 z-50 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${
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






