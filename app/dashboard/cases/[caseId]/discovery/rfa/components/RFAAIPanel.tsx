'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, AlertCircle, Check, Trash2 } from 'lucide-react'
import { CaseFrontend, DiscoveryItem } from '@/lib/supabase/caseStorage'

interface Props {
  isOpen: boolean
  onClose: () => void
  caseData: CaseFrontend
  currentItems: DiscoveryItem[]
  onSuggestionsGenerated: (suggestions: string[]) => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
}

export default function RFAAIPanel({
  isOpen,
  onClose,
  caseData,
  currentItems,
  onSuggestionsGenerated
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [pendingSuggestions, setPendingSuggestions] = useState<string[] | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const plaintiffName = caseData.plaintiffs?.[0]?.name || 'Plaintiff'
  const defendantName = caseData.defendants?.[0]?.name || 'Defendant'

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `I'm ready to help you draft **Requests for Admission** for **${caseData.caseName}**.\n\n` +
          `**Case Parties:**\n` +
          `• Plaintiff: ${plaintiffName}\n` +
          `• Defendant: ${defendantName}\n\n` +
          (caseData.facts ? `**Case Facts Summary:**\n${caseData.facts.substring(0, 200)}${caseData.facts.length > 200 ? '...' : ''}\n\n` : '') +
          `RFAs are powerful tools to establish undisputed facts before trial. I'll generate requests that require clear admit/deny responses.\n\n` +
          `**Try asking:**\n` +
          `• "Generate RFAs about the genuineness of key documents"\n` +
          `• "Draft admissions about liability facts"\n` +
          `• "Create RFAs establishing the timeline of events"\n` +
          `• "Add requests about damages and causation"\n\n` +
          `🔒 **Security:** I only have access to this case's facts. No cross-case data.`
      }])
    }
  }, [isOpen, caseData, plaintiffName, defendantName, messages.length])

  useEffect(() => {
    if (!isOpen) {
      setMessages([])
      setInput('')
      setPendingSuggestions(null)
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseData.id,
          discoveryType: 'rfa',
          userMessage: userMessage.content,
          caseFacts: caseData.facts || '',
          plaintiffName,
          defendantName,
          caseDescription: caseData.description || '',
          selectedCategory: 'admissions',
          categoryName: 'Requests for Admission',
          currentItems: currentItems.map(i => i.content).join('\n---\n') || '',
          conversationHistory: messages.filter(m => m.id !== 'welcome').map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate requests')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        suggestions: data.suggestions
      }

      setMessages(prev => [...prev, assistantMessage])

      if (data.suggestions?.length > 0) {
        setPendingSuggestions(data.suggestions)
      }

    } catch (error) {
      console.error('AI Error:', error)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I encountered an error generating requests. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInsertSuggestions = () => {
    if (pendingSuggestions) {
      onSuggestionsGenerated(pendingSuggestions)
      setPendingSuggestions(null)
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Added ${pendingSuggestions.length} requests for admission.\n\nWould you like me to generate more RFAs focusing on different aspects of the case?`
      }])
    }
  }

  const handleDiscardSuggestions = () => {
    setPendingSuggestions(null)
  }

  const quickActions = [
    { label: 'Liability Facts', prompt: 'Generate requests for admission about the defendant\'s liability and negligence' },
    { label: 'Document Genuineness', prompt: 'Draft RFAs about the authenticity and genuineness of key documents' },
    { label: 'Timeline & Events', prompt: 'Create requests establishing the timeline and sequence of events' },
    { label: 'Damages', prompt: 'Generate RFAs about damages, injuries, and their causation' },
  ]

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex flex-col z-50 animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">RFA AI Assistant</h3>
              <p className="text-xs text-white/80 truncate max-w-[200px]">{caseData.caseName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security Notice */}
        <div className="px-4 py-2 bg-amber-900/30 border-b border-amber-400/20 shrink-0">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>Case-scoped only. No cross-case or attorney data access.</span>
          </div>
        </div>

        {/* Current Count */}
        <div className="px-4 py-3 bg-slate-800/50 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/60">Current RFAs</span>
            <span className="text-sm font-medium text-amber-400">{currentItems.length} items</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 bg-slate-800/30 border-b border-white/10 shrink-0">
          <p className="text-xs text-white/50 mb-2">Quick prompts:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => setInput(action.prompt)}
                className="px-3 py-1.5 text-xs bg-slate-700/50 text-white/80 border border-white/10 rounded-full hover:bg-amber-600/30 hover:border-amber-400/50 hover:text-white transition-all"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-2xl px-4 py-3 max-w-[90%] ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md'
                  : 'bg-slate-700/50 text-white/90 rounded-bl-md border border-white/10'
              }`}>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.startsWith('**') && line.endsWith('**') ? (
                        <strong className="text-amber-300">{line.slice(2, -2)}</strong>
                      ) : line.startsWith('• ') ? (
                        <span className="block ml-2 text-white/80">{line}</span>
                      ) : line}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-700/50 rounded-2xl px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-white/60">Drafting RFAs...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Pending Suggestions */}
        {pendingSuggestions && (
          <div className="px-4 py-3 bg-amber-900/30 border-t border-amber-400/30 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {pendingSuggestions.length} RFAs Ready
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleDiscardSuggestions}
                  className="text-xs px-3 py-1.5 text-white/60 hover:bg-white/10 rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Discard
                </button>
                <button
                  onClick={handleInsertSuggestions}
                  className="text-xs px-4 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Insert All
                </button>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto bg-slate-900/50 rounded-lg border border-amber-400/30 p-3 text-xs text-amber-100 space-y-2">
              {pendingSuggestions.slice(0, 3).map((item, i) => (
                <p key={i} className="line-clamp-2">{item.substring(0, 100)}...</p>
              ))}
              {pendingSuggestions.length > 3 && (
                <p className="text-amber-400 font-medium">...and {pendingSuggestions.length - 3} more</p>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-white/10 bg-slate-800/50 shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what admissions you need..."
              className="flex-1 px-4 py-3 bg-slate-900/50 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm resize-none focus:ring-2 focus:ring-amber-500"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="self-end px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl disabled:opacity-50 hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2 text-center">Press Enter to send • Shift+Enter for new line</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
      `}</style>
    </>
  )
}







