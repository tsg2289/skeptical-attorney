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

interface DeadlineAction {
  type: 'deadline_added'
  data: {
    id: string
    date: string
    description: string
    completed: boolean
    caseId?: string
    caseName?: string
  }
}

interface NavigationAction {
  type: 'navigate'
  data: {
    documentType: string
    url: string
    caseName?: string
  }
}

interface BillingAction {
  type: 'billing_logged'
  data: {
    caseName: string
    hours: number
    description: string
    id?: string
  }
}

interface RepositoryNavigationAction {
  type: 'navigate_to_repository'
  data: {
    caseId: string
    category: string | null
    caseName?: string
  }
}

interface OpenDocumentAction {
  type: 'open_document'
  data: {
    documentId: string
    fileName: string
    caseId: string
    caseName?: string
  }
}

type AssistantAction = DeadlineAction | NavigationAction | BillingAction | RepositoryNavigationAction | OpenDocumentAction

interface Position {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
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
  position: Position
  setPosition: (pos: Position) => void
  size: Size
  setSize: (size: Size) => void
}

const AssistantContext = createContext<AssistantContextType | null>(null)

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider')
  }
  return context
}

const POSITION_STORAGE_KEY = 'assistant-position'
const SIZE_STORAGE_KEY = 'assistant-size'
const DEFAULT_POSITION: Position = { x: -1, y: -1 } // -1 means use default (bottom-right)
const DEFAULT_SIZE: Size = { width: 384, height: 500 } // Default w-96 (384px) and h-[500px]
const MIN_SIZE: Size = { width: 320, height: 400 }
const MAX_SIZE: Size = { width: 700, height: 900 }

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sizeState, setSizeState] = useState<Size>(DEFAULT_SIZE)
  const [caseName, setCaseName] = useState<string | null>(null)
  const [hasShownOpening, setHasShownOpening] = useState(false)
  const [position, setPositionState] = useState<Position>(DEFAULT_POSITION)
  
  const pathname = usePathname()
  
  // Load position from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          setPositionState(parsed)
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])
  
  // Load size from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIZE_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          // Clamp to min/max bounds
          setSizeState({
            width: Math.max(MIN_SIZE.width, Math.min(parsed.width, MAX_SIZE.width)),
            height: Math.max(MIN_SIZE.height, Math.min(parsed.height, MAX_SIZE.height))
          })
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])
  
  // Save size to localStorage when it changes
  const setSize = (newSize: Size) => {
    const clampedSize = {
      width: Math.max(MIN_SIZE.width, Math.min(newSize.width, MAX_SIZE.width)),
      height: Math.max(MIN_SIZE.height, Math.min(newSize.height, MAX_SIZE.height))
    }
    setSizeState(clampedSize)
    try {
      localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(clampedSize))
    } catch {
      // Ignore localStorage errors
    }
  }
  
  // Save position to localStorage when it changes
  const setPosition = (newPos: Position) => {
    setPositionState(newPos)
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(newPos))
    } catch {
      // Ignore localStorage errors
    }
  }
  
  // Determine mode and caseId from pathname and URL params
  const getContextFromPath = (): { mode: 'case' | 'dashboard' | 'disabled'; caseId: string | null } => {
    if (!pathname) return { mode: 'disabled', caseId: null }
    
    // Public pages where assistant should NOT show (even if logged in)
    const publicPages = ['/', '/login', '/forgot-password', '/reset-password', '/get-started', '/about', '/contact', '/privacy', '/terms', '/cookies', '/help', '/careers', '/blog']
    if (publicPages.includes(pathname) || pathname.startsWith('/blog/')) {
      return { mode: 'disabled', caseId: null }
    }
    
    // Case-specific page in dashboard
    const caseMatch = pathname.match(/\/dashboard\/cases\/([^/]+)/)
    if (caseMatch) {
      return { mode: 'case', caseId: caseMatch[1] }
    }
    
    // Deposition pages have caseId in the path
    const depositionMatch = pathname.match(/\/services\/deposition\/depositions\/([^/]+)/)
    if (depositionMatch) {
      return { mode: 'case', caseId: depositionMatch[1] }
    }
    
    // Service pages with caseId in query params
    if (pathname.startsWith('/services/')) {
      // Check URL for caseId query param (client-side only)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const queryCaseId = params.get('caseId')
        if (queryCaseId) {
          return { mode: 'case', caseId: queryCaseId }
        }
      }
      // Service page without case context - use dashboard mode
      return { mode: 'dashboard', caseId: null }
    }
    
    // Dashboard, settings, or any other authenticated page
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/settings')) {
      return { mode: 'dashboard', caseId: null }
    }
    
    // Default: show in dashboard mode for any other page (user might be logged in)
    return { mode: 'dashboard', caseId: null }
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
      
      // Handle actions (like deadline added or navigation)
      if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
        for (const action of data.actions as AssistantAction[]) {
          if (action.type === 'deadline_added') {
            // Use caseId from action (for dashboard mode) or context caseId (for case mode)
            const targetCaseId = action.data.caseId || caseId
            
            // Dispatch custom event so case page can refresh its deadlines
            window.dispatchEvent(new CustomEvent('assistantDeadlineAdded', { 
              detail: {
                caseId: targetCaseId,
                caseName: action.data.caseName,
                deadline: action.data
              }
            }))
          }
          
          if (action.type === 'navigate') {
            // Dispatch custom event for navigation
            // Small delay to let the assistant message render first
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('assistantNavigate', { 
                detail: {
                  url: action.data.url,
                  documentType: action.data.documentType,
                  caseName: action.data.caseName
                }
              }))
            }, 500)
          }
          
          if (action.type === 'billing_logged') {
            // Dispatch custom event for billing entry added
            window.dispatchEvent(new CustomEvent('assistantBillingLogged', { 
              detail: {
                caseId,
                caseName: action.data.caseName,
                hours: action.data.hours,
                description: action.data.description,
                id: action.data.id
              }
            }))
          }
          
          if (action.type === 'navigate_to_repository') {
            // Dispatch custom event to scroll to and expand Document Repository
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('assistantNavigateToRepository', { 
                detail: {
                  caseId: action.data.caseId,
                  category: action.data.category,
                  caseName: action.data.caseName
                }
              }))
            }, 300)
          }
          
          if (action.type === 'open_document') {
            // Dispatch custom event to open/preview a specific document
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('assistantOpenDocument', { 
                detail: {
                  documentId: action.data.documentId,
                  fileName: action.data.fileName,
                  caseId: action.data.caseId,
                  caseName: action.data.caseName
                }
              }))
            }, 300)
          }
        }
      }
      
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
        clearChat,
        position,
        setPosition,
        size: sizeState,
        setSize
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}















