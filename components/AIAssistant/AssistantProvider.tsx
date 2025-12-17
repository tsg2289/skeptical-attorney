'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AssistantContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isLoggedIn: boolean
  mode: 'case' | 'dashboard' | 'disabled'
  caseId: string | null
  caseName: string | null
  messages: Message[]
  isLoading: boolean
  sendMessage: (message: string) => Promise<void>
  clearChat: () => void
}

const AssistantContext = createContext<AssistantContextType | null>(null)

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider')
  }
  return context
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [caseName, setCaseName] = useState<string | null>(null)
  const [hasShownOpening, setHasShownOpening] = useState(false)
  
  const pathname = usePathname()
  
  // Determine mode and caseId from pathname
  const getContextFromPath = () => {
    if (!pathname) return { mode: 'disabled' as const, caseId: null }
    
    // Case-specific page
    const caseMatch = pathname.match(/\/dashboard\/cases\/([^/]+)/)
    if (caseMatch) {
      return { mode: 'case' as const, caseId: caseMatch[1] }
    }
    
    // Dashboard or settings
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/settings')) {
      return { mode: 'dashboard' as const, caseId: null }
    }
    
    // Not on a logged-in page
    return { mode: 'disabled' as const, caseId: null }
  }
  
  const { mode, caseId } = getContextFromPath()
  
  // Check auth status
  useEffect(() => {
    const supabase = createClient()
    
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    
    checkAuth()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: { user?: { id: string } } | null) => {
      setIsLoggedIn(!!session?.user)
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  // Clear chat and reset opening message when mode/case changes
  useEffect(() => {
    setMessages([])
    setHasShownOpening(false)
    setCaseName(null)
  }, [mode, caseId])
  
  // Fetch opening message when chat opens
  useEffect(() => {
    if (isOpen && !hasShownOpening && mode !== 'disabled' && isLoggedIn) {
      fetchOpeningMessage()
    }
  }, [isOpen, hasShownOpening, mode, caseId, isLoggedIn])
  
  const fetchOpeningMessage = async () => {
    setIsLoading(true)
    setHasShownOpening(true)
    
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Give me a brief status update',
          mode,
          caseId,
          conversationHistory: []
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.context?.caseName) {
          setCaseName(data.context.caseName)
        }
        
        const openingMessage: Message = {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }
        setMessages([openingMessage])
      }
    } catch (error) {
      console.error('Failed to fetch opening message:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return
    
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    
    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }))
      
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          mode,
          caseId,
          conversationHistory
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to get response')
      }
      
      const data = await response.json()
      
      const assistantMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  
  const clearChat = () => {
    setMessages([])
    setHasShownOpening(false)
  }
  
  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        setIsOpen,
        isLoggedIn,
        mode,
        caseId,
        caseName,
        messages,
        isLoading,
        sendMessage,
        clearChat
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}


